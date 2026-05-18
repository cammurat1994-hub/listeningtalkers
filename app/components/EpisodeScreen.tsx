"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  selectedLevel: string;
  onSelectEpisode: (episode: string) => void;
  onBack: () => void;
};

type Episode = {
  id: string;
  title: string;
  level: string;
};

export default function EpisodeScreen({
  selectedLevel,
  onSelectEpisode,
  onBack,
}: Props) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEpisodes() {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("level", selectedLevel)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setEpisodes(data);
      }

      setLoading(false);
    }

    fetchEpisodes();
  }, [selectedLevel]);

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold md:text-6xl">
          {selectedLevel} Episodes
        </h1>

        {loading ? (
          <p className="mt-10 text-lg">Loading episodes...</p>
        ) : episodes.length === 0 ? (
          <p className="mt-10 text-lg">
            No episodes found for this level.
          </p>
        ) : (
          <div className="mt-10 flex w-full max-w-2xl flex-col gap-4">
            {episodes.map((episode) => (
              <button
                key={episode.id}
                onClick={() => onSelectEpisode(episode.id)}
                className="rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 text-left text-xl font-bold shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
              >
                {episode.title}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onBack}
          className="mt-8 text-sm font-semibold text-[#7a6258] underline"
        >
          Back to levels
        </button>
      </section>
    </main>
  );
}