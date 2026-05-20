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

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function MyProgressScreen({ onBack, onSelectEpisode }: Props) {
  const [results, setResults] = useState<Result[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("A1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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

  const completedEpisodeIds = Array.from(latestResultByEpisode.keys());

  const filteredEpisodes = episodes.filter(
    (episode) => episode.level === selectedLevel
  );

  const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
  const totalQuestions = results.reduce((sum, r) => sum + r.total_questions, 0);
  const totalWrong = totalQuestions - totalCorrect;

  const overallAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  function getLevelStats(level: string) {
    const filtered = results.filter((r) => r.level === level);

    const correct = filtered.reduce((sum, r) => sum + r.score, 0);
    const total = filtered.reduce((sum, r) => sum + r.total_questions, 0);
    const wrong = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { correct, wrong, accuracy };
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7eee8] p-10 text-[#3b2f2f]">
        Loading progress...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] px-6 py-10 text-[#3b2f2f]">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">My Progress</h1>
            <p className="mt-3 text-[#7a6258]">
              Track your listening journey and continue from where you left off.
            </p>
          </div>

          <button
            onClick={onBack}
            className="rounded-2xl border border-[#e0c7bb] bg-white px-6 py-3 font-semibold shadow-sm"
          >
            Back
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#7a6258]">Completed Episodes</p>
            <h2 className="mt-2 text-4xl font-bold">
              {completedEpisodeIds.length}
            </h2>
          </div>

          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#7a6258]">Overall Accuracy</p>
            <h2 className="mt-2 text-4xl font-bold">{overallAccuracy}%</h2>
          </div>

          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#7a6258]">Correct Answers</p>
            <h2 className="mt-2 text-4xl font-bold">{totalCorrect}</h2>
          </div>

          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#7a6258]">Wrong Answers</p>
            <h2 className="mt-2 text-4xl font-bold">{totalWrong}</h2>
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-bold">Continue Learning</h2>

          <div className="mt-6 flex flex-wrap gap-3">
            {levels.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`rounded-2xl px-6 py-3 font-bold transition ${
                  selectedLevel === level
                    ? "bg-[#3b2f2f] text-white"
                    : "border border-[#e0c7bb] bg-[#fffaf7]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {filteredEpisodes.length === 0 ? (
              <div className="rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-6 text-[#7a6258]">
                No episodes added for this level yet.
              </div>
            ) : (
              filteredEpisodes.map((episode, index) => {
                const result = latestResultByEpisode.get(episode.id);
                const completed = Boolean(result);

                return (
                  <button
                    key={episode.id}
                    onClick={() => onSelectEpisode(episode.id)}
                    className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-[#7a6258]">
                          Episode {index + 1}
                        </p>

                        <h3 className="text-2xl font-bold">{episode.title}</h3>

                        <p className="mt-2 text-sm text-[#7a6258]">
                          {completed
                            ? `${result?.score} correct / ${
                                (result?.total_questions || 0) -
                                (result?.score || 0)
                              } wrong`
                            : "Not completed yet"}
                        </p>
                      </div>

                      <span className="text-2xl">{completed ? "✅" : "○"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-bold">Score by Level</h2>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-[#ead7cc] text-left">
                  <th className="pb-4">Level</th>
                  <th className="pb-4">Accuracy</th>
                  <th className="pb-4">Correct</th>
                  <th className="pb-4">Wrong</th>
                </tr>
              </thead>

              <tbody>
                {levels.map((level) => {
                  const stats = getLevelStats(level);

                  return (
                   <tr
  key={level}
  onClick={() => setSelectedLevel(level)}
  className="cursor-pointer border-b border-[#f1e3da] transition hover:bg-[#fffaf7]"
>
                      <td className="py-4 font-bold">{level}</td>
                      <td className="py-4">{stats.accuracy}%</td>
                      <td className="py-4">{stats.correct}</td>
                      <td className="py-4">{stats.wrong}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-8">
  <h3 className="text-2xl font-bold">
    {selectedLevel} Episode Details
  </h3>

  <div className="mt-4 grid gap-3">
    {filteredEpisodes.length === 0 ? (
      <div className="rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-5 text-[#7a6258]">
        No episodes found for this level.
      </div>
    ) : (
      filteredEpisodes.map((episode, index) => {
        const result = latestResultByEpisode.get(episode.id);

        return (
          <div
            key={episode.id}
            className="rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold">
                  Episode {index + 1} — {episode.title}
                </h4>

                <p className="mt-1 text-sm text-[#7a6258]">
                  {result ? "✅ Completed" : "○ Not Completed"}
                </p>
              </div>

              {result ? (
                <div className="text-right text-sm">
                  <p>{result.score} Correct</p>
                  <p>
                    {result.total_questions - result.score} Wrong
                  </p>
                  <p className="font-bold">
                    {Math.round(
                      (result.score / result.total_questions) * 100
                    )}
                    %
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#7a6258]">
                  No score yet
                </p>
              )}
            </div>
          </div>
        );
      })
    )}
  </div>
</div>
          </div>
        </div>
      </section>
    </main>
  );
}