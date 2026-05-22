"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  episodeId: string;
  practiceMode: "mcq" | "fill-blank" | "dictation" | "mixed" | null;
  isQuizMode: boolean;
  onBack: () => void;
  onNextEpisode: (nextEpisodeId: string) => void;
  onStudyVocabulary: () => void;
};

type MCQQuestion = {
  question: string;
  options: { A: string; B: string; C: string; D: string; E: string };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanations: { A: string; B: string; C: string; D: string; E: string };
};

type FillQuestion = {
  text: string;
  blanks: { index: number; answer: string }[];
};

type DictationQuestion = {
  sentence: string;
};

type Episode = {
  id: string;
  title: string;
  level: string;
  audio_url: string;
  episode_type: string;
  questions: (MCQQuestion | FillQuestion | DictationQuestion)[];
};

function normalize(str: string) {
  return str.toLowerCase().trim().replace(/[.,!?;:'"]/g, "");
}

export default function QuizScreen({
  episodeId,
  practiceMode,
  isQuizMode,
  onBack,
  onNextEpisode,
}: Props) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [nextEpisode, setNextEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [showStartWarning, setShowStartWarning] = useState(false);
  const [notes, setNotes] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // MCQ state
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [mcqFeedback, setMcqFeedback] = useState<Record<number, boolean>>({});

  // Fill state
  const [fillAnswers, setFillAnswers] = useState<Record<number, Record<number, string>>>({});
  const [fillFeedback, setFillFeedback] = useState<Record<number, Record<number, boolean | null>>>({});

  // Dictation state
  const [dictationAnswer, setDictationAnswer] = useState("");
  const [dictationFeedback, setDictationFeedback] = useState<boolean | null>(null);
  const [dictationRevealed, setDictationRevealed] = useState(false);

  const [showResults, setShowResults] = useState(false);
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
        const { data: allEpisodes } = await supabase
          .from("episodes")
          .select("id, title, level, audio_url, episode_type, questions")
          .eq("level", data.level)
          .eq("episode_type", data.episode_type)
          .order("created_at", { ascending: true });

        if (allEpisodes) {
          const idx = allEpisodes.findIndex((e) => e.id === episodeId);
          if (idx !== -1 && idx < allEpisodes.length - 1) {
            setNextEpisode(allEpisodes[idx + 1]);
          }
        }
      }
      setLoading(false);
    }
    fetchEpisode();
  }, [episodeId]);

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }

  function calculateScore() {
    if (!episode) return { correct: 0, total: 0 };
    let correct = 0;
    let total = 0;

    episode.questions.forEach((q, i) => {
      const type = episode.episode_type;
      if (type === "practice-mcq" || type?.startsWith("quiz-")) {
        const mcq = q as MCQQuestion;
        total++;
        if (mcqAnswers[i] === mcq.correctAnswer) correct++;
      } else if (type === "practice-fill") {
        const fill = q as FillQuestion;
        fill.blanks.forEach((b, bi) => {
          total++;
          if (fillFeedback[i]?.[bi] === true) correct++;
        });
      } else if (type === "practice-dictation") {
        total++;
        if (dictationFeedback === true) correct++;
      }
    });

    return { correct, total };
  }

  async function saveResult() {
    if (!episode || resultSaved) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { correct, total } = calculateScore();
    await supabase.from("user_results").insert([{
      user_email: user.email,
      episode_id: episode.id,
      episode_title: episode.title,
      level: episode.level,
      score: correct,
      total_questions: total,
    }]);
    setResultSaved(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7eee8] flex items-center justify-center">
        <p className="text-xl text-[#3b2f2f]">Loading...</p>
      </main>
    );
  }

  if (!episode) {
    return (
      <main className="min-h-screen bg-[#f7eee8] flex items-center justify-center">
        <p className="text-xl text-[#3b2f2f]">Episode not found.</p>
      </main>
    );
  }

  const questions = episode.questions || [];
  const question = questions[currentQuestion];
  const episodeType = episode.episode_type;

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-3xl px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#7a6258]">{episode.level}</p>
            <h1 className="text-3xl font-bold md:text-4xl">{episode.title}</h1>
          </div>
          <button onClick={onBack} className="shrink-0 rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold shadow-sm">
            Back
          </button>
        </div>

        {/* Audio Player */}
        {!testStarted && (
          <div className="mt-8">
            <audio
              ref={audioRef}
              src={episode.audio_url}
              onTimeUpdate={() => {
                const audio = audioRef.current;
                if (audio) setAudioProgress((audio.currentTime / audio.duration) * 100);
              }}
              onLoadedMetadata={() => {
                const audio = audioRef.current;
                if (audio) setAudioDuration(audio.duration);
              }}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 shadow-sm">
              <div className="flex flex-col items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#3b2f2f] shadow-lg">
                  <img src="/cat-logo.svg" alt="" className="h-14 w-14 object-contain" />
                </div>

                <div className="text-center">
                  <p className="text-lg font-bold">{episode.title}</p>
                  <p className="text-sm text-[#7a6258]">{episode.level}</p>
                </div>

                <div className="w-full">
                  <div
                    className="relative h-2 w-full cursor-pointer rounded-full bg-[#ead7cc]"
                    onClick={(e) => {
                      const audio = audioRef.current;
                      if (!audio) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pct = x / rect.width;
                      audio.currentTime = pct * audio.duration;
                    }}
                  >
                    <div
                      className="h-2 rounded-full bg-[#3b2f2f] transition-all"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-[#7a6258]">
                    <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                </div>

                <button
                  onClick={toggleAudio}
                  className="flex items-center gap-3 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-bold text-white transition hover:bg-[#2f2424]"
                >
                  {isPlaying ? (
                    <>
                      <span className="text-xl">⏸</span> Pause
                    </>
                  ) : (
                    <>
                      <span className="text-xl">▶</span> Start Listening
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
              <p className="font-bold">📝 My Notes</p>
              <p className="mt-1 text-sm text-[#7a6258]">Take notes while listening. You can refer to them while answering.</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your notes here..."
                className="mt-3 min-h-[120px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4"
              />
            </div>

            {/* Start button */}
            {!showStartWarning ? (
              <button
                onClick={() => setShowStartWarning(true)}
                className="mt-6 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424]"
              >
                I have listened — Start Questions
              </button>
            ) : (
              <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-white p-5">
                <p className="font-semibold">⚠️ Before you start</p>
                <p className="mt-2 text-sm text-[#7a6258]">
                  The audio will not be available during the questions. Make sure you have taken your notes.
                </p>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setShowStartWarning(false)} className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3 font-semibold">
                    Go Back
                  </button>
                  <button onClick={() => setTestStarted(true)} className="flex-1 rounded-2xl bg-[#3b2f2f] px-4 py-3 font-semibold text-white">
                    Yes, I'm Ready
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Questions */}
        {testStarted && !showResults && question && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#7a6258]">
                Question {currentQuestion + 1} of {questions.length}
              </p>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full ${i === currentQuestion ? "bg-[#3b2f2f]" : i < currentQuestion ? "bg-[#c9a99a]" : "bg-[#e0c7bb]"}`} />
                ))}
              </div>
            </div>

            {/* MCQ */}
            {(episodeType === "practice-mcq" || episodeType?.startsWith("quiz-")) && (
              <MCQQuestionView
                question={question as MCQQuestion}
                index={currentQuestion}
                answer={mcqAnswers[currentQuestion]}
                feedback={mcqFeedback[currentQuestion]}
                onAnswer={(letter) => {
                  if (mcqFeedback[currentQuestion] !== undefined) return;
                  const isCorrect = letter === (question as MCQQuestion).correctAnswer;
                  setMcqAnswers({ ...mcqAnswers, [currentQuestion]: letter });
                  setMcqFeedback({ ...mcqFeedback, [currentQuestion]: isCorrect });
                }}
              />
            )}

            {/* Fill in the Blank */}
            {episodeType === "practice-fill" && (
              <FillQuestionView
                question={question as FillQuestion}
                index={currentQuestion}
                answers={fillAnswers[currentQuestion] || {}}
                feedback={fillFeedback[currentQuestion] || {}}
                onCheck={(blanksAnswers) => {
                  const fb: Record<number, boolean> = {};
                  (question as FillQuestion).blanks.forEach((b, bi) => {
                    fb[bi] = normalize(blanksAnswers[bi] || "") === normalize(b.answer);
                  });
                  setFillAnswers({ ...fillAnswers, [currentQuestion]: blanksAnswers });
                  setFillFeedback({ ...fillFeedback, [currentQuestion]: fb });
                }}
                onUpdate={(blanksAnswers) => {
                  setFillAnswers({ ...fillAnswers, [currentQuestion]: blanksAnswers });
                }}
              />
            )}

            {/* Dictation */}
            {episodeType === "practice-dictation" && (
              <DictationQuestionView
                question={question as DictationQuestion}
                answer={dictationAnswer}
                feedback={dictationFeedback}
                revealed={dictationRevealed}
                onChange={setDictationAnswer}
                onCheck={() => {
                  const isCorrect = normalize(dictationAnswer) === normalize((question as DictationQuestion).sentence);
                  setDictationFeedback(isCorrect);
                }}
                onReveal={() => setDictationRevealed(true)}
                onRetry={() => {
                  setDictationAnswer("");
                  setDictationFeedback(null);
                  setDictationRevealed(false);
                }}
              />
            )}

            {/* Navigation */}
            <div className="mt-6 flex justify-between gap-4">
              <button
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                className="rounded-2xl border border-[#e0c7bb] bg-white px-6 py-3 font-semibold disabled:opacity-30"
              >
                Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => {
                    setCurrentQuestion(currentQuestion + 1);
                    setDictationAnswer("");
                    setDictationFeedback(null);
                    setDictationRevealed(false);
                  }}
                  className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white"
                >
                  Next Question →
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setShowResults(true);
                    await saveResult();
                  }}
                  className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white"
                >
                  Finish ✓
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 shadow-sm">
            {(() => {
              const { correct, total } = calculateScore();
              const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
              return (
                <div className="text-center">
                  <h2 className="text-4xl font-bold">Well done!</h2>
                  <p className="mt-4 text-6xl font-bold">{correct} / {total}</p>
                  <p className="mt-2 text-lg text-[#7a6258]">{pct}% accuracy</p>
                  <p className="mt-3 text-sm text-[#7a6258]">
                    {pct >= 80 ? "🎯 Excellent work!" : pct >= 60 ? "📈 Good job, keep practicing!" : "💪 Keep going, you'll improve!"}
                  </p>
                </div>
              );
            })()}

            <div className="mt-8 flex flex-col gap-3">
              {nextEpisode && (
                <button
                  onClick={() => onNextEpisode(nextEpisode.id)}
                  className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424]"
                >
                  Next Episode →
                </button>
              )}
              <button
                onClick={onBack}
                className="w-full rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f]"
              >
                Back to Episodes
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MCQQuestionView({
  question, answer, feedback, onAnswer,
}: {
  question: MCQQuestion;
  index: number;
  answer?: string;
  feedback?: boolean;
  onAnswer: (letter: string) => void;
}) {
  const answered = feedback !== undefined;

  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <p className="text-xl font-bold">{question.question}</p>
      <div className="mt-5 flex flex-col gap-3">
        {(["A", "B", "C", "D", "E"] as const).map((letter) => {
          const isSelected = answer === letter;
          const isCorrect = question.correctAnswer === letter;
          const showCorrect = answered && isCorrect;
          const showWrong = answered && isSelected && !isCorrect;

          return (
            <button
              key={letter}
              onClick={() => onAnswer(letter)}
              disabled={answered}
              className={`rounded-2xl border p-4 text-left transition ${
                showCorrect ? "border-green-400 bg-green-50" :
                showWrong ? "border-red-400 bg-red-50" :
                isSelected ? "border-[#3b2f2f] bg-[#ead7cc]" :
                "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">{letter}.</span>
                <span>{question.options[letter]}</span>
                {showCorrect && <span className="ml-auto text-green-600 font-bold">✓</span>}
                {showWrong && <span className="ml-auto text-red-600 font-bold">✗</span>}
              </div>
              {answered && (showCorrect || showWrong) && question.explanations?.[letter] && (
                <p className="mt-2 text-sm text-[#7a6258]">💡 {question.explanations[letter]}</p>
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${feedback ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {feedback ? "✓ Correct!" : `✗ Wrong. Correct answer: ${question.correctAnswer}`}
        </div>
      )}
    </div>
  );
}

function FillQuestionView({
  question, answers, feedback, onCheck, onUpdate,
}: {
  question: FillQuestion;
  index: number;
  answers: Record<number, string>;
  feedback: Record<number, boolean | null>;
  onCheck: (answers: Record<number, string>) => void;
  onUpdate: (answers: Record<number, string>) => void;
}) {
  const checked = Object.keys(feedback).length > 0;
  let blankIndex = 0;
  const parts = question.text.split("___");

  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <div className="text-lg leading-10">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (() => {
              const bi = blankIndex++;
              const fb = feedback[bi];
              return (
                <input
                  type="text"
                  value={answers[bi] || ""}
                  onChange={(e) => {
                    if (checked) return;
                    onUpdate({ ...answers, [bi]: e.target.value });
                  }}
                  disabled={checked}
                  className={`mx-1 inline-block w-28 rounded-xl border px-2 py-1 text-center text-sm font-semibold ${
                    fb === true ? "border-green-400 bg-green-50 text-green-700" :
                    fb === false ? "border-red-400 bg-red-50 text-red-700" :
                    "border-[#3b2f2f] bg-white"
                  }`}
                />
              );
            })()}
          </span>
        ))}
      </div>

      {checked && (
        <div className="mt-4 flex flex-col gap-2">
          {question.blanks.map((b, bi) => (
            <p key={bi} className={`text-sm font-semibold ${feedback[bi] ? "text-green-600" : "text-red-600"}`}>
              {feedback[bi] ? `✓ Blank ${bi + 1}: correct` : `✗ Blank ${bi + 1}: correct answer is "${b.answer}"`}
            </p>
          ))}
        </div>
      )}

      {!checked && (
        <button
          onClick={() => onCheck(answers)}
          className="mt-5 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white"
        >
          Check Answers
        </button>
      )}
    </div>
  );
}

function DictationQuestionView({
  question, answer, feedback, revealed, onChange, onCheck, onReveal, onRetry,
}: {
  question: DictationQuestion;
  answer: string;
  feedback: boolean | null;
  revealed: boolean;
  onChange: (v: string) => void;
  onCheck: () => void;
  onReveal: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <p className="font-bold text-lg">🎙️ Type exactly what you hear</p>
      <p className="mt-2 text-sm text-[#7a6258]">Listen carefully and write the sentence word for word.</p>

      <textarea
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        disabled={feedback !== null}
        placeholder="Type what you heard..."
        className={`mt-4 min-h-[100px] w-full rounded-2xl border p-4 ${
          feedback === true ? "border-green-400 bg-green-50" :
          feedback === false ? "border-red-400 bg-red-50" :
          "border-[#e0c7bb] bg-white"
        }`}
      />

      {feedback === null && (
        <button onClick={onCheck} className="mt-4 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">
          Check
        </button>
      )}

      {feedback === true && (
        <div className="mt-4 rounded-2xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
          ✓ Perfect! Exactly right.
        </div>
      )}

      {feedback === false && !revealed && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
            ✗ Not quite right. Try again or see the answer.
          </div>
          <div className="flex gap-3">
            <button onClick={onRetry} className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3 font-semibold">
              Try Again
            </button>
            <button onClick={onReveal} className="flex-1 rounded-2xl bg-[#3b2f2f] px-4 py-3 font-semibold text-white">
              Show Answer
            </button>
          </div>
        </div>
      )}

      {revealed && (
        <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
          <p className="text-sm text-[#7a6258]">Correct answer:</p>
          <p className="mt-1 font-semibold">{question.sentence}</p>
        </div>
      )}
    </div>
  );
}