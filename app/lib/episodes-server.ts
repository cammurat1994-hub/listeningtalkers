// Server-side Supabase reads for the file-based listening routes & sitemap.
// Uses the public anon client (read-only, no auth needed) so these run during
// SSR / ISR without a user session.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "./supabase";

export type PracticeListItem = {
  id: string;
  title: string;
  slug: string | null;
  exam_section: number | null;
  questions: unknown;
};

export type PracticeRow = {
  id: string;
  title: string;
  slug: string | null;
  exam_section: number | null;
  episode_type: string;
};

// IELTS practices within a section, in stable (created_at) order.
export async function listIeltsSectionPractices(section: number): Promise<PracticeListItem[]> {
  const { data } = await supabase
    .from("episodes")
    .select("id, title, slug, exam_section, questions")
    .eq("exam_type", "ielts")
    .eq("episode_type", "ielts-section")
    .eq("exam_section", section)
    .order("created_at", { ascending: true });
  return (data as PracticeListItem[]) || [];
}

// Listening practices for a non-sectioned exam (toefl/toeic/celpip). Empty until content exists.
export async function listExamPractices(exam: string): Promise<PracticeListItem[]> {
  const { data } = await supabase
    .from("episodes")
    .select("id, title, slug, exam_section, questions")
    .eq("exam_type", exam)
    .like("episode_type", "practice-%")
    .order("created_at", { ascending: true });
  return (data as PracticeListItem[]) || [];
}

// How many IELTS practices exist per section (for the landing grid).
export async function getSectionCounts(): Promise<Record<number, number>> {
  const { data } = await supabase
    .from("episodes")
    .select("exam_section")
    .eq("exam_type", "ielts")
    .eq("episode_type", "ielts-section")
    .not("exam_section", "is", null);
  const counts: Record<number, number> = {};
  (data || []).forEach((r: any) => {
    counts[r.exam_section] = (counts[r.exam_section] || 0) + 1;
  });
  return counts;
}

export async function getIeltsPractice(section: number, slug: string): Promise<PracticeRow | null> {
  const { data } = await supabase
    .from("episodes")
    .select("id, title, slug, exam_section, episode_type")
    .eq("exam_type", "ielts")
    .eq("episode_type", "ielts-section")
    .eq("exam_section", section)
    .eq("slug", slug)
    .maybeSingle();
  return (data as PracticeRow) || null;
}

export async function getExamPractice(exam: string, slug: string): Promise<PracticeRow | null> {
  const { data } = await supabase
    .from("episodes")
    .select("id, title, slug, exam_section, episode_type")
    .eq("exam_type", exam)
    .like("episode_type", "practice-%")
    .eq("slug", slug)
    .maybeSingle();
  return (data as PracticeRow) || null;
}

export type SitemapEpisode = {
  exam_type: string | null;
  exam_section: number | null;
  slug: string | null;
  created_at: string;
};

// Every routable practice (has a slug) for the sitemap.
export async function getAllForSitemap(): Promise<SitemapEpisode[]> {
  const { data } = await supabase
    .from("episodes")
    .select("exam_type, exam_section, slug, created_at")
    .not("slug", "is", null)
    .not("exam_type", "is", null);
  return (data as SitemapEpisode[]) || [];
}
