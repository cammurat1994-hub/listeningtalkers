"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  episodeId: string;
  onBack: () => void;
};

type VocabularyItem = {
  word: string;
  type: string;
  meaning: string;
  audio_url?: string;
};

type Episode = {
  id: string;
  title: string;
  vocabulary: VocabularyItem[];
};

export default function VocabularyScreen({ episodeId, onBack }: Props) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEpisode() {
      const { data, error } = await supabase
        .from("episodes")
        .select("id, title, vocabulary")
        .eq("id", episodeId)
        .single();

      if (!error && data) {
        const sortedVocabulary = [...(data.vocabulary || [])].sort((a, b) =>
          a.word.localeCompare(b.word)
        );

        setEpisode({
          ...data,
          vocabulary: sortedVocabulary,
        });
      }

      setLoading(false);
    }

    fetchEpisode();
  }, [episodeId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7eee8] p-10 text-[#3b2f2f]">
        <p className="text-xl">Loading vocabulary...</p>
      </main>
    );
  }

  if (!episode) {
    return (
      <main className="min-h-screen bg-[#f7eee8] p-10 text-[#3b2f2f]">
        <p className="text-xl">Vocabulary not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">Vocabulary</h1>
            <p className="mt-2 text-[#7a6258]">{episode.title}</p>
          </div>

          <button
            onClick={onBack}
            className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold shadow-sm"
          >
            Back
          </button>
        </div>

        {episode.vocabulary.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-center shadow-sm">
            <p className="text-lg">No vocabulary added for this episode.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4">
            {episode.vocabulary.map((item, index) => (
              <div
                key={`${item.word}-${index}`}
                className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{item.word}</h2>
                  <div className="mt-3 inline-flex rounded-full bg-[#ead7cc] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#3b2f2f]">
  {item.type}
</div>
                  </div>

                  <div className="rounded-2xl bg-white px-5 py-3 text-left md:min-w-[260px]">
                    {item.meaning}
                  </div>
           {item.audio_url && (
  <button
    onClick={() => {
      const audio = new Audio(item.audio_url);
      audio.play();
    }}
    className="mt-4 rounded-2xl bg-[#3b2f2f] px-5 py-3 font-semibold text-white transition hover:bg-[#2f2424]"
  >
    🔊 Listen
  </button>
)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}