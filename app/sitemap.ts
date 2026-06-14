import { MetadataRoute } from "next";
import { EXAMS, EXAM_IDS } from "./lib/exams";
import { getAllForSitemap } from "./lib/episodes-server";
import { SITE_URL } from "./lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
  ];

  // Exam listening landings + IELTS section pages
  for (const id of EXAM_IDS) {
    const cfg = EXAMS[id];
    entries.push({
      url: `${SITE_URL}/${id}/listening`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: cfg.available ? 0.9 : 0.5,
    });
    if (cfg.hasSections && cfg.sections) {
      for (const sec of cfg.sections) {
        entries.push({
          url: `${SITE_URL}/${id}/listening/${sec.segment}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  }

  // Every individual practice (has a slug)
  const episodes = await getAllForSitemap();
  for (const ep of episodes) {
    if (!ep.slug || !ep.exam_type) continue;
    let url: string | null = null;
    if (ep.exam_type === "ielts" && ep.exam_section) {
      url = `${SITE_URL}/ielts/listening/section-${ep.exam_section}/${ep.slug}`;
    } else if (ep.exam_type !== "ielts") {
      url = `${SITE_URL}/${ep.exam_type}/listening/${ep.slug}`;
    }
    if (!url) continue;
    entries.push({
      url,
      lastModified: ep.created_at ? new Date(ep.created_at) : now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
