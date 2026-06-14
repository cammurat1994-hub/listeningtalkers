import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExam, EXAM_IDS, type ExamId } from "../../lib/exams";
import { getSectionCounts, listExamPractices } from "../../lib/episodes-server";
import { getGroupTypeLine } from "../../lib/questionTypes";
import { JsonLd, SITE_URL, learningResourceJsonLd, breadcrumbJsonLd } from "../../lib/seo";

export const revalidate = 3600;

export function generateStaticParams() {
  return EXAM_IDS.map((exam) => ({ exam }));
}

type Params = { params: Promise<{ exam: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { exam } = await params;
  const cfg = getExam(exam);
  if (!cfg) return { title: "Not Found", robots: { index: false, follow: false } };
  const url = `${SITE_URL}/${cfg.id}/listening`;
  return {
    title: cfg.seo.landingTitle,
    description: cfg.seo.landingDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${cfg.seo.landingTitle} | ListeningTalkers`,
      description: cfg.seo.landingDescription,
    },
    twitter: { card: "summary", title: cfg.seo.landingTitle, description: cfg.seo.landingDescription },
  };
}

export default async function ExamListeningPage({ params }: Params) {
  const { exam } = await params;
  const cfg = getExam(exam);
  if (!cfg) notFound();

  const examId = cfg.id as ExamId;
  const url = `${SITE_URL}/${examId}/listening`;

  const jsonLd = [
    learningResourceJsonLd({ name: cfg.seo.landingTitle, description: cfg.seo.landingDescription, url }),
    breadcrumbJsonLd([
      { name: "Home", url: SITE_URL },
      { name: `${cfg.label} Listening`, url },
    ]),
  ];

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-[#1e2d4a]">
      <JsonLd data={jsonLd} />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#4a5568] hover:text-[#1e2d4a]">
            ← Home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dbe4f0] px-4 py-2 text-sm font-semibold text-[#1e2d4a] mb-4">
            {cfg.emoji} {cfg.label} Listening Practice
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">{cfg.seo.landingTitle}</h1>
          <p className="mt-4 mx-auto max-w-2xl text-lg text-[#4a5568]">{cfg.seo.landingDescription}</p>
        </div>

        {cfg.hasSections && cfg.sections ? (
          <SectionGrid examId={examId} sections={cfg.sections} counts={await getSectionCounts()} />
        ) : (
          <ExamPracticeList examId={examId} />
        )}
      </section>
    </main>
  );
}

async function SectionGrid({
  examId,
  sections,
  counts,
}: {
  examId: ExamId;
  sections: NonNullable<ReturnType<typeof getExam>>["sections"];
  counts: Record<number, number>;
}) {
  if (!sections) return null;
  return (
    <div className="mt-12 grid gap-5 md:grid-cols-2">
      {sections.map((s) => {
        const count = counts[s.number] || 0;
        return (
          <Link
            key={s.number}
            href={`/${examId}/listening/${s.segment}`}
            className={`group rounded-[2rem] border-2 bg-[#ffffff] p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${s.color}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dbe4f0] text-3xl">{s.emoji}</div>
                <div>
                  <p className="font-bold text-xl">{s.title}</p>
                  <p className="text-sm text-[#4a5568]">{s.subtitle}</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold shrink-0 ${s.badge}`}>{s.level}</span>
            </div>
            <p className="text-sm text-[#4a5568] mb-4">{s.desc}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {s.types.map((t) => (
                <span key={t} className="rounded-full border border-[#c8d5e8] bg-white px-3 py-1 text-xs font-semibold text-[#1e2d4a]">{t}</span>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-[#c8d5e8] pt-4">
              <span className="text-sm text-[#4a5568]">
                {count ? `${count} practice${count === 1 ? "" : "s"} available` : "Practices coming soon"}
              </span>
              <span className="text-[#8ba3c4] transition group-hover:translate-x-1 group-hover:text-[#1e2d4a]">→</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

async function ExamPracticeList({ examId }: { examId: ExamId }) {
  const practices = await listExamPractices(examId);

  if (practices.length === 0) {
    return (
      <div className="mt-12 rounded-[2rem] border border-[#c8d5e8] bg-white p-12 text-center shadow-sm">
        <p className="text-5xl">🚧</p>
        <h2 className="mt-4 text-2xl font-bold">Coming Soon</h2>
        <p className="mt-2 text-[#4a5568]">We&apos;re preparing listening practice tests for this exam. Check back soon.</p>
        <Link href="/ielts/listening" className="mt-6 inline-block rounded-2xl bg-[#1e2d4a] px-8 py-3 font-semibold text-white hover:bg-[#162038]">
          Try IELTS Listening →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-12 flex flex-col gap-3">
      {practices.map((p, i) => {
        const line = getGroupTypeLine(p.questions);
        return (
          <Link
            key={p.id}
            href={`/${examId}/listening/${p.slug}`}
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
  );
}
