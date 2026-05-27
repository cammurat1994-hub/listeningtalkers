"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  selectedLevel: string;
  practiceMode?: string | null;
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

export default function EpisodeScreen({
  selectedLevel,
  practiceMode,
  isQuizMode,
  onSelectEpisode,
  onBack,
}: Props) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEpisodes() {
      let query = supabase
        .from("episodes")
        .select("id, title, level, episode_type")
        .order("created_at", { ascending: true });

      if (isQuizMode) {
        query = query.in("episode_type", ["quiz-ielts", "quiz-toefl", "quiz-toeic", "quiz-celpip"]);
      } else {
        query = query.eq("level", selectedLevel);

        if (practiceMode === "mcq") {
          query = query.eq("episode_type", "practice-mcq");
        } else if (practiceMode === "fill-blank") {
          query = query.eq("episode_type", "practice-fill");
       } else if (practiceMode === "dictation") {
  query = query.eq("episode_type", "practice-dictation");
} else if (practiceMode === "short-answer") {
  query = query.eq("episode_type", "practice-short");
} else if (practiceMode === "matching") {
  query = query.eq("episode_type", "practice-matching");
} else if (practiceMode === "mixed") {
          query = query.in("episode_type", ["practice-mcq", "practice-fill", "practice-dictation"]);
        }
      }

      const { data, error } = await query;
      if (!error && data) setEpisodes(data);
      setLoading(false);
    }

    fetchEpisodes();
  }, [selectedLevel, practiceMode, isQuizMode]);

  function getTypeLabel(type: string) {
    switch (type) {
      case "practice-mcq": return "Multiple Choice";
      case "practice-fill": return "Fill in the Blank";
      case "practice-dictation": return "Dictation";
      case "quiz-ielts": return "IELTS Style";
      case "quiz-toefl": return "TOEFL Style";
      case "quiz-toeic": return "TOEIC Style";
      case "quiz-celpip": return "CELPIP Style";
      default: return type;
    }
  }

  const title = isQuizMode
    ? "Exam Quiz Episodes"
    : `${selectedLevel} — ${practiceMode === "mcq" ? "Multiple Choice" : practiceMode === "fill-blank" ? "Fill in the Blank" : practiceMode === "dictation" ? "Dictation" : "Mixed Practice"}`;

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">{title}</h1>

        {loading ? (
          <p className="mt-10 text-lg">Loading episodes...</p>
        ) : episodes.length === 0 ? (
          <div className="mt-10">
            <p className="text-lg text-[#7a6258]">No episodes found yet.</p>
            <p className="mt-2 text-sm text-[#7a6258]">Check back soon — new content is being added!</p>
          </div>
        ) : (
          <div className="mt-10 flex w-full max-w-2xl flex-col gap-4">
            {episodes.map((episode, index) => (
              <button
                key={episode.id}
                onClick={() => onSelectEpisode(episode.id)}
                className="rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
              >
                <p className="text-xs font-semibold text-[#c9a99a]">
                  Episode {index + 1} — {getTypeLabel(episode.episode_type)}
                </p>
                <p className="mt-1 text-xl font-bold">{episode.title}</p>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onBack}
          className="mt-8 text-sm font-semibold text-[#7a6258] underline"
        >
          Back
        </button>
      </section>
    </main>
  );
}