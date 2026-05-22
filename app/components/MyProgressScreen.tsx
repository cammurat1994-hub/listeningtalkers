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

type Episode = {
  id: string;
  title: string;
  level: string;
};

const levels = ["Beginner", "Intermediate", "Advanced"];

function calculateStreak(results: Result[]): number {
  if (results.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(
      results.map((r) => new Date(r.created_at).toISOString().split("T")[0])
    )
  ).sort((a, b) => (a > b ? -1 : 1));

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  for (let i = 0; i < uniqueDays.length; i++) {
    const expected = new Date(Date.now() - i * 86400000)
      .toISOString()
      .split("T")[0];
    if (uniqueDays[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function getMotivationMessage(streak: number, accuracy: number): string {
  if (streak >= 7) return "🔥 You're on fire! " + streak + " days in a row!";
  if (streak >= 3) return "⚡ Great streak! Keep it going — " + streak + " days!";
  if (streak === 1) return "👋 Welcome back! You studied today.";
  if (accuracy >= 80) return "🎯 Excellent accuracy! You're making great progress.";
  if (accuracy >= 60) return "📈 Good work! Keep practicing to improve your score.";
  return "🎧 Start listening and track your progress here.";
}

export default function MyProgressScreen({ onBack, onSelectEpisode }: Props) {
  const [results, setResults] = useState<Result[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("Beginner");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: episodeData } = await supabase
        .from("episodes")
        .select("id,title,level")
        .order("created_at", { ascending: true });

      if (episodeData) setEpisodes(episodeData);

      if (user?.email) {
        const { data: resultData } = await supabase
          .from("user_results")
          .select("*")
          .eq("user_email", user.email)
          .order("created_at", { ascending: false });

        if (resultData) setResults(resultData);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const latestResultByEpisode = useMemo(() => {
    const map = new Map<string, Result>();
    results.forEach((result) => {
      if (!map.has(result.episode_id)) {
        map.set(result.episode_id, result);
      }
    });
    return map;
  }, [results]);

  const completedCount = latestResultByEpisode.size;
  const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
  const totalQuestions = results.reduce((sum, r) => sum + r.total_questions, 0);
  const overallAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const streak = calculateStreak(results);
  const motivationMessage = getMotivationMessage(streak, overallAccuracy);

  const lastActivity = results[0]
    ? (() => {
        const date = new Date(results[0].created_at);
        const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
        if (diff === 0) return "Today";
        if (diff === 1) return "Yesterday";
        return `${diff} days ago`;
      })()
    : null;

  function getLevelStats(level: string) {
    const levelEpisodes = episodes.filter((e) => e.level === level);
    const completed = levelEpisodes.filter((e) =>
      latestResultByEpisode.has(e.id)
    ).length;
    const total = levelEpisodes.length;
    const filtered = results.filter((r) => r.level === level);
    const correct = filtered.reduce((sum, r) => sum + r.score, 0);
    const questions = filtered.reduce((sum, r) => sum + r.total_questions, 0);
    const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
    return { completed, total, accuracy };
  }

  const filteredEpisodes = episodes.filter((e) => e.level === selectedLevel);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7eee8] p-10 text-[#3b2f2f]">
        Loading progress...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] px-6 py-10 text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl">

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">My Progress</h1>
            <p className="mt-2 text-[#7a6258]">Track your listening journey.</p>
          </div>
          <button
            onClick={onBack}
            className="rounded-2xl border border-[#e0c7bb] bg-white px-6 py-3 font-semibold shadow-sm"
          >
            Back
          </button>
        </div>

        {/* Motivasyon kartı */}
        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#3b2f2f] p-6 text-white shadow-sm">
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
          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#7a6258]">🔥 Streak</p>
            <h2 className="mt-2 text-4xl font-bold">{streak}</h2>
            <p className="mt-1 text-xs text-[#7a6258]">days</p>
          </div>

          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#7a6258]">🎧 Episodes</p>
            <h2 className="mt-2 text-4xl font-bold">{completedCount}</h2>
            <p className="mt-1 text-xs text-[#7a6258]">completed</p>
          </div>

          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#7a6258]">🎯 Accuracy</p>
            <h2 className="mt-2 text-4xl font-bold">{overallAccuracy}%</h2>
            <p className="mt-1 text-xs text-[#7a6258]">overall</p>
          </div>

          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#7a6258]">✅ Correct</p>
            <h2 className="mt-2 text-4xl font-bold">{totalCorrect}</h2>
            <p className="mt-1 text-xs text-[#7a6258]">answers</p>
          </div>
        </div>

        {/* Seviye ilerleme çubukları */}
        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">Progress by Level</h2>

          <div className="mt-6 flex flex-col gap-5">
            {levels.map((level) => {
              const stats = getLevelStats(level);
              const barWidth =
                stats.total > 0
                  ? Math.round((stats.completed / stats.total) * 100)
                  : 0;

              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedLevel === level
                      ? "border-[#3b2f2f] bg-[#f7eee8]"
                      : "border-[#e0c7bb] bg-white hover:bg-[#fffaf7]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{level}</span>
                      {stats.total > 0 && stats.completed === stats.total && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                          Complete ✓
                        </span>
                      )}
                    </div>
                    <div className="text-right text-sm text-[#7a6258]">
                      {stats.completed}/{stats.total} episodes
                      {stats.accuracy > 0 && (
                        <span className="ml-3 font-semibold text-[#3b2f2f]">
                          {stats.accuracy}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full rounded-full bg-[#f1e3da]">
                    <div
                      className="h-2 rounded-full bg-[#3b2f2f] transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Seçilen seviyenin episode listesi */}
        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">{selectedLevel} Episodes</h2>

          <div className="mt-6 flex flex-col gap-3">
            {filteredEpisodes.length === 0 ? (
              <div className="rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-5 text-[#7a6258]">
                No episodes added for this level yet.
              </div>
            ) : (
              filteredEpisodes.map((episode, index) => {
                const result = latestResultByEpisode.get(episode.id);
                const completed = Boolean(result);
                const accuracy = result
                  ? Math.round((result.score / result.total_questions) * 100)
                  : null;

                return (
                  <button
                    key={episode.id}
                    onClick={() => onSelectEpisode(episode.id)}
                    className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-5 text-left transition hover:-translate-y-0.5 hover:bg-[#f1ded5]"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{completed ? "✅" : "○"}</span>
                      <div>
                        <p className="text-xs text-[#7a6258]">Episode {index + 1}</p>
                        <h3 className="font-bold">{episode.title}</h3>
                        {completed && result && (
                          <p className="mt-0.5 text-xs text-[#7a6258]">
                            {result.score} correct / {result.total_questions - result.score} wrong
                          </p>
                        )}
                      </div>
                    </div>

                    {accuracy !== null && (
                      <div
                        className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                          accuracy >= 80
                            ? "bg-green-100 text-green-700"
                            : accuracy >= 60
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {accuracy}%
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

      </section>
    </main>
  );
}