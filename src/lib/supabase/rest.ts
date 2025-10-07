const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase REST 환경 변수가 설정되지 않았습니다.");
}

type CrewListItem = {
  id: string;
  slug: string;
  name: string;
  activity_region: string;
  description: string | null;
  logo_image_url: string | null;
  owner_id: string;
  crew_members: { profile_id: string }[] | null;
  owner_profile: {
    display_name: string;
    avatar_url: string | null;
  } | null;
};

type CrewDetailRow = {
  id: string;
  slug: string;
  name: string;
  activity_region: string;
  description: string | null;
  intro: string | null;
  logo_image_url: string | null;
  owner_id: string;
  location_lat: number | null;
  location_lng: number | null;
  crew_members: { profile_id: string }[] | null;
  missions: Array<{
    id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    target_distance_km: number | null;
    crew_id: string;
    mission_participants: Array<{ profile_id: string | null; status: string | null }> | null;
  }> | null;
};

type MissionRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  target_distance_km: number | null;
  crew: {
    slug: string;
    name: string;
    description: string | null;
    activity_region: string;
    owner_id: string;
    id: string;
  } | null;
  mission_participants: Array<{ profile_id: string | null; status: string | null }> | null;
};

type MissionRecordRow = {
  id: string;
  recorded_at: string;
  distance_km: number;
  duration_seconds: number;
  pace_seconds_per_km: number;
  visibility: string;
  created_at: string;
  image_path: string | null;
  notes: string | null;
  profile_id?: string;
  mission_id?: string;
  mission: {
    id: string;
    title: string;
    crew: {
      name: string;
    } | null;
  } | null;
};

