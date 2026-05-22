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
  score: number;
  total_questions: number;
  created_at: string;
};

const levels = ["Beginner", "Intermediate", "Advanced"];

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
  if (completed === 0) return "🎧 Start your first episode and track your progress here!";
  if (streak >= 7) return `🔥 ${streak} days in a row! You're unstoppable!`;
  if (streak >= 3) return `⚡ ${streak}-day streak! Keep the momentum going!`;
  if (streak === 1) return "👋 Good to see you back! You studied today.";
  if (accuracy >= 80) return "🎯 Excellent accuracy! Your listening is sharp.";
  if (accuracy >= 60) return "📈 Good work! Keep practicing to improve.";
  return "💪 Every session counts. Keep going!";
}

export default function MyProgressScreen({ onBack, onSelectEpisode }: Props) {
  const [results, setResults] = useState<Result[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("Beginner");
  const [loading, setLoading] = useState(true);

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

  const levelResults = results.filter((r) => r.level === selectedLevel);
  const levelCorrect = levelResults.reduce((s, r) => s + r.score, 0);
  const levelQuestions = levelResults.reduce((s, r) => s + r.total_questions, 0);
  const levelAccuracy = levelQuestions > 0 ? Math.round((levelCorrect / levelQuestions) * 100) : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7eee8] p-10 text-[#3b2f2f]">
        Loading progress...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] px-6 py-10 text-[#3b2f2f]">
      <section className="mx-auto max-w-4xl">

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">My Progress</h1>
            <p className="mt-2 text-[#7a6258]">Track your listening journey.</p>
          </div>
          <button onClick={onBack} className="rounded-2xl border border-[#e0c7bb] bg-white px-6 py-3 font-semibold shadow-sm">
            Back
          </button>
        </div>

        {/* Motivasyon kartı */}
        <div className="mt-8 rounded-[2rem] bg-[#3b2f2f] p-6 text-white shadow-sm">
          <p className="text-lg font-semibold">{motivationMessage}</p>
          {lastActivity && (
            <p className="mt-1 text-sm text-[#c9a99a]">
              Last activity: {lastActivity}
              {results[0] && ` — ${results[0].episode_title}`}
            </p>
          )}
        </div>

        {/* Özet kartlar */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { emoji: "🔥", label: "Streak", value: `${streak}`, sub: "days" },
            { emoji: "🎧", label: "Episodes", value: `${completedCount}`, sub: "completed" },
            { emoji: "🎯", label: "Accuracy", value: `${overallAccuracy}%`, sub: "overall" },
            { emoji: "✅", label: "Correct", value: `${totalCorrect}`, sub: "answers" },
          ].map((card) => (
            <div key={card.label} className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
              <p className="text-sm text-[#7a6258]">{card.emoji} {card.label}</p>
              <h2 className="mt-2 text-4xl font-bold">{card.value}</h2>
              <p className="mt-1 text-xs text-[#7a6258]">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Seviye bazlı istatistik */}
        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Progress by Level</h2>

          <div className="mt-6 flex gap-3">
            {levels.map((level) => {
              const lvlResults = results.filter((r) => r.level === level);
              const lvlQ = lvlResults.reduce((s, r) => s + r.total_questions, 0);
              const lvlC = lvlResults.reduce((s, r) => s + r.score, 0);
              const acc = lvlQ > 0 ? Math.round((lvlC / lvlQ) * 100) : 0;
              const episodes = new Set(lvlResults.map((r) => r.episode_id)).size;

              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`flex-1 rounded-2xl border p-4 text-left transition ${selectedLevel === level ? "border-[#3b2f2f] bg-[#f7eee8]" : "border-[#e0c7bb] hover:bg-[#fffaf7]"}`}
                >
                  <p className="font-bold">{level}</p>
                  <p className="mt-1 text-2xl font-bold">{acc > 0 ? `${acc}%` : "—"}</p>
                  <p className="mt-1 text-xs text-[#7a6258]">{episodes} episodes</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#f1e3da]">
                    <div className="h-1.5 rounded-full bg-[#3b2f2f]" style={{ width: `${acc}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Son aktiviteler */}
        {results.length > 0 && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold">Recent Activity</h2>
            <div className="mt-6 flex flex-col gap-3">
              {results.slice(0, 8).map((result) => {
                const acc = Math.round((result.score / result.total_questions) * 100);
                const date = new Date(result.created_at);
                const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
                const dateLabel = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff}d ago`;

                return (
                  <button
                    key={result.id}
                    onClick={() => onSelectEpisode(result.episode_id)}
                    className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 text-left transition hover:bg-[#f1ded5]"
                  >
                    <div>
                      <p className="font-bold">{result.episode_title}</p>
                      <p className="mt-0.5 text-xs text-[#7a6258]">
                        {result.level} · {dateLabel}
                      </p>
                    </div>
                    <div className={`rounded-2xl px-3 py-1.5 text-sm font-bold ${
                      acc >= 80 ? "bg-green-100 text-green-700" :
                      acc >= 60 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {acc}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </section>
    </main>
  );
}