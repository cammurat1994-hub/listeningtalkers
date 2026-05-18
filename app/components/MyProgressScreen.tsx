"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  onBack: () => void;
};

type Result = {
  id: string;
  episode_title: string;
  level: string;
  score: number;
  total_questions: number;
  created_at: string;
};

export default function MyProgressScreen({
  onBack,
}: Props) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  async function fetchResults() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_results")
      .select("*")
      .eq("user_email", user.email)
      .order("created_at", {
        ascending: false,
      });

    if (!error && data) {
      setResults(data);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">
              My Progress
            </h1>

            <p className="mt-2 text-[#7a6258]">
              Your completed listening quizzes.
            </p>
          </div>

          <button
            onClick={onBack}
            className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold shadow-sm"
          >
            Back
          </button>
        </div>

        {loading ? (
          <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-sm">
            Loading...
          </div>
        ) : results.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-sm">
            No quiz results yet.
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="rounded-[2rem] border border-[#e0c7bb] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-[#7a6258]">
                      {result.level}
                    </p>

                    <h2 className="text-2xl font-bold">
                      {result.episode_title}
                    </h2>

                    <p className="mt-2 text-sm text-[#7a6258]">
                      {new Date(
                        result.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#ead7cc] px-6 py-4 text-center">
                    <p className="text-sm text-[#7a6258]">
                      Score
                    </p>

                    <p className="text-3xl font-bold">
                      {result.score} /{" "}
                      {result.total_questions}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}