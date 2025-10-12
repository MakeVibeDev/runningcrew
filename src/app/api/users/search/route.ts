import { createClient } from "@/lib/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Get search query (no authentication required for search)
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search users by display_name
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${query}%`)
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "사용자 검색에 실패했습니다" },
      { status: 500 }
    );
  }
}
