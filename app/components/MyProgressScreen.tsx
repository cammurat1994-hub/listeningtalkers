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

type IeltsEpisode = { id: string; exam_section: number | null };

const levels = ["Beginner", "Intermediate", "Advanced"];

const PRACTICE_TYPE_LABELS: Record<string, string> = {
  "practice-mcq": "Multiple Choice",
  "practice-fill": "Fill in the Blank",
  "practice-dictation": "Dictation",
  "practice-short": "Short Answer",
  "practice-matching": "Matching",
  "practice-map": "Map Labelling",
  "practice-completion-note": "Note Completion",
  "practice-completion-form": "Form Completion",
  "practice-completion-table": "Table Completion",
  "practice-completion-flow": "Flow Chart",
  "practice-completion-sentence": "Sentence Completion",
};

const PRACTICE_TYPES = Object.keys(PRACTICE_TYPE_LABELS);

const SECTION_INFO: Record<number, { title: string; desc: string; parts: string; emoji: string }> = {
  1: { title: "Section 1", desc: "Everyday conversation", parts: "Part 1 & 2", emoji: "💬" },
  2: { title: "Section 2", desc: "Social monologue", parts: "Part 1 & 2", emoji: "🗺️" },
  3: { title: "Section 3", desc: "Academic discussion", parts: "Part 1 & 2", emoji: "🎓" },
  4: { title: "Section 4", desc: "University lecture", parts: "Single part", emoji: "📖" },
};

function getTypeLabel(t: string): string {
  if (t === "ielts-section") return "IELTS Section";
  if (PRACTICE_TYPE_LABELS[t]) return PRACTICE_TYPE_LABELS[t];
  if (t?.includes("completion")) return "Completions";
  if (t?.startsWith("quiz-")) return "Quiz";
  return "Practice";
}

