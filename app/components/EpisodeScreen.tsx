"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  selectedLevel: string;
  practiceMode?: "mcq" | "fill-blank" | "dictation" | "short-answer" | "matching" | null;
  isQuizMode?: boolean;
  onSelectEpisode: (episode: string) => void;
  onBack: () => void;
};

type Episode = {
  id: string;
  title: string;
  level: string;
  episode_type: string;
};

type CompletedEpisode = {
  episode_id: string;
  score: number;
  total_questions: number;
};

const TYPE_LABELS: Record<string, string> = {
  "practice-mcq": "Multiple Choice",
  "practice-fill": "Fill in the Blank",
  "practice-dictation": "Dictation",
  "practice-short": "Short Answer",
  "practice-matching": "Matching",
  "quiz-ielts": "IELTS Style",
  "quiz-toefl": "TOEFL Style",
  "quiz-toeic": "TOEIC Style",
  "quiz-celpip": "CELPIP Style",
};

const TYPE_EMOJI: Record<string, string> = {
  "practice-mcq": "🔤",
  "practice-fill": "✏️",
  "practice-dictation": "🎙️",
  "practice-short": "✍️",
  "practice-matching": "🔗",
  "quiz-ielts": "📝",
  "quiz-toefl": "📝",
  "quiz-toeic": "📝",
  "quiz-celpip": "📝",
};

const LEVEL_COLORS: Record<string, string> = {
  "Beginner": "bg-green-100 text-green-700",
  "Intermediate": "bg-yellow-100 text-yellow-700",
  "Advanced": "bg-red-100 text-red-700",
};

export default function EpisodeScreen({ selectedLevel, practiceMode, isQuizMode, onSelectEpisode, onBack }: Props) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [completed, setCompleted] = useState<CompletedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      let query = supabase
        .from("episodes")
        .select("id, title, level, episode_type")
        .order("created_at", { ascending: true });

      if (isQuizMode) {
        query = query.in("episode_type", ["quiz-ielts", "quiz-toefl", "quiz-toeic", "quiz-celpip"]);
      } else {
        query = query.eq("level", selectedLevel);
        if (practiceMode === "mcq") query = query.eq("episode_type", "practice-mcq");
        else if (practiceMode === "fill-blank") query = query.eq("episode_type", "practice-fill");
        else if (practiceMode === "dictation") query = query.eq("episode_type", "practice-dictation");
        else if (practiceMode === "short-answer") query = query.eq("episode_type", "practice-short");
        else if (practiceMode === "matching") query = query.eq("episode_type", "practice-matching");
      }

      const { data, error } = await query;
      if (!error && data) setEpisodes(data);

      // Tamamlanan episodeları çek
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: results } = await supabase
          .from("user_results")
          .select("episode_id, score, total_questions")
          .eq("user_email", user.email);
        if (results) setCompleted(results);
      }

      setLoading(false);
    }
    fetchData();
  }, [selectedLevel, practiceMode, isQuizMode]);

  function getModeTitle() {
    if (isQuizMode) return "Exam Quiz";
    const labels: Record<string, string> = {
      "mcq": "Multiple Choice",
      "fill-blank": "Fill in the Blank",
      "dictation": "Dictation",
      "short-answer": "Short Answer",
      "matching": "Matching",
    };
    return `${selectedLevel} — ${labels[practiceMode || ""] || "Practice"}`;
  }

  function getCompletionData(episodeId: string) {
    const result = completed.find(c => c.episode_id === episodeId);
    if (!result) return null;
    const pct = result.total_questions > 0 ? Math.round((result.score / result.total_questions) * 100) : 0;
    return { score: result.score, total: result.total_questions, pct };
  }

  const filteredEpisodes = episodes.filter(ep =>
    ep.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = episodes.filter(ep => completed.some(c => c.episode_id === ep.id)).length;

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-4xl px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#7a6258] hover:text-[#3b2f2f]">
              ← Back
            </button>
            <h1 className="text-4xl font-bold">{getModeTitle()}</h1>
            <p className="mt-2 text-[#7a6258]">
              {episodes.length} episodes
              {completedCount > 0 && (
                <span className="ml-2 rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                  {completedCount} completed
                </span>
              )}
            </p>
          </div>

          {/* Progress ring */}
          {episodes.length > 0 && completedCount > 0 && (
            <div className="shrink-0 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] px-6 py-4 text-center shadow-sm">
              <p className="text-3xl font-bold">{Math.round((completedCount / episodes.length) * 100)}%</p>
              <p className="text-xs text-[#7a6258]">completed</p>
            </div>
          )}
        </div>

        {/* Search */}
        {episodes.length > 5 && (
          <div className="mt-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search episodes..."
              className="w-full rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 text-sm shadow-sm"
            />
          </div>
        )}

        {/* Episode list */}
        {loading ? (
          <div className="mt-12 flex flex-col items-center gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 w-full animate-pulse rounded-[2rem] bg-[#ead7cc]" />
            ))}
          </div>
        ) : filteredEpisodes.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-5xl">🎧</p>
            <p className="mt-4 text-lg font-semibold">No episodes found</p>
            <p className="mt-2 text-sm text-[#7a6258]">Check back soon — new content is being added regularly!</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {filteredEpisodes.map((episode, index) => {
              const completion = getCompletionData(episode.id);
              const isCompleted = !!completion;

              return (
                <button
                  key={episode.id}
                  onClick={() => onSelectEpisode(episode.id)}
                  className={`group flex items-center gap-5 rounded-[2rem] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isCompleted
                      ? "border-green-200 bg-green-50 hover:bg-green-100"
                      : "border-[#e0c7bb] bg-[#fffaf7] hover:bg-white"
                  }`}
                >
                  {/* Number / Check */}
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                    isCompleted ? "bg-green-500 text-white" : "bg-[#ead7cc] text-[#3b2f2f]"
                  }`}>
                    {isCompleted ? "✓" : index + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[#7a6258]">
                        {TYPE_EMOJI[episode.episode_type]} {TYPE_LABELS[episode.episode_type]}
                      </span>
                      {episode.level && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_COLORS[episode.level] || "bg-[#ead7cc] text-[#3b2f2f]"}`}>
                          {episode.level}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-bold truncate">{episode.title}</p>

                    {/* Score bar */}
                    {completion && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-green-200">
                          <div
                            className="h-1.5 rounded-full bg-green-500 transition-all"
                            style={{ width: `${completion.pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-green-700">{completion.pct}%</span>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 text-[#c9a99a] transition group-hover:translate-x-1 group-hover:text-[#3b2f2f]">
                    →
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </section>
    </main>
  );
}