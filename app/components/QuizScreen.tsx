"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  episodeId: string;
  onBack: () => void;
};

type Question = {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
};

type Episode = {
  id: string;
  title: string;
  level: string;
  audio_url: string;
  questions: Question[];
};

export default function QuizScreen({ episodeId, onBack }: Props) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [notes, setNotes] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  useEffect(() => {
    async function fetchEpisode() {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", episodeId)
        .single();

      if (!error && data) {
        setEpisode(data);
      }

      setLoading(false);
    }

    fetchEpisode();
  }, [episodeId]);

  function calculateScore() {
    if (!episode) return 0;

    let score = 0;

    episode.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score++;
      }
    });

    return score;
  }

  async function saveResult() {
    if (!episode || resultSaved) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) return;

    await supabase.from("user_results").insert([
      {
        user_email: user.email,
        episode_id: episode.id,
        episode_title: episode.title,
        level: episode.level,
        score: calculateScore(),
        total_questions: episode.questions.length,
      },
    ]);

    setResultSaved(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7eee8] p-10">
        <p className="text-xl">Loading episode...</p>
      </main>
    );
  }

  if (!episode) {
    return (
      <main className="min-h-screen bg-[#f7eee8] p-10">
        <p className="text-xl">Episode not found.</p>
      </main>
    );
  }

  const question = episode.questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage =
    (answeredCount / episode.questions.length) * 100;

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">
              {episode.title}
            </h1>

            <p className="mt-2 text-[#7a6258]">
              Listen carefully, take notes, and answer step by step.
            </p>
          </div>

          <button
            onClick={onBack}
            className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold shadow-sm"
          >
            Back
          </button>
        </div>

        {!testStarted && (
          <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
            <audio controls className="w-full">
              <source src={episode.audio_url} type="audio/mpeg" />
            </audio>

            <button
              onClick={() => setTestStarted(true)}
              className="mt-6 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white"
            >
              Start Questions
            </button>
          </div>
        )}

        <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
          <label className="block text-lg font-bold">My Notes</label>

          <p className="mt-1 text-sm text-[#7a6258]">
            You can take notes while listening and use them while answering.
          </p>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your notes here..."
            className="mt-4 min-h-[160px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4"
          />
        </div>

        {testStarted && !showResults && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#7a6258]">
              Question {currentQuestion + 1} of {episode.questions.length}
            </p>

            <div className="mt-3 h-3 w-full rounded-full bg-[#ead7cc]">
              <div
                className="h-3 rounded-full bg-[#3b2f2f] transition-all"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {episode.questions.map((_, index) => {
                const isCurrent = currentQuestion === index;
                const isAnswered = Boolean(answers[index]);

                return (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`h-10 w-10 rounded-full text-sm font-bold transition ${
                      isCurrent
                        ? "bg-[#3b2f2f] text-white"
                        : isAnswered
                        ? "bg-[#ead7cc] text-[#3b2f2f]"
                        : "border border-[#e0c7bb] bg-white text-[#7a6258]"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              {question.question}
            </h2>

            <div className="mt-6 flex flex-col gap-3">
              {(["A", "B", "C", "D", "E"] as const).map((letter) => (
                <button
                  key={letter}
                  onClick={() =>
                    setAnswers({
                      ...answers,
                      [currentQuestion]: letter,
                    })
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    answers[currentQuestion] === letter
                      ? "border-[#3b2f2f] bg-[#ead7cc]"
                      : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"
                  }`}
                >
                  <span className="font-bold">{letter}.</span>{" "}
                  {question.options[letter]}
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-between gap-4">
              <button
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                className="rounded-2xl border border-[#e0c7bb] bg-white px-6 py-3 font-semibold disabled:opacity-30"
              >
                Previous
              </button>

              {currentQuestion < episode.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white"
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setShowResults(true);
                    await saveResult();
                  }}
                  className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white"
                >
                  Finish Test
                </button>
              )}
            </div>
          </div>
        )}

        {showResults && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 shadow-sm">
            <div className="text-center">
              <h2 className="text-4xl font-bold">Your Score</h2>

              <p className="mt-4 text-5xl font-bold">
                {calculateScore()} / {episode.questions.length}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              {episode.questions.map((item, index) => {
                const isCorrect = answers[index] === item.correctAnswer;

                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-[#e0c7bb] bg-white p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xl font-bold">
                        Question {index + 1}
                      </h3>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-bold ${
                          isCorrect
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isCorrect ? "Correct" : "Wrong"}
                      </span>
                    </div>

                    <p className="mt-3 text-[#3b2f2f]">{item.question}</p>

                    <p className="mt-3 text-sm text-[#7a6258]">
                      Your answer: {answers[index] || "No answer"}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#7a6258]">
                      Correct answer: {item.correctAnswer}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => alert("Vocabulary review will open from here 😄")}
              className="mt-8 w-full rounded-2xl border border-[#3b2f2f] bg-white px-6 py-4 font-semibold text-[#3b2f2f]"
            >
              Study Vocabulary
            </button>

            <button
              onClick={onBack}
              className="mt-4 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white"
            >
              Back to Episode
            </button>
          </div>
        )}
      </section>
    </main>
  );
}