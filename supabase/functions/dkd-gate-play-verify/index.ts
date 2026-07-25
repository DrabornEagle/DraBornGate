import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const encoder = new TextEncoder();
const b64url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

async function importPrivateKey(pem: string) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = Uint8Array.from(atob(clean), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", binary, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function googleAccessToken(serviceAccount: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned)));
  const assertion = `${unsigned}.${b64url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) throw new Error(json.error_description || "Google Play yetkilendirmesi başarısız");
  return String(json.access_token);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Oturum doğrulanamadı");

    const body = await req.json();
    const scope = String(body.scope || "");
    const planCode = String(body.planCode || "");
    const billingCycle = String(body.billingCycle || "");
    const productId = String(body.productId || "");
    const basePlanId = String(body.basePlanId || "");
    const purchaseToken = String(body.purchaseToken || "");
    const siteId = body.siteId ? String(body.siteId) : null;
    if (!['site','courier'].includes(scope) || !['weekly','monthly','yearly'].includes(billingCycle) || !planCode || !productId || !basePlanId || !purchaseToken) {
      throw new Error("Abonelik doğrulama bilgileri eksik");
    }

    const rawServiceAccount = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
    const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") || "com.draborneagle.draborngate";
    if (!rawServiceAccount) {
      return new Response(JSON.stringify({ ok: false, code: "PLAY_CONFIGURATION_PENDING", message: "Google Play servis hesabı sırrı henüz tanımlanmadı." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const serviceAccount = JSON.parse(rawServiceAccount.replace(/\\n/g, "\n"));
    const accessToken = await googleAccessToken(serviceAccount);
    const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const verifyResponse = await fetch(verifyUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const purchase = await verifyResponse.json();
    if (!verifyResponse.ok) throw new Error(purchase?.error?.message || "Google Play satın alımı doğrulanamadı");

    const lineItem = purchase.lineItems?.[0];
    const verifiedProductId = String(lineItem?.productId || "");
    const verifiedBasePlanId = String(lineItem?.offerDetails?.basePlanId || basePlanId);
    if (verifiedProductId !== productId || verifiedBasePlanId !== basePlanId) throw new Error("Satın alınan ürün seçilen paketle eşleşmiyor");
    const expiryTime = String(lineItem?.expiryTime || "");
    if (!expiryTime) throw new Error("Google Play abonelik bitiş tarihi alınamadı");
    const autoRenewing = Boolean(lineItem?.autoRenewingPlan?.autoRenewEnabled);
    const state = String(purchase.subscriptionState || "");
    const expiresInFuture = new Date(expiryTime).getTime() > Date.now();
    const status = state.includes("ON_HOLD") ? "past_due" : expiresInFuture ? "active" : "expired";

    const service = createClient(supabaseUrl, serviceKey);
    const { data, error } = await service.rpc("dkd_gate_apply_verified_google_play_subscription", {
      p_scope: scope,
      p_user_id: userData.user.id,
      p_site_id: siteId,
      p_plan_code: planCode,
      p_billing_cycle: billingCycle,
      p_product_id: productId,
      p_base_plan_id: basePlanId,
      p_purchase_token: purchaseToken,
      p_order_id: String(purchase.latestOrderId || body.orderId || ""),
      p_expiry_time: expiryTime,
      p_auto_renewing: autoRenewing,
      p_status: status,
    });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, subscription: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : "Doğrulama başarısız" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
