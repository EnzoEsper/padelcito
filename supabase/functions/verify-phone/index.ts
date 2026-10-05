import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEV_OTP_CODE = "000000";
const E164_AR_MOBILE = /^\+549[0-9]{8,11}$/;
const BIRD_FETCH_TIMEOUT_MS = 10_000;

function corsHeadersFor(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin === null || origin.length === 0) {
    return corsHeaders;
  }
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

type JsonRecord = Record<string, unknown>;

type StartBody = {
  action: "start";
  phone: string;
  /** Ignored — MVP sends WhatsApp only. Kept for client compatibility. */
  channel?: "whatsapp" | "sms";
  /** Re-send on WhatsApp (Bird create reuses live verification). */
  resend?: boolean;
};

type CheckBody = {
  action: "check";
  phone: string;
  code: string;
};

type VerifyPhoneBody = StartBody | CheckBody;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const BIRD_API_KEY = Deno.env.get("BIRD_API_KEY");
const BIRD_API_HOST = (Deno.env.get("BIRD_API_HOST") ?? "https://us1.platform.bird.com").replace(
  /\/$/,
  "",
);
const VERIFY_PHONE_DEV_MODE = Deno.env.get("VERIFY_PHONE_DEV_MODE") === "true";
const PHONE_VERIFY_HASH_PEPPER = Deno.env.get("PHONE_VERIFY_HASH_PEPPER") ?? "";

type BirdResult =
  | { ok: true; lastChannel?: "whatsapp" }
  | { ok: false; status: number; message: string };

