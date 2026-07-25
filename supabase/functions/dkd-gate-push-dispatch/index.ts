import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dkd-dispatch-secret",
};

type FirebaseServiceAccount = {
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
};

type PushTokenRow = { id: string; expo_push_token: string };

const base64url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const pemToArrayBuffer = (pem: string) => {
  const beginMarker = "-----BEGIN" + " PRIVATE" + " KEY-----";
  const endMarker = "-----END" + " PRIVATE" + " KEY-----";
  const body = pem.replace(beginMarker, "").replace(endMarker, "").replace(/\s/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
};

async function getGoogleAccessToken(account: FirebaseServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3500,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64url(new Uint8Array(signature))}`;
  const response = await fetch(account.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(`Firebase OAuth başarısız: ${JSON.stringify(payload)}`);
  return String(payload.access_token);
}

const stringData = (data: Record<string, unknown> | null) => Object.fromEntries(
  Object.entries(data ?? {}).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]),
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    let authorized = false;
    const dispatchHeader = req.headers.get("x-dkd-dispatch-secret") ?? "";
    if (dispatchHeader) {
      const { data: expectedSecret, error: secretError } = await admin.rpc("dkd_gate_get_push_dispatch_secret");
      if (secretError) throw secretError;
      authorized = typeof expectedSecret === "string" && expectedSecret.length >= 32 && dispatchHeader === expectedSecret;
    }
    if (!authorized) {
      const authorization = req.headers.get("authorization") ?? "";
      const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
      if (jwt) {
        const { data, error } = await admin.auth.getUser(jwt);
        authorized = !error && Boolean(data.user);
      }
    }
    if (!authorized) return new Response(JSON.stringify({ ok: false, error: "Yetkisiz bildirim dağıtım isteği" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const requestBody = await req.json().catch(() => ({})) as { notificationId?: string };
    let firebaseRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "";
    if (!firebaseRaw) {
      const { data, error } = await admin.rpc("dkd_gate_get_firebase_service_account_json");
      if (error) throw error;
      firebaseRaw = typeof data === "string" ? data : "";
    }
    if (!firebaseRaw) throw new Error("Firebase servis hesabı Supabase Vault içinde tanımlı değil");
    const firebase = JSON.parse(firebaseRaw) as FirebaseServiceAccount;
    if (!firebase.project_id || !firebase.client_email || !firebase.private_key) throw new Error("Firebase servis hesabı eksik");

    let notificationsQuery = admin.schema("draborngate").from("dkd_gate_notifications")
      .select("id,user_id,title,body,data")
      .is("sent_at", null)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at", { ascending: true })
      .limit(100);
    if (requestBody.notificationId) notificationsQuery = notificationsQuery.eq("id", requestBody.notificationId);
    const { data: rows, error: rowsError } = await notificationsQuery;
    if (rowsError) throw rowsError;
    const notifications = (rows ?? []) as NotificationRow[];
    if (!notifications.length) return new Response(JSON.stringify({ ok: true, processed: 0, sent: 0 }), { headers: { ...cors, "Content-Type": "application/json" } });

    const accessToken = await getGoogleAccessToken(firebase);
    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
      const { data: tokenRows, error: tokenError } = await admin.schema("draborngate").from("dkd_gate_push_tokens")
        .select("id,expo_push_token")
        .eq("user_id", notification.user_id)
        .in("platform", ["fcm", "android"])
        .eq("is_active", true);
      if (tokenError) throw tokenError;
      const tokens = (tokenRows ?? []) as PushTokenRow[];
      if (!tokens.length) {
        await admin.schema("draborngate").from("dkd_gate_notifications").update({ sent_at: new Date().toISOString(), push_error: "Aktif FCM cihaz anahtarı yok" }).eq("id", notification.id);
        continue;
      }

      let notificationSent = false;
      const errors: string[] = [];
      for (const item of tokens) {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${firebase.project_id}/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: {
            token: item.expo_push_token,
            notification: { title: notification.title, body: notification.body },
            data: stringData({ ...(notification.data ?? {}), notificationId: notification.id }),
            android: { priority: "high", notification: { channel_id: "draborngate-core", sound: "default", visibility: "PUBLIC" } },
          } }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) { notificationSent = true; sent += 1; }
        else {
          failed += 1;
          errors.push(JSON.stringify(payload));
          const serialized = JSON.stringify(payload);
          if (response.status === 404 || serialized.includes("UNREGISTERED") || serialized.includes("registration-token-not-registered")) {
            await admin.schema("draborngate").from("dkd_gate_push_tokens").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", item.id);
          }
        }
      }
      await admin.schema("draborngate").from("dkd_gate_notifications").update({
        sent_at: new Date().toISOString(),
        push_error: notificationSent ? null : errors.join(" | ").slice(0, 2000) || "FCM gönderilemedi",
      }).eq("id", notification.id);
    }

    return new Response(JSON.stringify({ ok: true, processed: notifications.length, sent, failed }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
