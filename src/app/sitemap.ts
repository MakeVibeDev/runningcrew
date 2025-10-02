import { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004";
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/crews`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/missions`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/crews/create`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/missions/create`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic crew pages
  const { data: crews } = await supabase
    .from("crews")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false });

  const crewPages: MetadataRoute.Sitemap =
    (crews as { slug: string; updated_at: string }[] | null)?.map((crew) => ({
      url: `${baseUrl}/crews/${crew.slug}`,
      lastModified: new Date(crew.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })) || [];

  // Dynamic mission pages
  const { data: missions } = await supabase
    .from("missions")
    .select("id, updated_at")
    .order("updated_at", { ascending: false });

  const missionPages: MetadataRoute.Sitemap =
    (missions as { id: string; updated_at: string }[] | null)?.map((mission) => ({
      url: `${baseUrl}/missions/${mission.id}`,
      lastModified: new Date(mission.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) || [];

  return [...staticPages, ...crewPages, ...missionPages];
}
