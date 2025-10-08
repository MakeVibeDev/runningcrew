"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSupabase } from "@/components/providers/supabase-provider";
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
import { reportSupabaseError } from "@/lib/error-reporter";
import { notifyCrewJoinRequest } from "@/lib/notifications/triggers";

type JoinStatus = "not_member" | "pending" | "member" | "owner" | "loading";

interface CrewJoinButtonProps {
  crewId: string;
  crewSlug: string;
  crewName: string;
  ownerId: string;
}

type AlertType = "login_required" | "join_success" | "join_error" | "cancel_confirm" | "cancel_success" | "cancel_error" | "generic_error" | null;

export function CrewJoinButton({ crewId, crewSlug, crewName, ownerId }: CrewJoinButtonProps) {
  const router = useRouter();
  const { client, user } = useSupabase();
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [alertDialog, setAlertDialog] = useState<AlertType>(null);

  useEffect(() => {
    if (!user) {
      setStatus("not_member");
      return;
    }

    const checkStatus = async () => {
      // Check if user is owner
      if (user.id === ownerId) {
        setStatus("owner");
        return;
      }

      // Check if user is already a member
      const { data: memberData, error: memberError } = await client
        .from("crew_members")
        .select("role")
        .eq("crew_id", crewId)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Failed to check member status:", memberError);
        await reportSupabaseError(memberError, "Crew Member Status Check Failed", {
          userId: user.id,
          userEmail: user.email,
          metadata: { crewId },
        });
      }

      if (memberData) {
        setStatus("member");
        return;
      }

      // Check if user has a pending request
      const { data: requestData, error: requestError } = await client
        .from("crew_join_requests")
        .select("status")
        .eq("crew_id", crewId)
        .eq("profile_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (requestError) {
        console.error("Failed to check join request status:", requestError);
        await reportSupabaseError(requestError, "Crew Join Request Status Check Failed", {
          userId: user.id,
          userEmail: user.email,
          metadata: { crewId },
        });
      }

      if (requestData) {
        setStatus("pending");
        return;
      }

      setStatus("not_member");
    };

    checkStatus().catch(console.error);
  }, [client, crewId, ownerId, user]);

  const handleJoinRequest = async () => {
    if (!user) {
      setAlertDialog("login_required");
      return;
    }

    setIsSubmitting(true);

    try {
      // 프로필 존재 여부 확인
      const { data: existingProfile } = await client
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      // 프로필이 없으면 생성
      if (!existingProfile) {
        const displayName = user.user_metadata?.name
          || user.user_metadata?.full_name
          || user.email?.split('@')[0]
          || '러너';
        const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

        const { error: profileError } = await client
          .from("profiles")
          .insert({
            id: user.id,
            display_name: displayName,
            avatar_url: avatarUrl,
          } as never);

        if (profileError) {
          console.error("프로필 생성 실패:", profileError);
          await reportSupabaseError(profileError, "Profile Creation Failed Before Join Request", {
            userId: user.id,
            userEmail: user.email,
            userName: displayName,
            metadata: {
              crewId,
            },
          });
          setAlertDialog("join_error");
          return;
        }
      }

      // 크루 가입 요청
      const { error } = await client
        .from("crew_join_requests")
        .insert({
          crew_id: crewId,
          profile_id: user.id,
          message: message.trim() || null,
        } as never)
        .select();

      if (error) {
        console.error("가입 신청 실패:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);

        // Report to Slack
        await reportSupabaseError(error, "Crew Join Request Failed", {
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.name || user.email,
          metadata: {
            crewId,
            messageLength: message.length,
          },
        });

        setAlertDialog("join_error");
        return;
      }

      // 크루 리더에게 알림 전송
      const displayName = user.user_metadata?.name || user.email?.split('@')[0] || '러너';
      const notificationResult = await notifyCrewJoinRequest(client, {
        crewId,
        crewSlug,
        crewName,
        ownerId,
        applicantId: user.id,
        applicantName: displayName,
      });

      // 알림 전송 실패 시 에러 리포트 (가입 신청은 성공했으므로 계속 진행)
      if (notificationResult.error) {
        console.error("알림 전송 실패:", notificationResult.error);
        await reportSupabaseError(notificationResult.error, "Crew Join Notification Failed", {
          userId: user.id,
          userEmail: user.email,
          userName: displayName,
          metadata: {
            crewId,
            crewSlug,
            crewName,
            ownerId,
          },
        });
      }

      setAlertDialog("join_success");
      setStatus("pending");
      setMessage("");
      router.refresh();
    } catch (error) {
      console.error("가입 신청 오류:", error);

      // Report to Slack
      await reportSupabaseError(error, "Crew Join Request Exception", {
        userId: user.id,
        userEmail: user.email,
        userName: user.user_metadata?.name || user.email,
        metadata: {
          crewId,
        },
      });

      setAlertDialog("generic_error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = () => {
    setAlertDialog("cancel_confirm");
  };

  const confirmCancelRequest = async () => {
    if (!user) return;

    setAlertDialog(null);
    setIsSubmitting(true);

    try {
      const { error } = await client
        .from("crew_join_requests")
        .delete()
        .eq("crew_id", crewId)
        .eq("profile_id", user.id)
        .eq("status", "pending");

      if (error) {
        console.error("신청 취소 실패:", error);

        // Report to Slack
        await reportSupabaseError(error, "Crew Join Request Cancellation Failed", {
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.name || user.email,
          metadata: {
            crewId,
          },
        });

        setAlertDialog("cancel_error");
        return;
      }

      setAlertDialog("cancel_success");
      setStatus("not_member");
      router.refresh();
    } catch (error) {
      console.error("신청 취소 오류:", error);

      // Report to Slack
      await reportSupabaseError(error, "Crew Join Request Cancellation Exception", {
        userId: user.id,
        userEmail: user.email,
        userName: user.user_metadata?.name || user.email,
        metadata: {
          crewId,
        },
      });

      setAlertDialog("generic_error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          크루에 가입하려면 로그인이 필요합니다.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">상태 확인 중...</p>
      </div>
    );
  }

  if (status === "owner") {
    return (
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-center mx-4">
        <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
          내가 운영하는 크루입니다
        </p>
      </div>
    );
  }

  if (status === "member") {
    return (
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6 text-center">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
          크루 멤버입니다
        </p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <>
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-6">
          <p className="text-center text-sm font-medium text-orange-700 dark:text-orange-400">
            가입 신청 대기 중
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            크루 리더의 승인을 기다리고 있습니다
          </p>
          <button
            onClick={handleCancelRequest}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg border border-border/60 bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {isSubmitting ? "처리 중..." : "신청 취소"}
          </button>
        </div>

        {/* Alert Dialogs for cancel */}
        <AlertDialog open={alertDialog === "cancel_confirm"} onOpenChange={() => setAlertDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>신청 취소 확인</AlertDialogTitle>
              <AlertDialogDescription>
                가입 신청을 취소하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>아니오</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCancelRequest}>예</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={alertDialog === "cancel_success"} onOpenChange={() => setAlertDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>신청 취소 완료</AlertDialogTitle>
              <AlertDialogDescription>
                가입 신청이 취소되었습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>확인</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={alertDialog === "cancel_error"} onOpenChange={() => setAlertDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>신청 취소 실패</AlertDialogTitle>
              <AlertDialogDescription>
                신청 취소에 실패했습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>확인</AlertDialogAction>
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
              <AlertDialogAction>확인</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // status === "not_member"
  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-background p-6">
        <h3 className="text-base font-semibold">크루 가입 신청</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          크루 리더에게 간단한 메시지를 남겨주세요 (선택)
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="예: 매주 주말 함께 달리고 싶습니다!"
          maxLength={200}
          className="mt-3 w-full resize-none rounded-lg border border-border/60 bg-muted/30 p-3 text-sm outline-none focus:border-foreground"
          rows={3}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {message.length}/200
        </p>
        <button
          onClick={handleJoinRequest}
          disabled={isSubmitting}
          className="mt-4 w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "신청 중..." : "가입 신청하기"}
        </button>
      </div>

      {/* Alert Dialogs */}
      <AlertDialog open={alertDialog === "login_required"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그인 필요</AlertDialogTitle>
            <AlertDialogDescription>로그인이 필요합니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "join_success"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입 신청 완료</AlertDialogTitle>
            <AlertDialogDescription>
              가입 신청이 완료되었습니다. 크루 리더의 승인을 기다려주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "join_error"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입 신청 실패</AlertDialogTitle>
            <AlertDialogDescription>
              가입 신청에 실패했습니다. 다시 시도해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "cancel_confirm"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 취소 확인</AlertDialogTitle>
            <AlertDialogDescription>
              가입 신청을 취소하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니오</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelRequest}>예</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "cancel_success"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 취소 완료</AlertDialogTitle>
            <AlertDialogDescription>
              가입 신청이 취소되었습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={alertDialog === "cancel_error"} onOpenChange={() => setAlertDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 취소 실패</AlertDialogTitle>
            <AlertDialogDescription>
              신청 취소에 실패했습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
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
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