function jsonResponse(body: JsonRecord, status = 200, request?: Request): Response {
  const headers = request !== undefined ? corsHeadersFor(request) : corsHeaders;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "127.0.0.1" ||
      host === "localhost" ||
      host === "kong" ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function devModeAllowed(): boolean {
  if (!VERIFY_PHONE_DEV_MODE) {
    return false;
  }
  if (SUPABASE_URL === undefined || SUPABASE_URL.length === 0) {
    return false;
  }
  return isLocalSupabaseUrl(SUPABASE_URL);
}

function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s/g, "");
  if (E164_AR_MOBILE.test(trimmed)) {
    return trimmed;
  }

  // Align with client/migration: +54 11… without mobile 9 → +549 11…
  if (/^\+54[0-9]{9,13}$/.test(trimmed) && !trimmed.startsWith("+549")) {
    const candidate = `+549${trimmed.slice(3)}`;
    if (E164_AR_MOBILE.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function hashPhone(e164: string): Promise<string> {
  const payload = `${PHONE_VERIFY_HASH_PEPPER}:${e164}`;
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function birdConfigured(): boolean {
  return BIRD_API_KEY !== undefined && BIRD_API_KEY.length > 0;
}

function parseBirdLastChannel(payload: JsonRecord): "whatsapp" | undefined {
  const raw =
    payload.last_channel ??
    payload.lastChannel ??
    (typeof payload.verification === "object" && payload.verification !== null
      ? (payload.verification as JsonRecord).last_channel
      : undefined);

  if (raw === "whatsapp") {
    return raw;
  }
  return undefined;
}

function birdErrorMessage(payload: JsonRecord, fallback: string): string {
  if (typeof payload.message === "string" && payload.message.length > 0) {
    return payload.message;
  }
  return fallback;
}

async function birdRequest(
  path: string,
  body: JsonRecord,
): Promise<BirdResult> {
  if (!birdConfigured()) {
    return { ok: false, status: 503, message: "Phone verification is not configured." };
  }

  const url = `${BIRD_API_HOST}/v1/verify/verifications${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BIRD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(BIRD_FETCH_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    const isTimeout =
      error instanceof DOMException && error.name === "TimeoutError";
    console.error("Bird verify fetch failed", isTimeout ? "timeout" : error);
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      message: "Could not reach the verification provider. Try again later.",
    };
  }

  let payload: JsonRecord = {};
  try {
    payload = (await response.json()) as JsonRecord;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    console.error("Bird verify error", response.status, JSON.stringify(payload).slice(0, 300));

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitHint =
        retryAfter !== null && retryAfter.length > 0 ? ` Wait ${retryAfter}s.` : "";
      return {
        ok: false,
        status: 429,
        message: `Too many requests.${waitHint} Try again shortly.`,
      };
    }

    return {
      ok: false,
      status: response.status >= 500 ? 502 : 400,
      message: birdErrorMessage(
        payload,
        "Could not send or check the verification code. Try again later.",
      ),
    };
  }

  const lastChannel = parseBirdLastChannel(payload);
  return { ok: true, lastChannel };
}

async function birdCreateVerification(phone: string): Promise<BirdResult> {
  return birdRequest("", {
    to: { phone_number: phone },
    options: {
      channels: ["whatsapp"],
      language: "es",
    },
  });
}

type BirdCheckResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

async function birdCheckVerification(phone: string, code: string): Promise<BirdCheckResult> {
  if (!birdConfigured()) {
    return { ok: false, status: 503, message: "Phone verification is not configured." };
  }

  const url = `${BIRD_API_HOST}/v1/verify/verifications/check`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BIRD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: { phone_number: phone },
        code,
      }),
      signal: AbortSignal.timeout(BIRD_FETCH_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    const isTimeout =
      error instanceof DOMException && error.name === "TimeoutError";
    console.error("Bird verify check fetch failed", isTimeout ? "timeout" : error);
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      message: "Could not reach the verification provider. Try again later.",
    };
  }

  let payload: JsonRecord = {};
  try {
    payload = (await response.json()) as JsonRecord;
  } catch {
    payload = {};
  }

  if (response.status === 404) {
    return {
      ok: false,
      status: 400,
      message: "No active verification. Send a new code.",
    };
  }

  if (!response.ok) {
    console.error("Bird verify check error", response.status, JSON.stringify(payload).slice(0, 300));
    return {
      ok: false,
      status: response.status >= 500 ? 502 : 400,
      message: birdErrorMessage(payload, "Could not check the verification code."),
    };
  }

  if (payload.success === false) {
    const reason = typeof payload.reason === "string" ? payload.reason : "";
    if (reason === "expired") {
      return { ok: false, status: 400, message: "Code expired. Send a new code." };
    }
    if (reason === "attempts_exhausted") {
      return {
        ok: false,
        status: 429,
        message: "Too many wrong attempts. Send a new code.",
      };
    }
    return { ok: false, status: 400, message: "Invalid verification code." };
  }

  if (payload.success !== true) {
    return { ok: false, status: 502, message: "Unexpected verification response." };
  }

  return { ok: true };
}

async function handleStart(
  phone: string,
  supabase: ReturnType<typeof createClient>,
  req: Request,
): Promise<Response> {
  if (devModeAllowed()) {
    return jsonResponse({ ok: true, channel: "dev", devMode: true }, 200, req);
  }

  const { data: allowed, error: quotaError } = await supabase.rpc("consume_phone_verify_quota", {
    p_phone_hash: await hashPhone(phone),
  });

  if (quotaError !== null) {
    console.error("consume_phone_verify_quota failed", quotaError.message);
    return jsonResponse({ error: "Could not verify send quota." }, 503, req);
  }

  if (allowed !== true) {
    return jsonResponse(
      { error: "Too many verification attempts. Wait and try again." },
      429,
      req,
    );
  }

  const result = await birdCreateVerification(phone);

  if (!result.ok) {
    return jsonResponse({ error: result.message }, result.status, req);
  }

  return jsonResponse({ ok: true, channel: "whatsapp" as const }, 200, req);
}

async function handleCheck(
  phone: string,
  code: string,
  supabase: ReturnType<typeof createClient>,
  req: Request,
): Promise<Response> {
  if (devModeAllowed()) {
    if (code !== DEV_OTP_CODE) {
      return jsonResponse({ error: "Invalid verification code." }, 400, req);
    }
  } else {
    const bird = await birdCheckVerification(phone, code);
    if (!bird.ok) {
      return jsonResponse({ error: bird.message }, bird.status, req);
    }
  }

  const { error: verifyError } = await supabase.rpc("set_whatsapp_verified", {
    p_phone: phone,
  });

  if (verifyError !== null) {
    console.error("set_whatsapp_verified failed", verifyError.message);
    const message =
      verifyError.message.includes("does not match")
        ? "Phone number does not match your profile. Save your number in Edit profile first."
        : "Could not complete verification.";
    return jsonResponse({ error: message }, 400, req);
  }

  return jsonResponse({ ok: true, verified: true }, 200, req);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, req);
  }

  if (SUPABASE_URL === undefined || SUPABASE_ANON_KEY === undefined) {
    return jsonResponse({ error: "Phone verification is not configured." }, 503, req);
  }

  if (VERIFY_PHONE_DEV_MODE && !isLocalSupabaseUrl(SUPABASE_URL)) {
    console.error("VERIFY_PHONE_DEV_MODE refused on non-local SUPABASE_URL");
    return jsonResponse({ error: "Phone verification is not configured." }, 503, req);
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader === null || authHeader.length === 0) {
    return jsonResponse({ error: "Unauthorized." }, 401, req);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError !== null || userData.user === null) {
    return jsonResponse({ error: "Unauthorized." }, 401, req);
  }

  const { data: banned, error: banError } = await supabase.rpc("is_banned");
  if (banError !== null) {
    console.error("is_banned failed", banError.message);
    return jsonResponse({ error: "Could not verify account status." }, 503, req);
  }
  if (banned === true) {
    return jsonResponse({ error: "Your account cannot verify a phone number." }, 403, req);
  }

  let body: VerifyPhoneBody;
  try {
    body = (await req.json()) as VerifyPhoneBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, req);
  }

  if (!isNonEmptyString(body.phone)) {
    return jsonResponse({ error: "phone is required." }, 400, req);
  }

  const phone = normalizePhone(body.phone);
  if (phone === null) {
    return jsonResponse({ error: "Enter a valid Argentine mobile number." }, 400, req);
  }

  if (body.action === "start") {
    return handleStart(phone, supabase, req);
  }

  if (body.action === "check") {
    if (!isNonEmptyString(body.code)) {
      return jsonResponse({ error: "code is required." }, 400, req);
    }
    const trimmedCode = body.code.trim();
    if (!/^[0-9]{4,8}$/.test(trimmedCode)) {
      return jsonResponse({ error: "Invalid verification code." }, 400, req);
    }
    return handleCheck(phone, trimmedCode, supabase, req);
  }

  return jsonResponse({ error: "Unknown action." }, 400, req);
});
