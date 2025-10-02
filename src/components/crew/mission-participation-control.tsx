"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";

const PARTICIPANT_STATUS_JOINED = "joined";

export function MissionParticipationControl({
  missionId,
  crewId,
  ownerId,
  initialCount,
}: {
  missionId: string;
  crewId: string;
  ownerId: string;
  initialCount: number;
}) {
  const router = useRouter();
  const { user, client } = useSupabase();
  const [participantCount, setParticipantCount] = useState(initialCount);
  const [isMember, setIsMember] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: memberRow }, { data: participantRow }] = await Promise.all([
        client
          .from("crew_members")
          .select("role")
          .eq("crew_id", crewId)
          .eq("profile_id", user.id)
          .maybeSingle(),
        client
          .from("mission_participants")
          .select("status")
          .eq("mission_id", missionId)
          .eq("profile_id", user.id)
          .maybeSingle(),
      ]);

      if (!active) return;

      setIsMember(Boolean(memberRow));
      setIsParticipant((participantRow as {status: string} | null)?.status === PARTICIPANT_STATUS_JOINED);
      setLoading(false);
    };

    fetchStatus().catch((fetchError) => {
      console.error("미션 참여 상태 조회 실패", fetchError);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [client, crewId, missionId, user]);

  const handleJoin = () => {
    if (!user) {
      setError("로그인 후 이용 가능합니다.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error: joinError } = await client
        .from("mission_participants")
        .upsert(
          {
            mission_id: missionId,
            profile_id: user.id,
            status: PARTICIPANT_STATUS_JOINED,
            joined_at: new Date().toISOString(),
            left_at: null,
          } as never,
          { onConflict: "mission_id,profile_id" },
        );

      if (joinError) {
        console.error("미션 참여 실패", joinError);
        setError(joinError.message ?? "참여 중 문제가 발생했습니다.");
        return;
      }

      setIsParticipant(true);
      setParticipantCount((count) => count + 1);
      router.refresh();
    });
  };

  const handleLeave = () => {
    if (!user) {
      setError("로그인 후 이용 가능합니다.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error: leaveError } = await client
        .from("mission_participants")
        .update({
          status: "left",
          left_at: new Date().toISOString(),
        } as never)
        .eq("mission_id", missionId)
        .eq("profile_id", user.id);

      if (leaveError) {
        console.error("미션 탈퇴 실패", leaveError);
        setError(leaveError.message ?? "탈퇴 중 문제가 발생했습니다.");
        return;
      }

      setIsParticipant(false);
      setParticipantCount((count) => (count > 0 ? count - 1 : 0));
      router.refresh();
    });
  };

  if (!user) {
    return <p className="mt-4 text-xs text-muted-foreground">로그인 후 참여할 수 있습니다.</p>;
  }

  if (!isMember && user.id !== ownerId) {
    return <p className="mt-4 text-xs text-muted-foreground">가입한 크루원만 참여할 수 있습니다.</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <span>참여자 {participantCount}명</span>
        {loading ? (
          <span className="text-muted-foreground">확인 중...</span>
        ) : isParticipant ? (
          <button
            type="button"
            onClick={handleLeave}
            disabled={isPending}
            className="rounded-full border border-border px-3 py-1 font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "처리 중..." : "참여 취소"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleJoin}
            disabled={isPending}
            className="rounded-full bg-foreground px-3 py-1 font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "처리 중..." : "참여하기"}
          </button>
        )}
      </div>
      {error ? <p className="text-rose-500">{error}</p> : null}
    </div>
  );
}
