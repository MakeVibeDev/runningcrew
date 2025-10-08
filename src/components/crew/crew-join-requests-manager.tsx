"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Avatar } from "@/components/ui/avatar";
import { reportSupabaseError } from "@/lib/error-reporter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  crewName: string;
  crewSlug: string;
  ownerId: string;
}

type AlertType = "approve_confirm" | "approve_success" | "approve_error" | "reject_confirm" | "reject_success" | "reject_error" | "generic_error" | null;

export function CrewJoinRequestsManager({ crewId, crewName, crewSlug, ownerId }: CrewJoinRequestsManagerProps) {
  const router = useRouter();
  const { client, user } = useSupabase();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [alertDialog, setAlertDialog] = useState<AlertType>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

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

  const handleApprove = (requestId: string) => {
    setSelectedRequestId(requestId);
    setAlertDialog("approve_confirm");
  };

  const confirmApprove = async () => {
    if (!selectedRequestId) return;

    setAlertDialog(null);
    setProcessingId(selectedRequestId);

    try {
      // Update request status to 'approved'
      // The trigger will automatically add the user to crew_members
      const { error } = await client
        .from("crew_join_requests")
        .update({
          status: "approved",
        } as never)
        .eq("id", selectedRequestId);

      if (error && Object.keys(error).length > 0) {
        console.error("승인 실패:", error);

        await reportSupabaseError(error, "Crew Join Request Approval Failed", {
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.user_metadata?.name || user?.email,
          metadata: {
            crewId,
            requestId: selectedRequestId,
          },
        });

        setAlertDialog("approve_error");
        setProcessingId(null);
        return;
      }

      // 알림은 데이터베이스 트리거에서 자동 생성됨

      setAlertDialog("approve_success");
      setRequests((prev) => prev.filter((req) => req.id !== selectedRequestId));
      router.refresh();
    } catch (error) {
      console.error("승인 오류:", error);

      await reportSupabaseError(error, "Crew Join Request Approval Exception", {
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.user_metadata?.name || user?.email,
        metadata: {
          crewId,
          requestId: selectedRequestId,
        },
      });

      setAlertDialog("generic_error");
    } finally {
      setProcessingId(null);
      setSelectedRequestId(null);
    }
  };

  const handleReject = (requestId: string) => {
    setSelectedRequestId(requestId);
    setAlertDialog("reject_confirm");
  };

  const confirmReject = async () => {
    if (!selectedRequestId) return;

    setAlertDialog(null);
    setProcessingId(selectedRequestId);

    try {
      const { error } = await client
        .from("crew_join_requests")
        .update({
          status: "rejected",
        } as never)
        .eq("id", selectedRequestId);

      if (error && Object.keys(error).length > 0) {
        console.error("거절 실패:", error);

        await reportSupabaseError(error, "Crew Join Request Rejection Failed", {
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.user_metadata?.name || user?.email,
          metadata: {
            crewId,
            requestId: selectedRequestId,
          },
        });

        setAlertDialog("reject_error");
        setProcessingId(null);
        return;
      }

      // 알림은 데이터베이스 트리거에서 자동 생성됨

      setAlertDialog("reject_success");
      setRequests((prev) => prev.filter((req) => req.id !== selectedRequestId));
      router.refresh();
    } catch (error) {
      console.error("거절 오류:", error);

      await reportSupabaseError(error, "Crew Join Request Rejection Exception", {
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.user_metadata?.name || user?.email,
        metadata: {
          crewId,
          requestId: selectedRequestId,
        },
      });

      setAlertDialog("generic_error");
    } finally {
      setProcessingId(null);
      setSelectedRequestId(null);
    }
  };

  if (!isLeader) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="border border-border/70 bg-background p-4 shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-semibold">가입 신청 관리</h3>
          <p className="mt-1 text-sm text-muted-foreground">크루 가입 신청을 검토하고 승인/거절할 수 있습니다.</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border/70 bg-background p-4 shadow-sm">
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            가입 신청 관리
            {requests.length > 0 && (
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
                {requests.length}
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">크루 가입 신청을 검토하고 승인/거절할 수 있습니다.</p>
        </div>
        <div>
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
                      <Avatar
                        src={avatarUrl}
                        alt={displayName}
                        size="sm"
                        className="border border-border/60"
                      />
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
                        className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
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
        </div>
      </div>

      {/* Alert Dialogs */}
      <AlertDialog open={alertDialog === "approve_confirm"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입 승인 확인</AlertDialogTitle>
            <AlertDialogDescription>
              이 사용자의 가입을 승인하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>승인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "approve_success"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>승인 완료</AlertDialogTitle>
            <AlertDialogDescription>
              가입이 승인되었습니다!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog(null)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "approve_error"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>승인 실패</AlertDialogTitle>
            <AlertDialogDescription>
              승인에 실패했습니다. 다시 시도해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog(null)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "reject_confirm"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입 거절 확인</AlertDialogTitle>
            <AlertDialogDescription>
              이 가입 신청을 거절하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject}>거절</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "reject_success"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거절 완료</AlertDialogTitle>
            <AlertDialogDescription>
              가입 신청이 거절되었습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog(null)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "reject_error"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거절 실패</AlertDialogTitle>
            <AlertDialogDescription>
              거절 처리에 실패했습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog(null)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "generic_error"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>오류 발생</AlertDialogTitle>
            <AlertDialogDescription>
              오류가 발생했습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog(null)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
