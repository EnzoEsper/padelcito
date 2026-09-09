import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

const GENERIC_PLACES_ERROR = "Place search is temporarily unavailable. Try again later.";

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const REQUEST_TIMEOUT_MS = 8_000;
const DEFAULT_REGION_CODES = ["AR"];

type JsonRecord = Record<string, unknown>;

type AutocompleteBody = {
  action: "autocomplete";
  input: string;
  sessionToken: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  languageCode?: string;
  regionCodes?: string[];
};

type DetailsBody = {
  action: "details";
  placeId: string;
  sessionToken: string;
  languageCode?: string;
};

type PlacesSearchBody = AutocompleteBody | DetailsBody;

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

function normalizePlaceId(placeId: string): string {
  return placeId.startsWith("places/") ? placeId.slice("places/".length) : placeId;
}

async function fetchGoogle(
  url: string,
  init: RequestInit,
): Promise<{ ok: true; data: JsonRecord } | { ok: false; status: number; message: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let data: JsonRecord = {};
    if (text.length > 0) {
      try {
        data = JSON.parse(text) as JsonRecord;
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const err = data.error;
      const detail =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as JsonRecord).message === "string"
          ? String((err as JsonRecord).message)
          : `Google Places request failed (${response.status})`;
      console.error("Google Places upstream error", detail);
      return { ok: false, status: response.status, message: GENERIC_PLACES_ERROR };
    }

    return { ok: true, data };
  } catch (err) {
    console.error("Google Places fetch failed", err);
    return { ok: false, status: 502, message: GENERIC_PLACES_ERROR };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleAutocomplete(body: AutocompleteBody, req: Request): Promise<Response> {
  const input = body.input.trim();
  if (input.length < 3) {
    return jsonResponse({ error: "Search query must be at least 3 characters." }, 400, req);
  }
  if (!isNonEmptyString(body.sessionToken)) {
    return jsonResponse({ error: "sessionToken is required." }, 400, req);
  }

  const payload: JsonRecord = {
    input,
    sessionToken: body.sessionToken,
    includedRegionCodes: body.regionCodes ?? DEFAULT_REGION_CODES,
    languageCode: body.languageCode ?? "es",
  };

  // Soft proximity bias: predictions inside this circle rank first, but strong
  // matches outside can still appear. A tighter radius keeps results near the
  // user (e.g. a court in Resistencia won't be buried under Buenos Aires spots).
  if (typeof body.lat === "number" && typeof body.lng === "number") {
    payload.locationBias = {
      circle: {
        center: { latitude: body.lat, longitude: body.lng },
        radius: typeof body.radiusMeters === "number" && body.radiusMeters > 0
          ? Math.min(body.radiusMeters, 50_000)
          : 30_000,
      },
    };
  }

  const google = await fetchGoogle("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY ?? "",
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify(payload),
  });

  if (!google.ok) {
    return jsonResponse({ error: google.message }, google.status >= 500 ? 502 : 400, req);
  }

  const suggestionsRaw = google.data.suggestions;
  const suggestions = Array.isArray(suggestionsRaw) ? suggestionsRaw : [];

  const results = suggestions
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const prediction = (item as JsonRecord).placePrediction;
      if (typeof prediction !== "object" || prediction === null) return null;

      const placeIdRaw = (prediction as JsonRecord).placeId;
      const textObj = (prediction as JsonRecord).text;
      const structured = (prediction as JsonRecord).structuredFormat;

      const placeId = typeof placeIdRaw === "string" ? placeIdRaw : null;
      const label =
        typeof textObj === "object" &&
        textObj !== null &&
        typeof (textObj as JsonRecord).text === "string"
          ? String((textObj as JsonRecord).text)
          : null;

      let primaryText: string | null = null;
      let secondaryText: string | null = null;
      if (typeof structured === "object" && structured !== null) {
        const main = (structured as JsonRecord).mainText;
        const secondary = (structured as JsonRecord).secondaryText;
        if (typeof main === "object" && main !== null && typeof (main as JsonRecord).text === "string") {
          primaryText = String((main as JsonRecord).text);
        }
        if (
          typeof secondary === "object" &&
          secondary !== null &&
          typeof (secondary as JsonRecord).text === "string"
        ) {
          secondaryText = String((secondary as JsonRecord).text);
        }
      }

      if (placeId === null || label === null) return null;

      return {
        placeId,
        label,
        primaryText: primaryText ?? label,
        secondaryText,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return jsonResponse({ suggestions: results }, 200, req);
}

async function handleDetails(body: DetailsBody, req: Request): Promise<Response> {
  if (!isNonEmptyString(body.placeId)) {
    return jsonResponse({ error: "placeId is required." }, 400, req);
  }
  if (!isNonEmptyString(body.sessionToken)) {
    return jsonResponse({ error: "sessionToken is required." }, 400, req);
  }

  const placeId = normalizePlaceId(body.placeId.trim());
  const languageCode = body.languageCode ?? "es";
  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
    `?sessionToken=${encodeURIComponent(body.sessionToken)}&languageCode=${encodeURIComponent(languageCode)}`;

  const google = await fetchGoogle(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY ?? "",
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
  });

  if (!google.ok) {
    return jsonResponse({ error: google.message }, google.status >= 500 ? 502 : 400, req);
  }

  const displayNameObj = google.data.displayName;
  const formattedAddressRaw = google.data.formattedAddress;
  const locationObj = google.data.location;
  const idRaw = google.data.id;

  const venueName =
    typeof displayNameObj === "object" &&
    displayNameObj !== null &&
    typeof (displayNameObj as JsonRecord).text === "string"
      ? String((displayNameObj as JsonRecord).text)
      : null;

  const formattedAddress =
    typeof formattedAddressRaw === "string" ? formattedAddressRaw : null;

  let lat: number | null = null;
  let lng: number | null = null;
  if (typeof locationObj === "object" && locationObj !== null) {
    const latRaw = (locationObj as JsonRecord).latitude;
    const lngRaw = (locationObj as JsonRecord).longitude;
    if (typeof latRaw === "number" && typeof lngRaw === "number") {
      lat = latRaw;
      lng = lngRaw;
    }
  }

  if (lat === null || lng === null) {
    return jsonResponse({ error: "Place has no coordinates." }, 502, req);
  }

  const placeIdOut =
    typeof idRaw === "string"
      ? normalizePlaceId(idRaw)
      : placeId;

  return jsonResponse({
    place: {
      placeId: placeIdOut,
      venueName,
      formattedAddress,
      coords: { lat, lng },
    },
  }, 200, req);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, req);
  }

  if (!GOOGLE_PLACES_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: "Places search is not configured." }, 503, req);
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

  const { data: allowed, error: quotaError } = await supabase.rpc("consume_places_search_quota");
  if (quotaError !== null) {
    console.error("consume_places_search_quota failed", quotaError.message);
    return jsonResponse({ error: "Could not verify search quota." }, 503, req);
  }
  if (allowed !== true) {
    return jsonResponse(
      { error: "Too many searches. Wait a minute and try again." },
      429,
      req,
    );
  }

  let body: PlacesSearchBody;
  try {
    body = (await req.json()) as PlacesSearchBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, req);
  }

  if (body.action === "autocomplete") {
    return handleAutocomplete(body, req);
  }
  if (body.action === "details") {
    return handleDetails(body, req);
  }

  return jsonResponse({ error: "Unknown action." }, 400, req);
});
