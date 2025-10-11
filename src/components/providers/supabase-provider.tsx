"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Provider, Session, SupabaseClient, User } from "@supabase/supabase-js";

import { getBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import type { Database, ProfileRow } from "@/lib/supabase/types";

type AuthContextValue = {
  client: SupabaseClient<Database>;
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: ProfileRow | null;
  refreshProfile: () => Promise<void>;
  signInWithOAuth: (provider: Provider | string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const loadProfile = useCallback(async () => {
    const { data } = await client.auth.getUser();
    if (!data.user) {
      setProfile(null);
      return;
    }

    const { data: profileData, error } = await client
      .from("profiles")
      .select("id, display_name, avatar_url, crew_role, bio, created_at, updated_at")
      .eq("id", data.user.id)
      .maybeSingle();

    if (error) {
      console.error("프로필 정보를 불러오지 못했습니다.", error);
      setProfile(null);
      return;
    }

    setProfile(profileData ?? null);
  }, [client]);

  useEffect(() => {
    let isMounted = true;

    client.auth.getSession().then(({ data, error }: { data: { session: Session | null }, error: Error | null }) => {
      if (!isMounted) return;
      if (error) {
        console.error("세션 정보를 가져오지 못했습니다.", error);
      }
      setSession(data.session ?? null);
      if (data.session?.user && isMounted) {
        loadProfile().catch((error) => {
          console.error("프로필 초기 로딩 실패", error);
        });
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile().catch((error) => {
          console.error("프로필 갱신 실패", error);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [client, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      session,
      user: session?.user ?? null,
      loading,
      profile,
      refreshProfile: loadProfile,
      signInWithOAuth: async (provider: Provider | string) => {
        setLoading(true);
        const { error } = await client.auth.signInWithOAuth({
          provider: provider as Provider,
          options: {
            redirectTo:
              typeof window === "undefined" ? undefined : `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          console.error("OAuth 로그인에 실패했습니다.", error);
          setLoading(false);
        }
      },
      signOut: async () => {
        setLoading(true);
        const { error } = await client.auth.signOut();
        if (error) {
          console.error("로그아웃에 실패했습니다.", error);
        }
        setProfile(null);
        setLoading(false);
      },
    }),
    [client, loadProfile, loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSupabase() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return context;
}
