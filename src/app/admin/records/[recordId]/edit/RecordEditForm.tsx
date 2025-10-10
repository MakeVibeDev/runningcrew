"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type RecordEditFormProps = {
  record: {
    id: string;
    recorded_at: string;
    distance_km: number;
    duration_seconds: number;
    pace_seconds_per_km: number | null;
    visibility: string;
    notes: string | null;
    image_path: string | null;
    profile: {
      id: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
    mission: {
      id: string;
      title: string;
      crew: {
        id: string;
        name: string;
        slug: string;
      } | null;
    } | null;
  };
};

export default function RecordEditForm({ record }: RecordEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [recordedAt, setRecordedAt] = useState(
    new Date(record.recorded_at).toISOString().slice(0, 16)
  );
  const [distanceKm, setDistanceKm] = useState(record.distance_km.toString());
  const [durationMinutes, setDurationMinutes] = useState(
    Math.floor(record.duration_seconds / 60).toString()
  );
  const [durationSeconds, setDurationSeconds] = useState(
    (record.duration_seconds % 60).toString()
  );
  const [visibility, setVisibility] = useState(record.visibility);
  const [notes, setNotes] = useState(record.notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const distance = parseFloat(distanceKm);
      const duration = parseInt(durationMinutes) * 60 + parseInt(durationSeconds);

      if (distance <= 0 || duration <= 0) {
        setError("거리와 시간은 0보다 커야 합니다.");
        setLoading(false);
        return;
      }

      // 페이스 계산 (초/km)
      const pace = Math.round(duration / distance);

      const response = await fetch(`/api/admin/records/${record.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recorded_at: new Date(recordedAt).toISOString(),
          distance_km: distance,
          duration_seconds: duration,
          pace_seconds_per_km: pace,
          visibility,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "수정에 실패했습니다.");
      }

      router.push("/admin/records");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 기록을 삭제하시겠습니까?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/records/${record.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      router.push("/admin/records");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background p-6">
      {/* 기록 정보 */}
      <div className="mb-6 rounded-lg bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          {record.profile?.avatar_url ? (
            <Image
              src={record.profile.avatar_url}
              alt={record.profile.display_name}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500" />
          )}
          <div>
            <p className="font-semibold">{record.profile?.display_name ?? "Unknown"}</p>
            {record.mission?.crew && (
              <p className="text-sm text-muted-foreground">
                {record.mission.crew.name} · {record.mission.title}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기록 일시 */}
        <div>
          <label htmlFor="recorded_at" className="mb-2 block text-sm font-medium">
            기록 일시
          </label>
          <input
            type="datetime-local"
            id="recorded_at"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* 거리 */}
        <div>
          <label htmlFor="distance" className="mb-2 block text-sm font-medium">
            거리 (km)
          </label>
          <input
            type="number"
            id="distance"
            step="0.01"
            min="0.01"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* 시간 */}
        <div>
          <label className="mb-2 block text-sm font-medium">시간</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
                placeholder="분"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-muted-foreground">분</p>
            </div>
            <div className="flex-1">
              <input
                type="number"
                min="0"
                max="59"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                required
                placeholder="초"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-muted-foreground">초</p>
            </div>
          </div>
        </div>

        {/* 공개 설정 */}
        <div>
          <label htmlFor="visibility" className="mb-2 block text-sm font-medium">
            공개 설정
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="public">공개</option>
            <option value="private">비공개</option>
          </select>
        </div>

        {/* 메모 */}
        <div>
          <label htmlFor="notes" className="mb-2 block text-sm font-medium">
            메모
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
          >
            삭제
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
