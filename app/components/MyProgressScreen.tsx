"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  onBack: () => void;
  onSelectEpisode: (episodeId: string) => void;
};

type Result = {
  id: string;
  level: string;
  episode_id: string;
  episode_title: string;
  episode_type: string;
  score: number;
  total_questions: number;
  created_at: string;
};

type IeltsEpisode = { id: string; exam_section: number | null; questions: any };

const EXAM_TABS = [
  { id: "ielts", label: "IELTS", emoji: "🎧", active: true },
  { id: "toefl", label: "TOEFL", emoji: "🎓", active: false },
  { id: "toeic", label: "TOEIC", emoji: "💼", active: false },
  { id: "celpip", label: "CELPIP", emoji: "🍁", active: false },
];

const SECTION_INFO: Record<number, { title: string; desc: string; parts: string; emoji: string }> = {
  1: { title: "Section 1", desc: "Everyday conversation", parts: "Part 1 & 2", emoji: "💬" },
  2: { title: "Section 2", desc: "Social monologue", parts: "Part 1 & 2", emoji: "🗺️" },
  3: { title: "Section 3", desc: "Academic discussion", parts: "Part 1 & 2", emoji: "🎓" },
  4: { title: "Section 4", desc: "University lecture", parts: "Single part", emoji: "📖" },
};

const GROUP_TYPE_LABELS: Record<string, string> = {
  "mcq": "Multiple Choice",
  "note-completion": "Note Completion",
  "form-completion": "Form Completion",
  "table-completion": "Table Completion",
  "flow-completion": "Flow Chart",
  "sentence-completion": "Sentence Completion",
  "short-answer": "Short Answer",
  "matching": "Matching",
  "map": "Map Labelling",
};

function getTypeLabel(t: string): string {
  if (t === "ielts-section") return "IELTS Section";
  if (t?.includes("completion")) return "Completion";
  if (t?.startsWith("quiz-")) return "Quiz";
  return "Practice";
}

// Number of answerable questions inside a single question group.
function countGroupQuestions(group: any): number {
  const d = group?.data;
  if (!d) return 0;
  switch (group.type) {
    case "mcq":
    case "short-answer":
      return Array.isArray(d) ? d.length : 0;
    case "note-completion":
    case "form-completion":
      return (d.items?.length || d.fields?.length || 0);
    case "sentence-completion":
      return d.items?.length || 0;
    case "matching":
      return d.items?.length || 0;
    case "map":
      return d.points?.length || 0;
    case "flow-completion":
      return (d.steps || []).filter((s: any) => s.hasBlank).length;
    case "table-completion":
      return (d.rows || []).reduce((n: number, row: any) => n + (row.cells || []).filter((c: string) => c === "___").length, 0);
    default:
      return 0;
  }
}

// IELTS section number — prefer episodes map, fall back to title (e.g. "... Section 2 ...")
function getSectionNum(r: Result, sectionMap: Map<string, number>): number | null {
  if (r.episode_type !== "ielts-section") return null;
  const fromMap = sectionMap.get(r.episode_id);
  if (fromMap) return fromMap;
  const m = r.episode_title?.match(/\bS(?:ection)?\s*([1-4])\b/i);
  return m ? parseInt(m[1], 10) : null;
}

function calculateStreak(results: Result[]): number {
  if (!results.length) return 0;
  const uniqueDays = Array.from(
    new Set(results.map((r) => new Date(r.created_at).toISOString().split("T")[0]))
  ).sort((a, b) => (a > b ? -1 : 1));
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;
  let streak = 0;
  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    if (uniqueDays[i] === expected) streak++;
    else break;
  }
  return streak;
}

function calculateLongestStreak(results: Result[]): number {
  if (!results.length) return 0;
  const uniqueDays = Array.from(
    new Set(results.map((r) => new Date(r.created_at).toISOString().split("T")[0]))
  ).sort();
  let longest = 1, current = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const dayDiff = Math.round(
      (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i - 1]).getTime()) / 86400000
    );
    if (dayDiff === 1) { current++; longest = Math.max(longest, current); }
    else current = 1;
  }
  return longest;
}