// IELTS section number — prefer episodes map, fall back to title (e.g. "IELTS S2 — ...")
function getSectionNum(r: Result, sectionMap: Map<string, number>): number | null {
  if (r.episode_type !== "ielts-section") return null;
  const fromMap = sectionMap.get(r.episode_id);
  if (fromMap) return fromMap;
  const m = r.episode_title?.match(/\bS([1-4])\b/);
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

function getAccuracyMessage(pct: number): string {
  if (pct >= 80) return "Excellent — keep it up!";
  if (pct >= 60) return "Good progress — a little more practice will get you there.";
  if (pct >= 40) return "You're building a foundation — consistency is key.";
  if (pct >= 20) return "Early days — every attempt improves your ear.";
  return "Just getting started — keep going!";
}

function AccuracyBar({ pct, color = "bg-[#3b2f2f]" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-[#f1e3da]">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function barColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-500";
  if (pct >= 40) return "bg-orange-400";
  return "bg-[#c9a99a]";
}

function textColor(pct: number) {
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-[#7a6258]";
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
  const [selectedLevel, setSelectedLevel] = useState("Beginner");
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
            .select("id, exam_section")
            .eq("episode_type", "ielts-section"),
        ]);
        if (resRes.data) setResults(resRes.data);
        if (epRes.data) setIeltsEpisodes(epRes.data as IeltsEpisode[]);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // episode_id → section number, and available episodes per section
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

  const latestByEpisode = useMemo(() => {
    const map = new Map<string, Result>();
    results.forEach((r) => { if (!map.has(r.episode_id)) map.set(r.episode_id, r); });
    return map;
  }, [results]);

  const practiceResults = useMemo(() => results.filter(r => !r.episode_type?.startsWith("quiz-")), [results]);
  const quizResults = useMemo(() => results.filter(r => r.episode_type?.startsWith("quiz-")), [results]);

  const completedCount = latestByEpisode.size;
  const totalCorrect = results.reduce((s, r) => s + r.score, 0);
  const totalQuestions = results.reduce((s, r) => s + r.total_questions, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const streak = calculateStreak(results);
  const longestStreak = useMemo(() => calculateLongestStreak(results), [results]);
  const motivationMessage = getMotivationMessage(streak, overallAccuracy, completedCount);

  const lastActivity = results[0] ? relativeDate(results[0].created_at) : null;

  // IELTS Section bazlı istatistikler (S1-S4)
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

  // IELTS odaklı kişiselleştirilmiş motivasyon
  const ieltsMotivation = useMemo(() => {
    const withData = sectionStats.filter((s) => s.hasData);
    if (!withData.length) return null;
    const strongest = [...withData].sort((a, b) => b.pct - a.pct)[0];
    const notStarted = sectionStats.find((s) => !s.hasData && s.available > 0);
    const weakest = [...withData].sort((a, b) => a.pct - b.pct)[0];
    if (notStarted) {
      return `💪 You're strong in Section ${strongest.section} (${strongest.pct}%) — give Section ${notStarted.section} a try next!`;
    }
    if (weakest.pct < 60 && weakest.section !== strongest.section) {
      return `📚 Section ${weakest.section} needs some love (${weakest.pct}%). A few more practices will lift your score!`;
    }
    return `🌟 Great balance across sections! Section ${strongest.section} is your strongest at ${strongest.pct}%.`;
  }, [sectionStats]);

  // Practice type bazlı performans
  const practiceTypeStats = useMemo(() => {
    const map: Record<string, { correct: number; total: number }> = {};
    practiceResults.forEach((r) => {
      const key = r.episode_type;
      if (!key || !PRACTICE_TYPES.includes(key)) return;
      if (!map[key]) map[key] = { correct: 0, total: 0 };
      map[key].correct += r.score;
      map[key].total += r.total_questions;
    });
    return Object.entries(map)
      .map(([type, { correct, total }]) => ({
        type,
        label: PRACTICE_TYPE_LABELS[type] || type,
        pct: total > 0 ? Math.round((correct / total) * 100) : 0,
        total,
      }))
      .filter(a => a.total > 0)
      .sort((a, b) => a.pct - b.pct);
  }, [practiceResults]);

  // Quiz type bazlı performans
  const quizTypeStats = useMemo(() => {
    const map: Record<string, { correct: number; total: number }> = {};
    quizResults.forEach((r) => {
      const key = r.episode_type?.replace("quiz-", "").toUpperCase() || "Quiz";
      if (!map[key]) map[key] = { correct: 0, total: 0 };
      map[key].correct += r.score;
      map[key].total += r.total_questions;
    });
    return Object.entries(map)
      .map(([label, { correct, total }]) => ({
        label,
        pct: total > 0 ? Math.round((correct / total) * 100) : 0,
        total,
      }))
      .filter(a => a.total > 0)
      .sort((a, b) => a.pct - b.pct);
  }, [quizResults]);

  const levelResults = results.filter((r) => r.level === selectedLevel);

  const pagedActivity = results.slice(activityPage * ACTIVITY_PAGE_SIZE, (activityPage + 1) * ACTIVITY_PAGE_SIZE);
  const totalActivityPages = Math.ceil(results.length / ACTIVITY_PAGE_SIZE);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7eee8]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#e0c7bb] border-t-[#3b2f2f]" />
          <p className="text-[#7a6258]">Loading your progress...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      {/* Flame animasyonu (CSS) */}
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#7a6258] hover:text-[#3b2f2f]">
              ← Back
            </button>
            <h1 className="text-4xl font-bold md:text-5xl">My Progress</h1>
            <p className="mt-2 text-[#7a6258]">Track your IELTS listening journey.</p>
          </div>
        </div>

        {/* Motivasyon kartı */}
        <div className="mt-8 rounded-[2rem] bg-[#3b2f2f] p-6 text-white shadow-sm">
          <p className="text-lg font-semibold">{motivationMessage}</p>
          {ieltsMotivation && (
            <p className="mt-2 text-sm text-[#ead7cc]">{ieltsMotivation}</p>
          )}
          {lastActivity && (
            <p className="mt-2 text-sm text-[#c9a99a]">
              Last activity: {lastActivity} — {results[0]?.level} · {getTypeLabel(results[0]?.episode_type)}
            </p>
          )}

          {/* Streak satırı: current + longest + flame */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2">
              <span className={streak > 0 ? "flame-anim text-2xl" : "text-2xl opacity-50"}>🔥</span>
              <div className="leading-tight">
                <p className="text-xl font-bold">{streak}</p>
                <p className="text-[10px] uppercase tracking-wide text-[#c9a99a]">Current streak</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2">
              <span className="text-2xl">🏆</span>
              <div className="leading-tight">
                <p className="text-xl font-bold">{longestStreak}</p>
                <p className="text-[10px] uppercase tracking-wide text-[#c9a99a]">Longest streak</p>
              </div>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
                  <div key={i} className="h-2 w-6 rounded-full bg-orange-400" />
                ))}
                {streak > 7 && <span className="text-xs text-orange-300">+{streak - 7}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Özet kartlar */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { emoji: "🔥", label: "Streak", value: `${streak}`, sub: streak === 1 ? "day" : "days", color: streak >= 3 ? "border-orange-200 bg-orange-50" : "" },
            { emoji: "🎧", label: "Practices", value: `${completedCount}`, sub: "completed", color: "" },
            { emoji: "🎯", label: "Accuracy", value: `${overallAccuracy}%`, sub: "overall", color: overallAccuracy >= 80 ? "border-green-200 bg-green-50" : "" },
            { emoji: "✅", label: "Correct", value: `${totalCorrect}`, sub: `of ${totalQuestions}`, color: "" },
          ].map((card) => (
            <div key={card.label} className={`rounded-[2rem] border p-6 shadow-sm ${card.color || "border-[#e0c7bb] bg-white"}`}>
              <p className="text-sm text-[#7a6258]">{card.emoji} {card.label}</p>
              <h2 className="mt-2 text-4xl font-bold">{card.value}</h2>
              <p className="mt-1 text-xs text-[#7a6258]">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* IELTS Section ilerleme kartları (S1-S4) */}
        {hasAnyIelts && (
          <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">🎧 IELTS Section Progress</h2>
            <p className="mt-1 text-xs text-[#7a6258]">Your journey through each Listening section.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {sectionStats.map((s) => {
                const info = SECTION_INFO[s.section];
                return (
                  <div
                    key={s.section}
                    className={`rounded-2xl border p-5 transition ${
                      s.hasData ? "border-[#e0c7bb] bg-[#fffaf7]" : "border-dashed border-[#e0c7bb] bg-[#f7eee8]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold">{info.emoji} {info.title}</p>
                        <p className="text-xs text-[#7a6258]">{info.desc} · {info.parts}</p>
                      </div>
                      {s.hasData ? (
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold ${
                          s.pct >= 80 ? "bg-green-100 text-green-700" :
                          s.pct >= 60 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>{s.pct}%</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[#ead7cc] px-2.5 py-0.5 text-xs font-semibold text-[#7a6258]">New</span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold">{s.completed}</p>
                        <p className="text-[10px] uppercase tracking-wide text-[#7a6258]">Done</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{s.hasData ? `${s.pct}%` : "—"}</p>
                        <p className="text-[10px] uppercase tracking-wide text-[#7a6258]">Avg score</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold leading-tight pt-1">{relativeDate(s.last) || "—"}</p>
                        <p className="text-[10px] uppercase tracking-wide text-[#7a6258]">Last</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-[#7a6258]">
                        <span>Completed</span>
                        <span>{s.available > 0 ? `${s.completed}/${s.available}` : s.completed}</span>
                      </div>
                      <AccuracyBar pct={s.progress} color={s.hasData ? barColor(s.pct) : "bg-[#c9a99a]"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Practice ve Quiz 2 kart */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">

          {/* Practice performansı */}
          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">🎧 Practice Performance</h2>
            <p className="mt-1 text-xs text-[#7a6258]">Your accuracy by question type.</p>
            {practiceTypeStats.length === 0 ? (
              <p className="mt-4 text-sm text-[#7a6258]">No practice data yet.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {practiceTypeStats.map((s) => (
                  <div key={s.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{s.label}</span>
                      <span className={`text-sm font-bold ${textColor(s.pct)}`}>{s.pct}%</span>
                    </div>
                    <AccuracyBar pct={s.pct} color={barColor(s.pct)} />
                    <p className="mt-1 text-xs text-[#7a6258]">{getAccuracyMessage(s.pct)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quiz performansı */}
          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">📝 Quiz Performance</h2>
            <p className="mt-1 text-xs text-[#7a6258]">Your accuracy by exam type.</p>
            {quizTypeStats.length === 0 ? (
              <p className="mt-4 text-sm text-[#7a6258]">No quiz data yet. Try an exam-style quiz!</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {quizTypeStats.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{s.label}</span>
                      <span className={`text-sm font-bold ${textColor(s.pct)}`}>{s.pct}%</span>
                    </div>
                    <AccuracyBar pct={s.pct} color={barColor(s.pct)} />
                    <p className="mt-1 text-xs text-[#7a6258]">{getAccuracyMessage(s.pct)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress by Level */}
        <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Progress by Level</h2>
          <div className="mt-5 flex gap-3">
            {levels.map((level) => {
              const lvlResults = results.filter((r) => r.level === level);
              const lvlQ = lvlResults.reduce((s, r) => s + r.total_questions, 0);
              const lvlC = lvlResults.reduce((s, r) => s + r.score, 0);
              const acc = lvlQ > 0 ? Math.round((lvlC / lvlQ) * 100) : 0;
              const practices = new Set(lvlResults.map((r) => r.episode_id)).size;
              return (
                <button key={level} onClick={() => setSelectedLevel(level)}
                  className={`flex-1 rounded-2xl border p-4 text-left transition ${selectedLevel === level ? "border-[#3b2f2f] bg-[#f7eee8]" : "border-[#e0c7bb] hover:bg-[#fffaf7]"}`}>
                  <p className="font-bold text-sm">{level}</p>
                  <p className="mt-1 text-2xl font-bold">{acc > 0 ? `${acc}%` : "—"}</p>
                  <p className="mt-1 text-xs text-[#7a6258]">{practices} practices</p>
                  <div className="mt-2">
                    <AccuracyBar pct={acc} color={barColor(acc)} />
                  </div>
                </button>
              );
            })}
          </div>

          {levelResults.length > 0 && (
            <div className="mt-5 flex flex-col gap-2">
              <p className="text-sm font-semibold text-[#7a6258]">{selectedLevel} — recent practices</p>
              {Array.from(new Map(levelResults.map(r => [r.episode_id, r])).values()).slice(0, 5).map((r) => {
                const acc = Math.round((r.score / r.total_questions) * 100);
                return (
                  <button key={r.id} onClick={() => onSelectEpisode(r.episode_id)}
                    className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] px-4 py-3 text-left text-sm hover:bg-[#f1ded5]">
                    <span className="font-semibold truncate">{r.episode_title}</span>
                    <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      acc >= 80 ? "bg-green-100 text-green-700" :
                      acc >= 60 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{acc}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity — 5'lik sayfalı */}
        {results.length > 0 && (
          <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Activity</h2>
              {totalActivityPages > 1 && (
                <p className="text-sm text-[#7a6258]">Page {activityPage + 1} / {totalActivityPages}</p>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {pagedActivity.map((result) => {
                const acc = result.total_questions > 0 ? Math.round((result.score / result.total_questions) * 100) : 0;
                const dateLabel = (() => {
                  const diff = Math.floor((new Date().getTime() - new Date(result.created_at).getTime()) / 86400000);
                  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff}d ago`;
                })();
                const sec = getSectionNum(result, sectionMap);
                const secInfo = sec ? SECTION_INFO[sec] : null;
                return (
                  <button key={result.id} onClick={() => onSelectEpisode(result.episode_id)}
                    className="flex items-center gap-4 rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 text-left transition hover:bg-[#f1ded5]">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                      acc >= 80 ? "bg-green-100 text-green-700" :
                      acc >= 60 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{acc}%</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold truncate">{result.episode_title}</p>
                        {secInfo && (
                          <span className="shrink-0 rounded-full bg-[#ead7cc] px-2 py-0.5 text-[10px] font-bold text-[#3b2f2f]">
                            {secInfo.emoji} {secInfo.title}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#7a6258]">
                        {result.level} · {getTypeLabel(result.episode_type)}
                        {secInfo ? ` · ${secInfo.parts}` : ""} · {dateLabel} · {result.score}/{result.total_questions} correct
                      </p>
                    </div>
                    <span className="shrink-0 text-[#c9a99a]">→</span>
                  </button>
                );
              })}
            </div>
            {totalActivityPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-2">
                <button onClick={() => setActivityPage(p => Math.max(0, p - 1))} disabled={activityPage === 0}
                  className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">← Prev</button>
                {Array.from({ length: totalActivityPages }, (_, i) => (
                  <button key={i} onClick={() => setActivityPage(i)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activityPage === i ? "bg-[#3b2f2f] text-white" : "border border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setActivityPage(p => Math.min(totalActivityPages - 1, p + 1))} disabled={activityPage === totalActivityPages - 1}
                  className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* Boş durum */}
        {results.length === 0 && (
          <div className="mt-12 rounded-[2rem] border border-[#e0c7bb] bg-white p-12 text-center shadow-sm">
            <p className="text-5xl">🎧</p>
            <h2 className="mt-4 text-2xl font-bold">No activity yet</h2>
            <p className="mt-2 text-[#7a6258]">Complete your first practice to start tracking progress.</p>
            <button onClick={onBack} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-3 font-semibold text-white hover:bg-[#2f2424]">
              Start Practicing →
            </button>
          </div>
        )}

      </section>
    </main>
  );
}
