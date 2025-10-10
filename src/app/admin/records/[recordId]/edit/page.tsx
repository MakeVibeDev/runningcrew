import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RecordEditForm from "./RecordEditForm";
import { cookies } from "next/headers";

type PageProps = {
  params: Promise<{ recordId: string }>;
};

type RecordDetail = {
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
    crew_id: string;
    crew: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

export default async function AdminEditRecordPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { recordId } = await params;

  // 기록 상세 조회
  const { data: record, error } = await supabase
    .from("records")
    .select(
      `
      id,
      recorded_at,
      distance_km,
      duration_seconds,
      pace_seconds_per_km,
      visibility,
      notes,
      image_path,
      profile:profiles!records_profile_id_fkey(id, display_name, avatar_url),
      mission:missions(
        id,
        title,
        crew_id,
        crew:crews(id, name, slug)
      )
    `
    )
    .eq("id", recordId)
    .single<RecordDetail>();

  if (error || !record) {
    redirect("/admin/records");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">기록 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {record.profile?.display_name ?? "Unknown"}님의 기록
        </p>
      </div>

      <RecordEditForm record={record} />
    </div>
  );
}
