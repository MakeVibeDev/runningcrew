"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { MissionParticipationControl } from "@/components/crew/mission-participation-control";
import { useSupabase } from "@/components/providers/supabase-provider";

const DEFAULT_DISTANCE_STEP = 0.1;

export type MissionEditable = {
  id: string;
  crewId: string;
  ownerId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  targetDistanceKm: number | null;
  participantsCount?: number;
};

export function MissionEditor({ mission }: { mission: MissionEditable }) {
  const router = useRouter();
  const { user, client } = useSupabase();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(mission.title);
  const [description, setDescription] = useState(mission.description ?? "");
  const [startDate, setStartDate] = useState(mission.startDate);
  const [endDate, setEndDate] = useState(mission.endDate);
  const [targetDistance, setTargetDistance] = useState(
    mission.targetDistanceKm ? mission.targetDistanceKm.toString() : "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOwner = user?.id === mission.ownerId;

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isOwner) return;
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!title.trim()) {
      setError("미션 이름을 입력해주세요.");
      return;
    }

    if (!startDate || !endDate) {
      setError("기간 정보를 모두 입력해주세요.");
      return;
    }

    startTransition(async () => {
      const { error: updateError } = await client
        .from("missions")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
          target_distance_km: targetDistance ? Number(targetDistance) : null,
        } as never)
        .eq("id", mission.id)
        .eq("crew_id", mission.crewId);

      if (updateError) {
        console.error("미션 수정 실패", updateError);
        setError("미션을 수정하는 중 문제가 발생했습니다.");
        return;
      }

      setMessage("미션 정보가 저장되었습니다.");
      setTimeout(() => {
        setOpen(false);
        setMessage(null);
        router.refresh();
      }, 600);
    });
  };

  const handleCancel = () => {
    setTitle(mission.title);
    setDescription(mission.description ?? "");
    setStartDate(mission.startDate);
    setEndDate(mission.endDate);
    setTargetDistance(mission.targetDistanceKm ? mission.targetDistanceKm.toString() : "");
    setMessage(null);
    setError(null);
    setOpen(false);
  };

  if (!isOwner) {
    return (
      <MissionParticipationControl
        missionId={mission.id}
        crewId={mission.crewId}
        ownerId={mission.ownerId}
        initialCount={mission.participantsCount ?? 0}
      />
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-background/80 p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">미션 관리</p>
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            setMessage(null);
            setError(null);
          }}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
        >
          {open ? "설정 닫기" : "미션 수정"}
        </button>
      </div>

      {!open ? null : (
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor={`mission-title-${mission.id}`}>
              미션 이름
            </label>
            <input
              id={`mission-title-${mission.id}`}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor={`mission-desc-${mission.id}`}>
              미션 설명 (선택)
            </label>
            <textarea
              id={`mission-desc-${mission.id}`}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="참여 조건, 목표 등을 간단히 적어주세요."
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor={`mission-start-${mission.id}`}>
                시작일
              </label>
              <input
                id={`mission-start-${mission.id}`}
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor={`mission-end-${mission.id}`}>
                종료일
              </label>
              <input
                id={`mission-end-${mission.id}`}
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor={`mission-distance-${mission.id}`}
            >
              목표 거리 (km, 선택)
            </label>
            <input
              id={`mission-distance-${mission.id}`}
              type="number"
              min="0"
              step={DEFAULT_DISTANCE_STEP}
              value={targetDistance}
              onChange={(event) => setTargetDistance(event.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="예: 150"
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-100/40 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-100/40 px-3 py-2 text-xs text-emerald-700">
              {message}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-border px-4 py-1 hover:bg-muted"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-foreground px-4 py-1 font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      )}

      <MissionParticipationControl
        missionId={mission.id}
        crewId={mission.crewId}
        ownerId={mission.ownerId}
        initialCount={mission.participantsCount ?? 0}
      />
    </div>
  );
}
