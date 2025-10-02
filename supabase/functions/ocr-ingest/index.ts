import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type PostgrestError } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const OCR_PROVIDER = Deno.env.get("OCR_PROVIDER")?.toLowerCase() ?? "clova";
const OCR_STORAGE_BUCKET = Deno.env.get("OCR_STORAGE_BUCKET") ?? "records-raw";
const CONFIDENCE_FLOOR = parseFloat(Deno.env.get("OCR_RESULT_CONFIDENCE_FLOOR") ?? "0");
const YOLO_ENDPOINT = Deno.env.get("YOLO_ENDPOINT");
const YOLO_API_KEY = Deno.env.get("YOLO_API_KEY");
const CORS_ORIGIN = Deno.env.get("OCR_ALLOWED_ORIGIN") ?? "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-upsert, x-client-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type RequestPayload = {
  profileId?: string;
  storagePath?: string;
  bucket?: string;
  imageUrl?: string;
};

type ParsedResult = {
  distanceKm: number | null;
  durationSeconds: number | null;
  recordedAt: string | null;
  rawText: string;
  confidence: number | null;
};

type YoloCrop = {
  label: string;
  url?: string;
  confidence?: number;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type YoloResponse = {
  success: boolean;
  crops?: YoloCrop[];
  error?: string;
};

type ClovaResponse = {
  images?: Array<{
    inferResult?: string;
    message?: string;
    fields?: Array<{
      inferText?: string;
      inferConfidence?: number;
    }>;
  }>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = (await req.json()) as RequestPayload;
    const profileId = payload.profileId?.trim();
    const storagePath = payload.storagePath?.trim();
    const bucket = payload.bucket?.trim() || OCR_STORAGE_BUCKET;

    if (!profileId) {
      return jsonResponse({ success: false, error: "profileId is required" }, 400);
    }

    if (!storagePath && !payload.imageUrl) {
      return jsonResponse({ success: false, error: "storagePath or imageUrl is required" }, 400);
    }

    const signedUrl = await resolveImageUrl({
      storagePath,
      bucket,
      fallbackUrl: payload.imageUrl,
    });

    if (!signedUrl) {
      return jsonResponse({ success: false, error: "Unable to resolve image URL" }, 400);
    }

    const { processedUrl, crops } = await preprocessImage({
      signedUrl,
      storagePath,
      bucket,
    });

    const ocrResult = await runOcr(processedUrl);
    const parsed = parseMetrics(ocrResult);
    const stored = await upsertOcrResult({
      profileId,
      storagePath: storagePath ?? signedUrl,
      parsed,
    });

    return jsonResponse({
      success: true,
      data: {
        id: stored.id,
        storagePath: stored.storage_path,
        distanceKm: stored.distance_km,
        durationSeconds: stored.duration_seconds,
        recordedAt: stored.recorded_at,
        confidence: stored.confidence,
        rawText: stored.raw_text,
        preprocessedImageUrl: processedUrl,
        yoloCrops: crops,
      },
    });
  } catch (error) {
    console.error("ocr-ingest error", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});

type UpsertPayload = {
  profileId: string;
  storagePath: string;
  parsed: ParsedResult;
};

async function upsertOcrResult({ profileId, storagePath, parsed }: UpsertPayload) {
  const payload = {
    profile_id: profileId,
    storage_path: storagePath,
    raw_text: parsed.rawText,
    distance_km: parsed.distanceKm,
    duration_seconds: parsed.durationSeconds,
    recorded_at: parsed.recordedAt,
    confidence: parsed.confidence,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("record_ocr_results")
    .upsert(payload, {
      onConflict: "storage_path",
      ignoreDuplicates: false,
    })
    .select("id, storage_path, distance_km, duration_seconds, recorded_at, confidence, raw_text")
    .single();

  if (error) {
    throw new Error(formatPostgrestError(error));
  }

  return data;
}

type ResolveImageArgs = {
  storagePath?: string | null;
  bucket: string;
  fallbackUrl?: string;
};

async function resolveImageUrl({ storagePath, bucket, fallbackUrl }: ResolveImageArgs) {
  if (storagePath) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60, { download: false });

    if (error) {
      console.error("signed url error", error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data?.signedUrl ?? null;
  }

  return fallbackUrl ?? null;
}

type PreprocessArgs = {
  signedUrl: string;
  storagePath?: string | null;
  bucket: string;
};

async function preprocessImage({ signedUrl }: PreprocessArgs) {
  if (!YOLO_ENDPOINT) {
    return { processedUrl: signedUrl, crops: null };
  }

  try {
    const response = await fetch(YOLO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(YOLO_API_KEY ? { Authorization: `Bearer ${YOLO_API_KEY}` } : {}),
      },
      body: JSON.stringify({ imageUrl: signedUrl }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("YOLO preprocessing failed", response.status, text);
      return { processedUrl: signedUrl, crops: null };
    }

    const data = (await response.json()) as YoloResponse;
    if (!data.success || !data.crops?.length) {
      console.warn("YOLO preprocessing returned no crops", data.error);
      return { processedUrl: signedUrl, crops: data.crops ?? null };
    }

    const preferred =
      data.crops.find((crop) => crop.label?.toLowerCase() === "stat_card") ??
      data.crops[0];

    if (preferred?.url) {
      return { processedUrl: preferred.url, crops: data.crops };
    }

    return { processedUrl: signedUrl, crops: data.crops };
  } catch (error) {
    console.error("YOLO preprocessing error", error);
    return { processedUrl: signedUrl, crops: null };
  }
}

type RawOcrResult = {
  rawText: string;
  confidences: number[];
};

async function runOcr(imageUrl: string): Promise<RawOcrResult> {
  switch (OCR_PROVIDER) {
    case "clova":
      return executeClovaOcr(imageUrl);
    default:
      throw new Error(`Unsupported OCR_PROVIDER: ${OCR_PROVIDER}`);
  }
}

async function executeClovaOcr(imageUrl: string): Promise<RawOcrResult> {
  const secret = requireEnv("CLOVA_OCR_SECRET_KEY");
  const endpoint = requireEnv("CLOVA_OCR_INVOKE_URL");
  const templateId = Deno.env.get("CLOVA_OCR_TEMPLATE_ID");

  const payload = templateId
    ? {
        version: "V2",
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        images: [{
          format: "jpg",
          name: "record",
          url: imageUrl,
          templateIds: [templateId],
        }],
      }
    : {
        version: "V2",
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        images: [{ format: "jpg", name: "record", url: imageUrl }],
      };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OCR-SECRET": secret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CLOVA OCR failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ClovaResponse;
  const fields = data.images?.[0]?.fields ?? [];

  if (!fields.length) {
    return { rawText: "", confidences: [] };
  }

  const rawText = fields
    .map((field) => field.inferText)
    .filter((text): text is string => Boolean(text))
    .join("\n");

  const confidences = fields
    .map((field) => field.inferConfidence)
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  return { rawText, confidences };
}

function parseMetrics(raw: RawOcrResult): ParsedResult {
  const cleanedText = raw.rawText.replace(/\s+/g, " ").trim();
  const distanceKm = extractDistance(cleanedText);
  const durationSeconds = extractDuration(cleanedText);
  const recordedAt = extractDate(cleanedText);

  const averageConfidence = raw.confidences.length
    ? raw.confidences.reduce((sum, value) => sum + value, 0) / raw.confidences.length
    : null;

  const confidence = normalizeConfidence(averageConfidence);

  return {
    distanceKm,
    durationSeconds,
    recordedAt,
    rawText: raw.rawText,
    confidence,
  };
}

function extractDistance(text: string): number | null {
  const regex = /(?<!\d)(\d+(?:[.,]\d+)?)\s?(?:km|킬로|㎞)/i;
  const match = text.match(regex);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(value) ? roundTo(value, 2) : null;
}

function extractDuration(text: string): number | null {
  const hhmmss = /\b(\d{1,2}):(\d{2}):(\d{2})\b/;
  const mmss = /\b(\d{1,2}):(\d{2})\b/;

  const hhmmssMatch = text.match(hhmmss);
  if (hhmmssMatch) {
    const [hours, minutes, seconds] = hhmmssMatch.slice(1).map((part) => parseInt(part, 10));
    return hours * 3600 + minutes * 60 + seconds;
  }

  const mmssMatch = text.match(mmss);
  if (mmssMatch) {
    const [minutes, seconds] = mmssMatch.slice(1).map((part) => parseInt(part, 10));
    return minutes * 60 + seconds;
  }

  return null;
}

function extractDate(text: string): string | null {
  const iso = /\b(20\d{2})[-.](\d{1,2})[-.](\d{1,2})\b/;
  const slash = /\b(20\d{2})\/(\d{1,2})\/(\d{1,2})\b/;
  const korean = /\b(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일\b/;

  const match = text.match(iso) || text.match(slash) || text.match(korean);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (!isValidDate(year, month, day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString();
}

function isValidDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeConfidence(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) return null;
  const clamped = Math.max(0, Math.min(1, value));
  if (CONFIDENCE_FLOOR > 0 && clamped < CONFIDENCE_FLOOR) {
    return clamped;
  }
  return clamped;
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function jsonResponse(body: unknown, status = 200) {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function withCors(response: Response) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

function formatPostgrestError(error: PostgrestError) {
  return `${error.message}${error.details ? ` (${error.details})` : ""}`;
}
