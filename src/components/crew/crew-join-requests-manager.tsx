"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface JoinRequest {
  id: string;
  profile_id: string;
  message: string | null;
  created_at: string;
  profile: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface CrewJoinRequestsManagerProps {
  crewId: string;
  ownerId: string;
}

export function CrewJoinRequestsManager({ crewId, ownerId }: CrewJoinRequestsManagerProps) {
  const router = useRouter();
  const { client, user } = useSupabase();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isLeader = user?.id === ownerId;

  useEffect(() => {
    if (!user || !isLeader) {
      setIsLoading(false);
      return;
    }

    const fetchRequests = async () => {
      const { data, error } = await client
        .from("crew_join_requests")
        .select(`
          id,
          profile_id,
          message,
          created_at,
          profile:profiles!profile_id (
            display_name,
            avatar_url
          )
        `)
        .eq("crew_id", crewId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("가입 신청 조회 실패:", error);
        setIsLoading(false);
        return;
      }

      setRequests(data as never);
      setIsLoading(false);
    };

    fetchRequests().catch(console.error);
  }, [client, crewId, isLeader, user]);

  const handleApprove = async (requestId: string) => {
    if (!confirm("이 사용자의 가입을 승인하시겠습니까?")) return;

    setProcessingId(requestId);

    try {
      // Update request status to 'approved'
      // The trigger will automatically add the user to crew_members
      const { error } = await client
        .from("crew_join_requests")
        .update({
          status: "approved",
        } as never)
        .eq("id", requestId);

      if (error) {
        console.error("승인 실패:", error);
        alert("승인에 실패했습니다. 다시 시도해주세요.");
        setProcessingId(null);
        return;
      }

      alert("가입이 승인되었습니다!");
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      router.refresh();
    } catch (error) {
      console.error("승인 오류:", error);
      alert("오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm("이 가입 신청을 거절하시겠습니까?")) return;

    setProcessingId(requestId);

    try {
      const { error } = await client
        .from("crew_join_requests")
        .update({
          status: "rejected",
        } as never)
        .eq("id", requestId);

      if (error) {
        console.error("거절 실패:", error);
        alert("거절 처리에 실패했습니다.");
        setProcessingId(null);
        return;
      }

      alert("가입 신청이 거절되었습니다.");
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      router.refresh();
    } catch (error) {
      console.error("거절 오류:", error);
      alert("오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!isLeader) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>가입 신청 관리</CardTitle>
          <CardDescription>크루 가입 신청을 검토하고 승인/거절할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          가입 신청 관리
          {requests.length > 0 && (
            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
              {requests.length}
            </span>
          )}
        </CardTitle>
        <CardDescription>크루 가입 신청을 검토하고 승인/거절할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            대기 중인 가입 신청이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const profile = Array.isArray(request.profile) ? request.profile[0] : request.profile;
              const displayName = profile?.display_name || "알 수 없음";
              const avatarUrl = profile?.avatar_url;

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-border/60 bg-muted/30 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border/60 bg-muted">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={displayName} fill sizes="40px" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs font-semibold uppercase text-muted-foreground">
                          {displayName.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {request.message && (
                        <p className="mt-2 rounded-lg bg-background p-3 text-sm text-foreground">
                          {request.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {processingId === request.id ? "처리 중..." : "승인"}
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 rounded-lg border border-border/60 bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {processingId === request.id ? "처리 중..." : "거절"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
