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

type JoinStatus = "not_member" | "pending" | "member" | "owner" | "loading";

interface CrewJoinButtonProps {
  crewId: string;
  ownerId: string;
}

type AlertType = "login_required" | "join_success" | "join_error" | "cancel_confirm" | "cancel_success" | "cancel_error" | "generic_error" | null;

export function CrewJoinButton({ crewId, ownerId }: CrewJoinButtonProps) {
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
      const { data: memberData } = await client
        .from("crew_members")
        .select("role")
        .eq("crew_id", crewId)
        .eq("profile_id", user.id)
        .single();

      if (memberData) {
        setStatus("member");
        return;
      }

      // Check if user has a pending request
      const { data: requestData } = await client
        .from("crew_join_requests")
        .select("status")
        .eq("crew_id", crewId)
        .eq("profile_id", user.id)
        .eq("status", "pending")
        .single();

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
      const { error } = await client
        .from("crew_join_requests")
        .insert({
          crew_id: crewId,
          profile_id: user.id,
          message: message.trim() || null,
        } as never);

      if (error) {
        console.error("가입 신청 실패:", error);
        setAlertDialog("join_error");
        return;
      }

      setAlertDialog("join_success");
      setStatus("pending");
      setMessage("");
      router.refresh();
    } catch (error) {
      console.error("가입 신청 오류:", error);
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
        setAlertDialog("cancel_error");
        return;
      }

      setAlertDialog("cancel_success");
      setStatus("not_member");
      router.refresh();
    } catch (error) {
      console.error("신청 취소 오류:", error);
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
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
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
