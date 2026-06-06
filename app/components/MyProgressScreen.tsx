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

function getTypeLabel(t: string): string {
  if (PRACTICE_TYPE_LABELS[t]) return PRACTICE_TYPE_LABELS[t];
  if (t?.includes("completion")) return "Completions";
  if (t?.startsWith("quiz-")) return "Quiz";
  return "Practice";
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

export default function MyProgressScreen({ onBack, onSelectEpisode }: Props) {
  const [results, setResults] = useState<Result[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("Beginner");
  const [loading, setLoading] = useState(true);
  const [activityPage, setActivityPage] = useState(0);
  const ACTIVITY_PAGE_SIZE = 5;

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data } = await supabase
          .from("user_results")
          .select("*")
          .eq("user_email", user.email)
          .order("created_at", { ascending: false });
        if (data) setResults(data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

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
  const motivationMessage = getMotivationMessage(streak, overallAccuracy, completedCount);

  const lastActivity = results[0] ? (() => {
    const diff = Math.floor((Date.now() - new Date(results[0].created_at).getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff} days ago`;
  })() : null;

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
      <section className="mx-auto max-w-4xl px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#7a6258] hover:text-[#3b2f2f]">
              ← Back
            </button>
            <h1 className="text-4xl font-bold md:text-5xl">My Progress</h1>
            <p className="mt-2 text-[#7a6258]">Track your listening journey.</p>
          </div>
        </div>

        {/* Motivasyon kartı */}
        <div className="mt-8 rounded-[2rem] bg-[#3b2f2f] p-6 text-white shadow-sm">
          <p className="text-lg font-semibold">{motivationMessage}</p>
          {lastActivity && (
            <p className="mt-1 text-sm text-[#c9a99a]">
              Last activity: {lastActivity} — {results[0]?.level} · {getTypeLabel(results[0]?.episode_type)}
            </p>
          )}
          {streak > 0 && (
            <div className="mt-4 flex items-center gap-2">
              {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
                <div key={i} className="h-2 w-8 rounded-full bg-orange-400" />
              ))}
              {streak > 7 && <span className="text-xs text-orange-300">+{streak - 7} more</span>}
            </div>
          )}
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
                const diff = Math.floor((Date.now() - new Date(result.created_at).getTime()) / 86400000);
                const dateLabel = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff}d ago`;
                return (
                  <button key={result.id} onClick={() => onSelectEpisode(result.episode_id)}
                    className="flex items-center gap-4 rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 text-left transition hover:bg-[#f1ded5]">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                      acc >= 80 ? "bg-green-100 text-green-700" :
                      acc >= 60 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{acc}%</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{result.episode_title}</p>
                      <p className="mt-0.5 text-xs text-[#7a6258]">{result.level} · {getTypeLabel(result.episode_type)} · {dateLabel} · {result.score}/{result.total_questions} correct</p>
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