type JoinedMissionRow = {
  mission: {
    id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    target_distance_km: number | null;
    crew: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

type MissionDetailRow = {
  id: string;
  crew_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  target_distance_km: number | null;
  crew: {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    description: string | null;
    activity_region: string;
    logo_image_url: string | null;
  } | null;
  mission_participants: Array<{
    status: string | null;
    profile: {
      id: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  }> | null;
};

type MissionDetailRecordRow = {
  id: string;
  recorded_at: string;
  distance_km: number;
  duration_seconds: number;
  pace_seconds_per_km: number | null;
  visibility: string;
  notes: string | null;
  created_at: string;
  image_path: string | null;
  likes_count: number;
  comments_count: number;
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

async function supabaseRest<T>(path: string, options?: RequestInit): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase REST 환경 변수가 설정되지 않았습니다.");
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST 요청 실패(${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchCrewList() {
  const data = await supabaseRest<CrewListItem[]>(
    "crews?select=id,slug,name,activity_region,description,logo_image_url,owner_id,crew_members(profile_id),owner_profile:profiles!owner_id(display_name,avatar_url)&order=created_at.desc",
  );

  return data.map((item) => {
    const memberCount = item.crew_members?.length ?? 0;
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      activityRegion: item.activity_region,
      description: item.description,
      logoImageUrl: item.logo_image_url,
      memberCount,
      ownerProfile: item.owner_profile,
    };
  });
}

export async function fetchCrewBySlug(slug: string) {
  const data = await supabaseRest<CrewDetailRow[]>(
    `crews?slug=eq.${slug}&select=id,slug,name,activity_region,description,intro,logo_image_url,owner_id,location_lat,location_lng,crew_members(profile_id),missions(id,title,description,start_date,end_date,target_distance_km,crew_id,mission_participants(status,profile_id))`,
  );
  const row = data[0];
  if (!row) return null;

  const memberCount = row.crew_members?.length ?? 0;

  return {
    ...row,
    member_count: memberCount,
    missions: row.missions?.map((mission) => ({
      ...mission,
      participants_count:
        mission.mission_participants
          ?.filter((participant) => participant?.status === "joined").length ?? 0,
    })),
  };
}

export async function fetchMissionList() {
  const data = await supabaseRest<MissionRow[]>(
    "missions?select=id,title,description,start_date,end_date,target_distance_km,mission_participants(status,profile_id),crew:crews(id,slug,name,description,activity_region,owner_id)&order=start_date.desc",
  );

  return data.map((mission) => ({
    id: mission.id,
    title: mission.title,
    description: mission.description,
    startDate: mission.start_date,
    endDate: mission.end_date,
    targetDistanceKm: mission.target_distance_km,
    participantsCount: mission.mission_participants?.filter((p) => p?.status === "joined").length ?? 0,
    crew: mission.crew ? {
      id: mission.crew.id,
      slug: mission.crew.slug,
      name: mission.crew.name,
      description: mission.crew.description,
      activityRegion: mission.crew.activity_region,
      ownerId: mission.crew.owner_id,
    } : null,
  }));
}

export async function fetchMissionGroups() {
  const data = await supabaseRest<MissionRow[]>(
    "missions?select=id,title,description,start_date,end_date,target_distance_km,mission_participants(status,profile_id),crew:crews(id,slug,name,description,activity_region,owner_id)&order=start_date.desc",
  );

 const grouped = new Map<string, {
    crewSlug: string;
    crewName: string;
    crewSummary: string | null;
    crewOwnerId: string;
    missions: Array<MissionRow & { participantsCount: number }>;
  }>();

  data.forEach((mission) => {
    const crew = mission.crew;
    if (!crew) return;
    if (!grouped.has(crew.slug)) {
      grouped.set(crew.slug, {
        crewSlug: crew.slug,
        crewName: crew.name,
        crewSummary: crew.description,
        crewOwnerId: crew.owner_id,
        missions: [],
      });
    }
    grouped.get(crew.slug)!.missions.push({
      ...mission,
      participantsCount:
        mission.mission_participants?.filter((participant) => participant?.status === "joined").length ?? 0,
    });
  });

  return Array.from(grouped.values());
}

export async function fetchJoinedMissions(profileId: string) {
  const data = await supabaseRest<JoinedMissionRow[]>(
    `mission_participants?profile_id=eq.${profileId}&status=eq.joined&select=mission:missions(id,title,description,start_date,end_date,target_distance_km,crew:crews(id,name,slug))`
  );

  return data
    .map((item) => item.mission)
    .filter((mission): mission is NonNullable<typeof mission> => mission !== null)
    .sort((a, b) => (a.start_date > b.start_date ? -1 : 1));
}

export async function fetchMissionById(missionId: string) {
  const encoded = encodeURIComponent(missionId);
  const data = await supabaseRest<MissionDetailRow[]>(
    `missions?id=eq.${encoded}&select=id,crew_id,title,description,start_date,end_date,target_distance_km,crew:crews(id,name,slug,owner_id,description,activity_region,logo_image_url),mission_participants(status,profile:profiles(id,display_name,avatar_url))`,
  );

  const row = data[0];
  if (!row) return null;

  const participants = (row.mission_participants ?? [])
    .filter((item) => item.status === "joined" && item.profile)
    .map((item) => item.profile!)
    .slice(0, 16);

  return {
    id: row.id,
    crewId: row.crew_id,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    targetDistanceKm: row.target_distance_km,
    crew: row.crew,
    participants,
    participantsCount: (row.mission_participants ?? []).filter((item) => item.status === "joined").length,
  };
}

export async function fetchMissionRecords(missionId: string, limit?: number) {
  const encoded = encodeURIComponent(missionId);
  const limitParam = limit ? `&limit=${limit}` : '';
  const data = await supabaseRest<MissionDetailRecordRow[]>(
    `records?mission_id=eq.${encoded}&visibility=eq.public&select=id,recorded_at,distance_km,duration_seconds,pace_seconds_per_km,visibility,notes,created_at,image_path,record_likes(count),record_comments(count),profile:profiles(id,display_name,avatar_url)&order=created_at.desc${limitParam}`,
  );

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((record: any) => ({
    id: record.id,
    recordedAt: record.recorded_at,
    distanceKm: record.distance_km,
    durationSeconds: record.duration_seconds,
    paceSecondsPerKm: record.pace_seconds_per_km,
    visibility: record.visibility,
    notes: record.notes,
    createdAt: record.created_at,
    imagePath: record.image_path && SUPABASE_URL
      ? `${SUPABASE_URL}/storage/v1/object/public/records-raw/${record.image_path}`
      : null,
    likesCount: Array.isArray(record.record_likes) ? (record.record_likes[0]?.count ?? 0) : 0,
    commentsCount: Array.isArray(record.record_comments) ? (record.record_comments[0]?.count ?? 0) : 0,
    profile: record.profile,
  }));
}

type MissionParticipantStat = {
  mission_id: string;
  profile_id: string;
  total_records: number;
  total_distance_km: number;
  total_duration_seconds: number;
  avg_pace_seconds_per_km: number;
  first_activity_at: string;
  last_activity_at: string;
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

export async function fetchMissionStats(missionId: string) {
  const encoded = encodeURIComponent(missionId);
  const data = await supabaseRest<MissionParticipantStat[]>(
    `mission_participant_stats?mission_id=eq.${encoded}&select=*,profile:profiles(id,display_name,avatar_url)&order=total_distance_km.desc`,
  );

  return data.map((stat) => ({
    missionId: stat.mission_id,
    profileId: stat.profile_id,
    totalRecords: stat.total_records,
    totalDistanceKm: stat.total_distance_km,
    totalDurationSeconds: stat.total_duration_seconds,
    avgPaceSecondsPerKm: stat.avg_pace_seconds_per_km,
    firstActivityAt: stat.first_activity_at,
    lastActivityAt: stat.last_activity_at,
    profile: stat.profile,
  }));
}

export async function fetchUserParticipatingMissions(profileId: string) {
  const encoded = encodeURIComponent(profileId);
  const data = await supabaseRest<MissionRow[]>(
    `missions?select=id,title,description,start_date,end_date,target_distance_km,mission_participants!inner(status,profile_id),crew:crews(id,slug,name,description,activity_region,owner_id)&mission_participants.profile_id=eq.${encoded}&mission_participants.status=eq.joined&order=start_date.desc&limit=10`,
  );

  const now = new Date();

  return data.map((row) => {
    const startDate = new Date(row.start_date);
    const endDate = new Date(row.end_date);

    let status: string;
    if (now < startDate) {
      status = "upcoming";
    } else if (now > endDate) {
      status = "completed";
    } else {
      status = "active";
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      targetDistanceKm: row.target_distance_km,
      status,
      crewName: row.crew?.name || "",
      crew: row.crew
        ? {
            id: row.crew.id,
            slug: row.crew.slug,
            name: row.crew.name,
            description: row.crew.description,
            activityRegion: row.crew.activity_region,
            ownerId: row.crew.owner_id,
          }
        : null,
    };
  });
}

export async function fetchUserRecentRecords(profileId: string, limit = 5) {
  const encoded = encodeURIComponent(profileId);
  const data = await supabaseRest<MissionRecordRow[]>(
    `records?profile_id=eq.${encoded}&select=id,recorded_at,distance_km,duration_seconds,pace_seconds_per_km,visibility,created_at,image_path,notes,mission:missions(id,title,crew:crews(name))&order=created_at.desc&limit=${limit}`,
  );

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return data.map((record) => ({
    id: record.id,
    recordedAt: record.recorded_at,
    distanceKm: record.distance_km,
    durationSeconds: record.duration_seconds,
    paceSecondsPerKm: record.pace_seconds_per_km,
    visibility: record.visibility,
    createdAt: record.created_at,
    notes: record.notes,
    imagePath: record.image_path && SUPABASE_URL
      ? `${SUPABASE_URL}/storage/v1/object/public/records-raw/${record.image_path}`
      : null,
    mission: record.mission,
  }));
}

export async function fetchRecordById(recordId: string) {
  const encoded = encodeURIComponent(recordId);
  const data = await supabaseRest<MissionRecordRow[]>(
    `records?id=eq.${encoded}&select=id,recorded_at,distance_km,duration_seconds,pace_seconds_per_km,visibility,created_at,image_path,notes,profile_id,mission_id,mission:missions(id,title,crew:crews(name))&limit=1`,
  );

  if (data.length === 0) {
    return null;
  }

  const record = data[0];
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return {
    id: record.id,
    recordedAt: record.recorded_at,
    distanceKm: record.distance_km,
    durationSeconds: record.duration_seconds,
    paceSecondsPerKm: record.pace_seconds_per_km,
    visibility: record.visibility,
    createdAt: record.created_at,
    notes: record.notes,
    imagePath: record.image_path && SUPABASE_URL
      ? `${SUPABASE_URL}/storage/v1/object/public/records-raw/${record.image_path}`
      : null,
    imagePathRaw: record.image_path,
    mission: record.mission,
  };
}

export async function fetchUserOverallStats(profileId: string) {
  const encoded = encodeURIComponent(profileId);

  // mission_participant_stats 테이블에서 사용자의 모든 미션 통계를 가져옴
  const data = await supabaseRest<MissionParticipantStat[]>(
    `mission_participant_stats?profile_id=eq.${encoded}&select=total_records,total_distance_km,total_duration_seconds,avg_pace_seconds_per_km`,
  );

  if (data.length === 0) {
    return {
      totalRecords: 0,
      totalDistanceKm: 0,
      totalDurationSeconds: 0,
      avgPaceSecondsPerKm: null,
    };
  }

  // 모든 미션의 통계를 합산
  const totalRecords = data.reduce((sum, stat) => sum + stat.total_records, 0);
  const totalDistanceKm = data.reduce((sum, stat) => sum + stat.total_distance_km, 0);
  const totalDurationSeconds = data.reduce((sum, stat) => sum + stat.total_duration_seconds, 0);

  // 평균 페이스 계산 (총 시간 / 총 거리)
  const avgPaceSecondsPerKm = totalDistanceKm > 0
    ? Math.round(totalDurationSeconds / totalDistanceKm)
    : null;

  return {
    totalRecords,
    totalDistanceKm,
    totalDurationSeconds,
    avgPaceSecondsPerKm,
  };
}

export async function fetchUserMissionStat(missionId: string, profileId: string) {
  const encodedMission = encodeURIComponent(missionId);
  const encodedProfile = encodeURIComponent(profileId);
  const data = await supabaseRest<MissionParticipantStat[]>(
    `mission_participant_stats?mission_id=eq.${encodedMission}&profile_id=eq.${encodedProfile}&select=*`,
  );

  const stat = data[0];
  if (!stat) return null;

  return {
    missionId: stat.mission_id,
    profileId: stat.profile_id,
    totalRecords: stat.total_records,
    totalDistanceKm: stat.total_distance_km,
    totalDurationSeconds: stat.total_duration_seconds,
    avgPaceSecondsPerKm: stat.avg_pace_seconds_per_km,
    firstActivityAt: stat.first_activity_at,
    lastActivityAt: stat.last_activity_at,
  };
}

type UserCrewRow = {
  crew: {
    id: string;
    slug: string;
    name: string;
    logo_image_url: string | null;
    activity_region: string | null;
    owner_id: string;
  } | null;
};

export async function fetchUserJoinedCrews(profileId: string) {
  const encoded = encodeURIComponent(profileId);
  const data = await supabaseRest<UserCrewRow[]>(
    `crew_members?profile_id=eq.${encoded}&select=crew:crews(id,slug,name,logo_image_url,activity_region,owner_id)`,
  );

  // 각 크루의 멤버 수 및 리더 정보 계산
  const crewsWithCounts = await Promise.all(
    data
      .filter((row) => row.crew !== null)
      .map(async (row) => {
        const crewId = encodeURIComponent(row.crew!.id);
        const ownerId = encodeURIComponent(row.crew!.owner_id);

        // 크루별 멤버 수 조회
        const memberCountData = await supabaseRest<Array<{ crew_id: string }>>(
          `crew_members?crew_id=eq.${crewId}&select=crew_id`,
        );

        // 리더 프로필 조회
        const ownerData = await supabaseRest<Array<{ id: string; display_name: string; avatar_url: string | null }>>(
          `profiles?id=eq.${ownerId}&select=id,display_name,avatar_url`,
        );

        return {
          id: row.crew!.id,
          slug: row.crew!.slug,
          name: row.crew!.name,
          logoImageUrl: row.crew!.logo_image_url,
          activityRegion: row.crew!.activity_region || "",
          memberCount: memberCountData.length,
          owner: ownerData[0] || null,
        };
      })
  );

  return crewsWithCounts;
}

/**
 * 프로필 이미지 업로드
 */
export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const { getBrowserSupabaseClient } = await import("@/lib/supabase/browser-client");
  const supabase = getBrowserSupabaseClient();

  // 파일 확장자 추출
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `profile-avatars/${fileName}`;

  // Storage에 업로드
  const { error: uploadError } = await supabase.storage
    .from("crew-assets")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
  }

  // Public URL 생성
  const { data } = supabase.storage.from("crew-assets").getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * 사용자가 참여 중인 미션들의 최근 기록 가져오기
 */
export async function fetchUserJoinedMissionsRecentRecords(profileId: string, limit = 3) {
  const encoded = encodeURIComponent(profileId);

  // 참여 중인 미션 목록 가져오기
  const missions = await supabaseRest<Array<{ mission: { id: string; title: string; crew: { name: string; slug: string } } }>>(
    `mission_participants?profile_id=eq.${encoded}&status=eq.joined&select=mission:missions(id,title,crew:crews(name,slug))`
  );

  if (!missions || missions.length === 0) {
    return [];
  }

  const missionIds = missions
    .map((m) => m.mission?.id)
    .filter((id): id is string => !!id);

  if (missionIds.length === 0) {
    return [];
  }

  // 각 미션의 최근 기록 가져오기 (전체 참여자)
  const recordsPromises = missionIds.map(async (missionId) => {
    const encodedMissionId = encodeURIComponent(missionId);
    const records = await supabaseRest<Array<{
      id: string;
      profile_id: string;
      mission_id: string;
      recorded_at: string;
      distance_km: number;
      duration_seconds: number;
      pace_seconds_per_km: number;
      visibility: string;
      profile: {
        id: string;
        display_name: string;
        avatar_url: string | null;
      } | null;
    }>>(
      `records?mission_id=eq.${encodedMissionId}&visibility=eq.public&select=id,profile_id,mission_id,recorded_at,distance_km,duration_seconds,pace_seconds_per_km,visibility,profile:profiles(id,display_name,avatar_url)&order=recorded_at.desc&limit=${limit}`
    );

    const mission = missions.find((m) => m.mission?.id === missionId)?.mission;

    return records.map((record) => ({
      ...record,
      mission: mission || null,
    }));
  });

  const allRecords = (await Promise.all(recordsPromises)).flat();

  // 최신순으로 정렬하고 limit개만 반환
  return allRecords
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .slice(0, limit);
}

/**
 * 특정 미션에서 사용자의 현재 순위 가져오기
 */
export async function fetchUserMissionRanking(missionId: string, profileId: string) {
  const encodedMissionId = encodeURIComponent(missionId);

  // 해당 미션의 전체 통계 가져오기
  const stats = await supabaseRest<Array<{
    profile_id: string;
    total_distance_km: number;
  }>>(
    `mission_participant_stats?mission_id=eq.${encodedMissionId}&select=profile_id,total_distance_km&order=total_distance_km.desc`
  );

  if (!stats || stats.length === 0) {
    return null;
  }

  // 사용자의 순위 찾기
  const userRank = stats.findIndex((stat) => stat.profile_id === profileId);

  if (userRank === -1) {
    return null;
  }

  const userStat = stats[userRank];

  return {
    rank: userRank + 1,
    totalParticipants: stats.length,
    totalDistance: userStat.total_distance_km,
  };
}

/**
 * 사용자가 참여 중인 미션 목록 가져오기
 */
export async function fetchUserJoinedMissions(profileId: string) {
  const encodedProfileId = encodeURIComponent(profileId);

  const missions = await supabaseRest<Array<{
    mission_id: string;
    joined_at: string;
    mission: {
      id: string;
      title: string;
      description: string;
      start_date: string;
      end_date: string;
      crew_id: string;
      crew: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }>>(
    `mission_participants?profile_id=eq.${encodedProfileId}&select=mission_id,joined_at,mission:missions(id,title,description,start_date,end_date,crew_id,crew:crews(id,name,slug))`
  );

  return missions.map((mp) => ({
    ...mp.mission,
    joined_at: mp.joined_at,
  }));
}
