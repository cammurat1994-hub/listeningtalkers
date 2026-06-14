import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam, getSection, parseSectionSegment, type ExamId } from "../../../lib/exams";
import { listIeltsSectionPractices, getExamPractice } from "../../../lib/episodes-server";
import { getGroupTypeLine } from "../../../lib/questionTypes";
import { JsonLd, SITE_URL, learningResourceJsonLd, breadcrumbJsonLd } from "../../../lib/seo";
import PracticeRouteClient from "../../../components/PracticeRouteClient";

export const revalidate = 3600;

type Params = { params: Promise<{ exam: string; segment: string }> };

// IELTS: /ielts/listening/section-N  → section practice list
// Other exams: /toefl/listening/practice-N → single practice (segment is the slug)
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { exam, segment } = await params;
  const cfg = getExam(exam);
  if (!cfg) return { title: "Not Found", robots: { index: false, follow: false } };

  if (cfg.hasSections) {
    const n = parseSectionSegment(segment);
    const sec = n ? getSection(cfg, n) : null;
    if (!sec) return { title: "Not Found", robots: { index: false, follow: false } };
    const url = `${SITE_URL}/${cfg.id}/listening/${sec.segment}`;
    const title = `${cfg.label} Listening Section ${n} Practice Tests`;
    const description = `Free ${cfg.label} Listening ${sec.title} (${sec.subtitle}) practice tests. ${sec.desc}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { type: "website", url, title: `${title} | ListeningTalkers`, description },
      twitter: { card: "summary", title, description },
    };
  }

  // Non-sectioned exam: segment = practice slug
  const practice = await getExamPractice(cfg.id, segment);
  if (!practice) return { title: "Not Found", robots: { index: false, follow: false } };
  const url = `${SITE_URL}/${cfg.id}/listening/${segment}`;
  const title = practice.title || `${cfg.label} Listening Practice`;
  const description = `Free ${cfg.label} Listening practice test — ${practice.title}. Listen and answer exam-style questions with instant feedback.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: `${title} | ListeningTalkers`, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function SegmentPage({ params }: Params) {
  const { exam, segment } = await params;
  const cfg = getExam(exam);
  if (!cfg) notFound();
  const examId = cfg.id as ExamId;

  // ── IELTS: section practice list ───────────────────────────────────────────
  if (cfg.hasSections) {
    const n = parseSectionSegment(segment);
    const sec = n ? getSection(cfg, n) : null;
    if (!sec) notFound();

    const practices = await listIeltsSectionPractices(n!);
    const url = `${SITE_URL}/${examId}/listening/${sec.segment}`;
    const title = `${cfg.label} Listening Section ${n} Practice Tests`;
    const jsonLd = [
      learningResourceJsonLd({
        name: title,
        description: `Free ${cfg.label} Listening ${sec.title} practice tests.`,
        url,
        educationalLevel: sec.level,
      }),
      breadcrumbJsonLd([
        { name: "Home", url: SITE_URL },
        { name: `${cfg.label} Listening`, url: `${SITE_URL}/${examId}/listening` },
        { name: sec.title, url },
      ]),
    ];

    return (
      <main className="min-h-screen bg-[#f0f2f5] text-[#1e2d4a]">
        <JsonLd data={jsonLd} />
        <section className="mx-auto max-w-4xl px-6 py-12">
          <Link href={`/${examId}/listening`} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#4a5568] hover:text-[#1e2d4a]">
            ← {cfg.label} Listening
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dbe4f0] text-3xl">{sec.emoji}</div>
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">{sec.title} — {sec.subtitle}</h1>
              <p className="mt-1 text-sm text-[#4a5568]">{sec.desc}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sec.types.map((t) => (
              <span key={t} className="rounded-full border border-[#c8d5e8] bg-white px-3 py-1 text-xs font-semibold text-[#1e2d4a]">{t}</span>
            ))}
          </div>

          {practices.length === 0 ? (
            <div className="mt-12 text-center">
              <p className="text-5xl">🎧</p>
              <p className="mt-4 text-lg font-semibold">No practices yet — check back soon!</p>
              <p className="mt-2 text-sm text-[#4a5568]">New content is being added regularly.</p>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-3">
              {practices.map((p, i) => {
                const line = getGroupTypeLine(p.questions);
                return (
                  <Link
                    key={p.id}
                    href={`/${examId}/listening/${sec.segment}/${p.slug ?? p.id}`}
                    className="group flex items-center gap-4 rounded-[2rem] border border-[#c8d5e8] bg-[#ffffff] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dbe4f0] text-sm font-bold text-[#1e2d4a]">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{p.title}</p>
                      {line && <p className="mt-0.5 text-xs text-[#4a5568] truncate">📋 {line}</p>}
                    </div>
                    <span className="shrink-0 text-[#8ba3c4] transition group-hover:translate-x-1 group-hover:text-[#1e2d4a]">→</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    );
  }

  // ── Non-sectioned exam: single practice (segment = slug) ────────────────────
  const practice = await getExamPractice(examId, segment);
  if (!practice) notFound();
  const url = `${SITE_URL}/${examId}/listening/${segment}`;
  const jsonLd = [
    learningResourceJsonLd({
      name: practice.title,
      description: `Free ${cfg.label} Listening practice test — ${practice.title}.`,
      url,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: SITE_URL },
      { name: `${cfg.label} Listening`, url: `${SITE_URL}/${examId}/listening` },
      { name: practice.title, url },
    ]),
  ];

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-[#1e2d4a]">
      <JsonLd data={jsonLd} />
      <PracticeRouteClient episodeId={practice.id} backHref={`/${examId}/listening`} />
    </main>
  );
}