function getMotivationMessage(streak: number, accuracy: number, completed: number): string {
  if (completed === 0) return "🎧 Start your first practice and track your progress here!";
  if (streak >= 7) return `🔥 ${streak} days in a row! You're unstoppable!`;
  if (streak >= 3) return `⚡ ${streak}-day streak! Keep the momentum going!`;
  if (streak === 1) return "👋 Good to see you back! You studied today.";
  if (accuracy >= 80) return "🎯 Excellent accuracy! Your listening is sharp.";
  if (accuracy >= 60) return "📈 Good work! Keep practicing to improve.";
  return "💪 Every session counts. Keep going!";
}

function AccuracyBar({ pct, color = "bg-[#1e2d4a]" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-[#dbe4f0]">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function barColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-500";
  if (pct >= 40) return "bg-orange-400";
  return "bg-[#8ba3c4]";
}

function textColor(pct: number) {
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-[#4a5568]";
}

function relativeDate(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

export default function MyProgressScreen({ onBack, onSelectEpisode }: Props) {
  const [results, setResults] = useState<Result[]>([]);
  const [ieltsEpisodes, setIeltsEpisodes] = useState<IeltsEpisode[]>([]);
  const [examTab, setExamTab] = useState("ielts");
  const [loading, setLoading] = useState(true);
  const [activityPage, setActivityPage] = useState(0);
  const ACTIVITY_PAGE_SIZE = 5;

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const [resRes, epRes] = await Promise.all([
          supabase
            .from("user_results")
            .select("*")
            .eq("user_email", user.email)
            .order("created_at", { ascending: false }),
          supabase
            .from("episodes")
            .select("id, exam_section, questions")
            .eq("episode_type", "ielts-section"),
        ]);
        if (resRes.data) setResults(resRes.data);
        if (epRes.data) setIeltsEpisodes(epRes.data as IeltsEpisode[]);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const sectionMap = useMemo(() => {
    const m = new Map<string, number>();
    ieltsEpisodes.forEach((e) => { if (e.exam_section) m.set(e.id, e.exam_section); });
    return m;
  }, [ieltsEpisodes]);

  const sectionTotals = useMemo(() => {
    const t: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    ieltsEpisodes.forEach((e) => { if (e.exam_section) t[e.exam_section] = (t[e.exam_section] || 0) + 1; });
    return t;
  }, [ieltsEpisodes]);

  // episode_id → its question groups (flattened across parts) with question counts
  const episodeGroups = useMemo(() => {
    const m = new Map<string, { type: string; count: number }[]>();
    ieltsEpisodes.forEach((e) => {
      const parts = Array.isArray(e.questions) ? e.questions : [];
      const groups: { type: string; count: number }[] = [];
      parts.forEach((p: any) => (p?.groups || []).forEach((g: any) => groups.push({ type: g.type, count: countGroupQuestions(g) })));
      m.set(e.id, groups);
    });
    return m;
  }, [ieltsEpisodes]);

  const latestByEpisode = useMemo(() => {
    const map = new Map<string, Result>();
    results.forEach((r) => { if (!map.has(r.episode_id)) map.set(r.episode_id, r); });
    return map;
  }, [results]);

  const completedCount = latestByEpisode.size;
  const totalCorrect = results.reduce((s, r) => s + r.score, 0);
  const totalQuestions = results.reduce((s, r) => s + r.total_questions, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const streak = calculateStreak(results);
  const longestStreak = useMemo(() => calculateLongestStreak(results), [results]);
  const motivationMessage = getMotivationMessage(streak, overallAccuracy, completedCount);
  const lastActivity = results[0] ? relativeDate(results[0].created_at) : null;

  // IELTS Section istatistikleri (S1-S4)
  const sectionStats = useMemo(() => {
    const map: Record<number, { episodes: Set<string>; correct: number; total: number; last: string }> = {};
    results.forEach((r) => {
      const sec = getSectionNum(r, sectionMap);
      if (!sec) return;
      if (!map[sec]) map[sec] = { episodes: new Set(), correct: 0, total: 0, last: r.created_at };
      map[sec].episodes.add(r.episode_id);
      map[sec].correct += r.score;
      map[sec].total += r.total_questions;
      if (r.created_at > map[sec].last) map[sec].last = r.created_at;
    });
    return [1, 2, 3, 4].map((sec) => {
      const d = map[sec];
      const available = sectionTotals[sec] || 0;
      const completed = d ? d.episodes.size : 0;
      return {
        section: sec,
        completed,
        available,
        progress: available > 0 ? Math.min(100, Math.round((completed / available) * 100)) : (completed > 0 ? 100 : 0),
        pct: d && d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
        last: d ? d.last : null,
        hasData: completed > 0,
      };
    });
  }, [results, sectionMap, sectionTotals]);

  const hasAnyIelts = sectionStats.some((s) => s.hasData || s.available > 0);

  // Soru tipi performansı — episode doğruluğu, içerdiği soru tiplerine paylaştırılır
  const questionTypeStats = useMemo(() => {
    const buckets: Record<string, { correct: number; total: number }> = {};
    results.forEach((r) => {
      if (r.episode_type !== "ielts-section" || r.total_questions <= 0) return;
      const groups = episodeGroups.get(r.episode_id);
      if (!groups || !groups.length) return;
      const pct = r.score / r.total_questions;
      groups.forEach((g) => {
        if (g.count <= 0) return;
        if (!buckets[g.type]) buckets[g.type] = { correct: 0, total: 0 };
        buckets[g.type].total += g.count;
        buckets[g.type].correct += pct * g.count;
      });
    });
    return Object.entries(buckets)
      .map(([type, b]) => ({
        type,
        label: GROUP_TYPE_LABELS[type] || type,
        pct: b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct);
  }, [results, episodeGroups]);

  const pagedActivity = results.slice(activityPage * ACTIVITY_PAGE_SIZE, (activityPage + 1) * ACTIVITY_PAGE_SIZE);
  const totalActivityPages = Math.ceil(results.length / ACTIVITY_PAGE_SIZE);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#c8d5e8] border-t-[#1e2d4a]" />
          <p className="text-[#4a5568]">Loading your progress...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-[#1e2d4a]">
      <style>{`
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1) rotate(-3deg); opacity: 1; }
          50%      { transform: scale(1.18) rotate(3deg); opacity: 0.82; }
        }
        @keyframes flameGlow {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(251,146,60,0.7)); }
          50%      { filter: drop-shadow(0 0 8px rgba(251,146,60,0.95)); }
        }
        .flame-anim { display: inline-block; animation: flameFlicker 1.1s ease-in-out infinite, flameGlow 1.6s ease-in-out infinite; }
      `}</style>

      <section className="mx-auto max-w-4xl px-6 py-12">

        {/* Header */}
        <div>
          <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#4a5568] hover:text-[#1e2d4a]">
            ← Back
          </button>
          <h1 className="text-4xl font-bold md:text-5xl">My Progress</h1>
          <p className="mt-2 text-[#4a5568]">Track your listening journey.</p>
        </div>

        {/* Sınav sekmeleri */}
        <div className="mt-6 flex flex-wrap gap-2">
          {EXAM_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setExamTab(tab.id)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition ${
                examTab === tab.id ? "border-[#1e2d4a] bg-[#1e2d4a] text-white" : "border-[#c8d5e8] bg-white text-[#1e2d4a] hover:bg-[#ffffff]"
              }`}>
              {tab.emoji} {tab.label}
              {!tab.active && <span className="rounded-full bg-[#dbe4f0] px-1.5 py-0.5 text-[9px] font-semibold text-[#4a5568]">SOON</span>}
            </button>
          ))}
        </div>

        {/* Non-IELTS tablar: Coming Soon */}
        {examTab !== "ielts" && (
          <div className="mt-8 rounded-[2rem] border border-[#c8d5e8] bg-white p-12 text-center shadow-sm">
            <p className="text-5xl">🚧</p>
            <h2 className="mt-4 text-2xl font-bold">{EXAM_TABS.find(t => t.id === examTab)?.label} — Coming Soon</h2>
            <p className="mt-2 text-[#4a5568]">We&apos;re working on it. For now, track your progress in the IELTS tab.</p>
            <button onClick={() => setExamTab("ielts")} className="mt-6 rounded-2xl bg-[#1e2d4a] px-8 py-3 font-semibold text-white hover:bg-[#162038]">
              Go to IELTS →
            </button>
          </div>
        )}

        {/* ───────── IELTS SEKMESİ ───────── */}
        {examTab === "ielts" && (
          <>
            {/* Motivasyon kartı — sade */}
            <div className="mt-8 rounded-[2rem] bg-[#1e2d4a] p-6 text-white shadow-sm">
              <p className="text-lg font-semibold">{motivationMessage}</p>
              {lastActivity && (
                <p className="mt-2 text-sm text-[#8ba3c4]">
                  Last activity: {lastActivity} · {getTypeLabel(results[0]?.episode_type)}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2">
                  <span className={streak > 0 ? "flame-anim text-2xl" : "text-2xl opacity-50"}>🔥</span>
                  <div className="leading-tight">
                    <p className="text-xl font-bold">{streak}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[#8ba3c4]">Current streak</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2">
                  <span className="text-2xl">🏆</span>
                  <div className="leading-tight">
                    <p className="text-xl font-bold">{longestStreak}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[#8ba3c4]">Longest streak</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 özet kart */}
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { emoji: "🔥", label: "Streak", value: `${streak}`, sub: streak === 1 ? "day" : "days", color: streak >= 3 ? "border-orange-200 bg-orange-50" : "" },
                { emoji: "🎧", label: "Completed", value: `${completedCount}`, sub: "practices", color: "" },
                { emoji: "🎯", label: "Accuracy", value: `${overallAccuracy}%`, sub: "overall", color: overallAccuracy >= 80 ? "border-green-200 bg-green-50" : "" },
                { emoji: "✅", label: "Correct", value: `${totalCorrect}`, sub: `of ${totalQuestions}`, color: "" },
              ].map((card) => (
                <div key={card.label} className={`rounded-[2rem] border p-6 shadow-sm ${card.color || "border-[#c8d5e8] bg-white"}`}>
                  <p className="text-sm text-[#4a5568]">{card.emoji} {card.label}</p>
                  <h2 className="mt-2 text-4xl font-bold">{card.value}</h2>
                  <p className="mt-1 text-xs text-[#4a5568]">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* IELTS Section kartları */}
            {hasAnyIelts && (
              <div className="mt-6 rounded-[2rem] border border-[#c8d5e8] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">🎧 IELTS Section Progress</h2>
                <p className="mt-1 text-xs text-[#4a5568]">Your journey through each Listening section.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {sectionStats.map((s) => {
                    const info = SECTION_INFO[s.section];
                    return (
                      <div key={s.section}
                        className={`rounded-2xl border p-5 transition ${s.hasData ? "border-[#c8d5e8] bg-[#ffffff]" : "border-dashed border-[#c8d5e8] bg-[#f0f2f5]/40"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-bold">{info.emoji} {info.title}</p>
                            <p className="text-xs text-[#4a5568]">{info.desc} · {info.parts}</p>
                          </div>
                          {s.hasData ? (
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold ${
                              s.pct >= 80 ? "bg-green-100 text-green-700" :
                              s.pct >= 60 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>{s.pct}%</span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-[#dbe4f0] px-2.5 py-0.5 text-xs font-semibold text-[#4a5568]">New</span>
                          )}
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold">{s.completed}</p>
                            <p className="text-[10px] uppercase tracking-wide text-[#4a5568]">Done</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{s.hasData ? `${s.pct}%` : "—"}</p>
                            <p className="text-[10px] uppercase tracking-wide text-[#4a5568]">Avg score</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold leading-tight pt-1">{relativeDate(s.last) || "—"}</p>
                            <p className="text-[10px] uppercase tracking-wide text-[#4a5568]">Last</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-[#4a5568]">
                            <span>Completed</span>
                            <span>{s.available > 0 ? `${s.completed}/${s.available}` : s.completed}</span>
                          </div>
                          <AccuracyBar pct={s.progress} color={s.hasData ? barColor(s.pct) : "bg-[#8ba3c4]"} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Soru Tipi Performansı */}
            {questionTypeStats.length > 0 && (
              <div className="mt-6 rounded-[2rem] border border-[#c8d5e8] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">📊 Question Type Performance</h2>
                <p className="mt-1 text-xs text-[#4a5568]">Estimated accuracy by question type across your IELTS sections.</p>
                <div className="mt-5 flex flex-col gap-4">
                  {questionTypeStats.map((s) => (
                    <div key={s.type}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-semibold">{s.label}</span>
                        <span className={`text-sm font-bold ${textColor(s.pct)}`}>{s.pct}%</span>
                      </div>
                      <AccuracyBar pct={s.pct} color={barColor(s.pct)} />
                      {s.pct < 60 && (
                        <p className="mt-1 text-xs font-semibold text-[#4a5568]">💡 Practice {s.label} more to improve →</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity — sade */}
            {results.length > 0 && (
              <div className="mt-6 rounded-[2rem] border border-[#c8d5e8] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Recent Activity</h2>
                  {totalActivityPages > 1 && (
                    <p className="text-sm text-[#4a5568]">Page {activityPage + 1} / {totalActivityPages}</p>
                  )}
                </div>
                <div className="mt-5 flex flex-col gap-3">
                  {pagedActivity.map((result) => {
                    const acc = result.total_questions > 0 ? Math.round((result.score / result.total_questions) * 100) : 0;
                    const dateLabel = relativeDate(result.created_at);
                    const sec = getSectionNum(result, sectionMap);
                    const secInfo = sec ? SECTION_INFO[sec] : null;
                    return (
                      <button key={result.id} onClick={() => onSelectEpisode(result.episode_id)}
                        className="flex items-center gap-4 rounded-2xl border border-[#c8d5e8] bg-[#ffffff] p-4 text-left transition hover:bg-[#dbe4f0]">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                          acc >= 80 ? "bg-green-100 text-green-700" :
                          acc >= 60 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>{acc}%</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold truncate">{result.episode_title}</p>
                            {secInfo && (
                              <span className="shrink-0 rounded-full bg-[#dbe4f0] px-2 py-0.5 text-[10px] font-bold text-[#1e2d4a]">
                                {secInfo.emoji} {secInfo.title}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#4a5568]">
                            {getTypeLabel(result.episode_type)} · {dateLabel} · {result.score}/{result.total_questions} correct
                          </p>
                        </div>
                        <span className="shrink-0 text-[#8ba3c4]">→</span>
                      </button>
                    );
                  })}
                </div>
                {totalActivityPages > 1 && (
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <button onClick={() => setActivityPage(p => Math.max(0, p - 1))} disabled={activityPage === 0}
                      className="rounded-2xl border border-[#c8d5e8] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">← Prev</button>
                    {Array.from({ length: totalActivityPages }, (_, i) => (
                      <button key={i} onClick={() => setActivityPage(i)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activityPage === i ? "bg-[#1e2d4a] text-white" : "border border-[#c8d5e8] bg-white hover:bg-[#dbe4f0]"}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setActivityPage(p => Math.min(totalActivityPages - 1, p + 1))} disabled={activityPage === totalActivityPages - 1}
                      className="rounded-2xl border border-[#c8d5e8] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Next →</button>
                  </div>
                )}
              </div>
            )}

            {/* Boş durum */}
            {results.length === 0 && (
              <div className="mt-12 rounded-[2rem] border border-[#c8d5e8] bg-white p-12 text-center shadow-sm">
                <p className="text-5xl">🎧</p>
                <h2 className="mt-4 text-2xl font-bold">No activity yet</h2>
                <p className="mt-2 text-[#4a5568]">Complete your first practice to start tracking progress.</p>
                <button onClick={onBack} className="mt-6 rounded-2xl bg-[#1e2d4a] px-8 py-3 font-semibold text-white hover:bg-[#162038]">
                  Start Practicing →
                </button>
              </div>
            )}
          </>
        )}

      </section>
    </main>
  );
}
