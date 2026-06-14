import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getExam, getSection, parseSectionSegment, type ExamId } from "../../../../lib/exams";
import { getIeltsPractice } from "../../../../lib/episodes-server";
import { JsonLd, SITE_URL, learningResourceJsonLd, breadcrumbJsonLd } from "../../../../lib/seo";
import PracticeRouteClient from "../../../../components/PracticeRouteClient";

export const revalidate = 3600;

type Params = { params: Promise<{ exam: string; segment: string; slug: string }> };

// Only valid for sectioned exams (IELTS): /ielts/listening/section-N/practice-X
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { exam, segment, slug } = await params;
  const cfg = getExam(exam);
  const n = cfg?.hasSections ? parseSectionSegment(segment) : null;
  const sec = cfg && n ? getSection(cfg, n) : null;
  if (!cfg || !sec) return { title: "Not Found", robots: { index: false, follow: false } };

  const practice = await getIeltsPractice(n!, slug);
  if (!practice) return { title: "Not Found", robots: { index: false, follow: false } };

  const url = `${SITE_URL}/${cfg.id}/listening/${sec.segment}/${slug}`;
  const title = practice.title || `${cfg.label} Listening Section ${n} Practice`;
  const description = `Free ${cfg.label} Listening practice — ${practice.title}. ${sec.subtitle}: listen once and answer exam-style questions with instant feedback and answers.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: `${title} | ListeningTalkers`, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function PracticeDetailPage({ params }: Params) {
  const { exam, segment, slug } = await params;
  const cfg = getExam(exam);
  if (!cfg || !cfg.hasSections) notFound();
  const examId = cfg.id as ExamId;

  const n = parseSectionSegment(segment);
  const sec = n ? getSection(cfg, n) : null;
  if (!sec) notFound();

  const practice = await getIeltsPractice(n!, slug);
  if (!practice) notFound();

  const url = `${SITE_URL}/${examId}/listening/${sec.segment}/${slug}`;
  const jsonLd = [
    learningResourceJsonLd({
      name: practice.title,
      description: `Free ${cfg.label} Listening practice — ${practice.title}.`,
      url,
      educationalLevel: sec.level,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: SITE_URL },
      { name: `${cfg.label} Listening`, url: `${SITE_URL}/${examId}/listening` },
      { name: sec.title, url: `${SITE_URL}/${examId}/listening/${sec.segment}` },
      { name: practice.title, url },
    ]),
  ];

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-[#1e2d4a]">
      <JsonLd data={jsonLd} />
      <PracticeRouteClient episodeId={practice.id} backHref={`/${examId}/listening/${sec.segment}`} />
    </main>
  );
}
