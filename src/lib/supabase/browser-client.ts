import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

definedEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
definedEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storageKey: "runningcrew:auth",
      },
    });
  }

  return browserClient;
}

function definedEnv(key: string, value: string) {
  if (!value) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[supabase] 환경 변수 ${key}가 설정되지 않았습니다.`);
    }
  }
}
