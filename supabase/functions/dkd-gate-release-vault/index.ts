import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const BUCKET = "draborngate-release-private";
const GITHUB_REPOSITORY = "DrabornEagle/DraBornGate";
const GITHUB_AUDIENCE = "draborngate-release";
const githubJwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-dkd-release-admin, x-dkd-key-alias, x-dkd-store-password, x-dkd-app-version",
  "Access-Control-Expose-Headers": "content-disposition, x-dkd-key-alias, x-dkd-app-version",
};

const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

const safeVersion = (value: string | null) => {
  const version = (value ?? "").trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Geçerli sürüm gerekli");
  return version;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  try {
    const url = new URL(req.url);
    let authorized = false;
    let source = "unknown";

    const suppliedAdmin = req.headers.get("x-dkd-release-admin") ?? url.searchParams.get("admin") ?? "";
    if (suppliedAdmin) {
      const { data: expected, error } = await admin.rpc("dkd_gate_get_release_admin_token");
      if (error) throw error;
      authorized = typeof expected === "string" && expected.length >= 40 && suppliedAdmin === expected;
      if (authorized) source = "admin";
    }

    if (!authorized) {
      const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
      if (bearer) {
        try {
          const { payload } = await jwtVerify(bearer, githubJwks, {
            issuer: "https://token.actions.githubusercontent.com",
            audience: GITHUB_AUDIENCE,
          });
          const repository = String(payload.repository ?? "");
          const ref = String(payload.ref ?? "");
          const eventName = String(payload.event_name ?? "");
          authorized = repository === GITHUB_REPOSITORY && (
            ref === "refs/heads/release/v0.3.6-ui-notifications-apk" ||
            ref.startsWith("refs/pull/") ||
            eventName === "workflow_dispatch"
          );
          if (authorized) source = "github-oidc";
        } catch {
          authorized = false;
        }
      }
    }

    if (!authorized) return json({ ok: false, error: "Yetkisiz release kasası isteği" }, 401);

    const route = url.pathname.replace(/^.*\/dkd-gate-release-vault/, "") || "/";

    if (req.method === "GET" && route === "/status") {
      const signing = await admin.storage.from(BUCKET).list("signing", { limit: 20 });
      const releases = await admin.storage.from(BUCKET).list("releases", { limit: 100 });
      return json({ ok: true, source, signing: signing.data ?? [], releases: releases.data ?? [] });
    }

    if (route === "/signing/metadata") {
      const objectPath = "signing/signing.json";
      if (req.method === "GET") {
        const { data, error } = await admin.storage.from(BUCKET).download(objectPath);
        if (error || !data) return json({ ok: false, exists: false }, 404);
        return new Response(await data.arrayBuffer(), { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }
      if (req.method === "PUT") {
        const body = await req.arrayBuffer();
        if (!body.byteLength || body.byteLength > 65536) return json({ ok: false, error: "Geçersiz metadata" }, 400);
        const { error } = await admin.storage.from(BUCKET).upload(objectPath, body, { contentType: "application/json", upsert: true });
        if (error) throw error;
        return json({ ok: true, path: objectPath });
      }
    }

    if (route === "/signing/keystore") {
      const objectPath = "signing/DraBornGate-original-signing.keystore";
      if (req.method === "GET") {
        const { data, error } = await admin.storage.from(BUCKET).download(objectPath);
        if (error || !data) return json({ ok: false, exists: false }, 404);
        return new Response(await data.arrayBuffer(), {
          headers: {
            ...cors,
            "Content-Type": "application/octet-stream",
            "Content-Disposition": "attachment; filename=DraBornGate-original-signing.keystore",
            "Cache-Control": "no-store",
          },
        });
      }
      if (req.method === "PUT") {
        const bytes = await req.arrayBuffer();
        if (bytes.byteLength < 1000 || bytes.byteLength > 1048576) return json({ ok: false, error: "Geçersiz keystore boyutu" }, 400);
        const existing = await admin.storage.from(BUCKET).download(objectPath);
        if (existing.data && req.headers.get("x-dkd-force") !== "true") return json({ ok: false, error: "Kalıcı keystore zaten mevcut; üzerine yazma engellendi" }, 409);
        const { error } = await admin.storage.from(BUCKET).upload(objectPath, bytes, { contentType: "application/octet-stream", upsert: true });
        if (error) throw error;
        return json({ ok: true, path: objectPath, size: bytes.byteLength });
      }
    }

    if (route === "/release/apk") {
      const version = safeVersion(url.searchParams.get("version") ?? req.headers.get("x-dkd-app-version"));
      const objectPath = `releases/v${version}/DraBornGate-v${version}-release.apk`;
      if (req.method === "GET") {
        const { data, error } = await admin.storage.from(BUCKET).download(objectPath);
        if (error || !data) return json({ ok: false, exists: false }, 404);
        return new Response(await data.arrayBuffer(), {
          headers: {
            ...cors,
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename=DraBornGate-v${version}-release.apk`,
            "x-dkd-app-version": version,
            "Cache-Control": "no-store",
          },
        });
      }
      if (req.method === "PUT") {
        const bytes = await req.arrayBuffer();
        if (bytes.byteLength < 1048576 || bytes.byteLength > 268435456) return json({ ok: false, error: "Geçersiz APK boyutu" }, 400);
        const { error } = await admin.storage.from(BUCKET).upload(objectPath, bytes, { contentType: "application/vnd.android.package-archive", upsert: true });
        if (error) throw error;
        return json({ ok: true, path: objectPath, size: bytes.byteLength, version });
      }
    }

    if (route === "/release/signature") {
      const version = safeVersion(url.searchParams.get("version") ?? req.headers.get("x-dkd-app-version"));
      const objectPath = `releases/v${version}/dkd_apk_signature_v${version}.txt`;
      if (req.method === "GET") {
        const { data, error } = await admin.storage.from(BUCKET).download(objectPath);
        if (error || !data) return json({ ok: false, exists: false }, 404);
        return new Response(await data.arrayBuffer(), { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      }
      if (req.method === "PUT") {
        const bytes = await req.arrayBuffer();
        if (!bytes.byteLength || bytes.byteLength > 262144) return json({ ok: false, error: "Geçersiz imza raporu" }, 400);
        const { error } = await admin.storage.from(BUCKET).upload(objectPath, bytes, { contentType: "text/plain", upsert: true });
        if (error) throw error;
        return json({ ok: true, path: objectPath, version });
      }
    }

    return json({ ok: false, error: "Release kasası yolu bulunamadı" }, 404);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
