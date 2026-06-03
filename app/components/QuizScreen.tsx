"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  episodeId: string;
  practiceMode: "mcq" | "fill-blank" | "dictation" | "short-answer" | "matching" | null;
  isQuizMode: boolean;
  onBack: () => void;
  onNextEpisode: (nextEpisodeId: string) => void;
  onStudyVocabulary: () => void;
};

type MCQQuestion = {
  question: string;
  options: { A: string; B: string; C: string; D: string; E: string };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation?: string;
};

type FillQuestion = {
  text: string;
  blanks: { index: number; answer: string }[];
};

type DictationQuestion = {
  sentence: string;
};

type ShortAnswerQuestion = {
  question: string;
  answer: string;
  hint?: string;
};

type MatchingQuestion = {
  pairs: { left: string; right: string }[];
};

type Episode = {
  id: string;
  title: string;
  level: string;
  audio_url: string;
  episode_type: string;
  show_notes: boolean;
  questions: (MCQQuestion | FillQuestion | DictationQuestion | ShortAnswerQuestion | MatchingQuestion)[];
};

type Comment = {
  id: string;
  episode_id: string;
  user_email: string;
  content: string;
  created_at: string;
  parent_id: string | null;
};

function normalize(str: string) {
  return str.toLowerCase().trim().replace(/[.,!?;:'"]/g, "");
}

function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalize(userAnswer);
  const variants = correctAnswer.split("|").map(normalize);
  return variants.some((v) => v === normalizedUser);
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AudioPlayer({ isPlaying, progress, duration, audioRef, onToggle, title, level }: {
  isPlaying: boolean;
  progress: number;
  duration: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onToggle: () => void;
  title: string;
  level: string;
}) {
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3b2f2f] shadow-lg">
          <img src="/cat-logo.svg" alt="" className="h-11 w-11 object-contain" />
        </div>
        <div className="text-center">
          <p className="font-bold">{title}</p>
          <p className="text-sm text-[#7a6258]">{level}</p>
        </div>
        <div className="w-full">
          <div className="relative h-2 w-full cursor-pointer rounded-full bg-[#ead7cc]"
            onClick={(e) => {
              const audio = audioRef.current;
              if (!audio) return;
              const rect = e.currentTarget.getBoundingClientRect();
              audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
            }}
          >
            <div className="h-2 rounded-full bg-[#3b2f2f] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-[#7a6258]">
            <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <button onClick={onToggle} className="flex items-center gap-3 rounded-2xl bg-[#3b2f2f] px-8 py-3 font-bold text-white transition hover:bg-[#2f2424]">
          {isPlaying ? <><span>⏸</span> Pause</> : <><span>▶</span> Start Listening</>}
        </button>
      </div>
    </div>
  );
}

function CommentsPanel({ episodeId, userEmail }: { episodeId: string; userEmail: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [episodeId]);

  async function fetchComments() {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("episode_id", episodeId)
      .order("created_at", { ascending: true });
    if (!error && data) setComments(data);
    setLoading(false);
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    await supabase.from("comments").insert([{
      episode_id: episodeId,
      user_email: userEmail,
      content: newComment.trim(),
      parent_id: null,
    }]);
    setNewComment("");
    await fetchComments();
    setSubmitting(false);
  }

  async function submitReply(parentId: string) {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await supabase.from("comments").insert([{
      episode_id: episodeId,
      user_email: userEmail,
      content: replyText.trim(),
      parent_id: parentId,
    }]);
    setReplyText("");
    setReplyTo(null);
    await fetchComments();
    setSubmitting(false);
  }

  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const getInitial = (email: string) => email.charAt(0).toUpperCase();
  const getDisplayName = (email: string) => email.split("@")[0];

  return (
    <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <h3 className="text-lg font-bold">💬 Discussion</h3>
      <p className="mt-1 text-sm text-[#7a6258]">Ask questions or share tips about this episode.</p>

      {/* New comment */}
      <div className="mt-5">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm"
        />
        <button
          onClick={submitComment}
          disabled={submitting || !newComment.trim()}
          className="mt-2 rounded-2xl bg-[#3b2f2f] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Posting..." : "Post Comment"}
        </button>
      </div>

      {/* Comments list */}
      {loading ? (
        <p className="mt-4 text-sm text-[#7a6258]">Loading comments...</p>
      ) : topLevel.length === 0 ? (
        <p className="mt-4 text-sm text-[#7a6258]">No comments yet. Be the first!</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <div className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">
                    {getInitial(comment.user_email)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{getDisplayName(comment.user_email)}</p>
                      <p className="text-xs text-[#7a6258]">{formatDate(comment.created_at)}</p>
                    </div>
                    <p className="mt-1 text-sm text-[#3b2f2f]">{comment.content}</p>
                    <button
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="mt-2 text-xs font-semibold text-[#7a6258] hover:text-[#3b2f2f]"
                    >
                      {replyTo === comment.id ? "Cancel" : "Reply"}
                    </button>
                  </div>
                </div>

                {/* Reply input */}
                {replyTo === comment.id && (
                  <div className="mt-3 ml-11">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-[60px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm"
                    />
                    <button
                      onClick={() => submitReply(comment.id)}
                      disabled={submitting || !replyText.trim()}
                      className="mt-2 rounded-2xl bg-[#3b2f2f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {submitting ? "Posting..." : "Post Reply"}
                    </button>
                  </div>
                )}

                {/* Replies */}
                {getReplies(comment.id).length > 0 && (
                  <div className="mt-3 ml-11 flex flex-col gap-3">
                    {getReplies(comment.id).map((reply) => (
                      <div key={reply.id} className="rounded-2xl border border-[#e0c7bb] bg-[#f7eee8] p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c9a99a] text-xs font-bold text-white">
                            {getInitial(reply.user_email)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold">{getDisplayName(reply.user_email)}</p>
                              <p className="text-xs text-[#7a6258]">{formatDate(reply.created_at)}</p>
                            </div>
                            <p className="mt-1 text-sm text-[#3b2f2f]">{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MCQQuestionView({ question, answer, feedback, onAnswer }: {
  question: MCQQuestion;
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
            <button key={letter} onClick={() => onAnswer(letter)} disabled={answered}
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
                {showCorrect && <span className="ml-auto font-bold text-green-600">✓</span>}
                {showWrong && <span className="ml-auto font-bold text-red-600">✗</span>}
              </div>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${feedback ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {feedback ? "✓ Correct!" : `✗ Wrong. Correct answer: ${question.correctAnswer}`}
        </div>
      )}
      {answered && question.explanation && (
        <div className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#7a6258] mb-1">💡 Explanation</p>
          <p className="text-sm text-[#3b2f2f]">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function FillQuestionView({ question, answers, feedback, onCheck, onUpdate }: {
  question: FillQuestion;
  answers: Record<number, string>;
  feedback: Record<number, boolean>;
  onCheck: (answers: Record<number, string>) => void;
  onUpdate: (answers: Record<number, string>) => void;
}) {
  const checked = Object.keys(feedback).length > 0;
  let blankIndex = 0;
  const parts = question.text.split("___");
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-[#7a6258]">Fill in the blanks as you listen:</p>
      <div className="text-lg leading-10">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (() => {
              const bi = blankIndex++;
              const fb = feedback[bi];
              return (
                <input type="text" value={answers[bi] || ""}
                  onChange={(e) => { if (!checked) onUpdate({ ...answers, [bi]: e.target.value }); }}
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
        <div className="mt-4 flex flex-col gap-1">
          {question.blanks.map((b, bi) => (
            <p key={bi} className={`text-sm font-semibold ${feedback[bi] ? "text-green-600" : "text-red-600"}`}>
              {feedback[bi] ? `✓ Blank ${bi + 1}: correct` : `✗ Blank ${bi + 1}: correct answer is "${b.answer.split("|")[0]}"`}
            </p>
          ))}
        </div>
      )}
      {!checked && (
        <button onClick={() => onCheck(answers)} className="mt-5 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Check Answers</button>
      )}
    </div>
  );
}

function DictationQuestionView({ question, answer, feedback, revealed, playsUsed, maxPlays, isPlaying, onChange, onPlay, onCheck, onReveal, onRetry }: {
  question: DictationQuestion;
  answer: string;
  feedback: boolean | null;
  revealed: boolean;
  playsUsed: number;
  maxPlays: number;
  isPlaying: boolean;
  onChange: (v: string) => void;
  onPlay: () => void;
  onCheck: () => void;
  onReveal: () => void;
  onRetry: () => void;
}) {
  const canPlay = playsUsed < maxPlays;
  const hasPlayed = playsUsed > 0;
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold text-lg">🎙️ Listen and type what you hear</p>
        <span className="text-sm text-[#7a6258]">{playsUsed}/{maxPlays} plays</span>
      </div>
      <button onClick={onPlay} disabled={!canPlay || isPlaying}
        className={`mt-4 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 font-bold transition ${canPlay && !isPlaying ? "bg-[#3b2f2f] text-white hover:bg-[#2f2424]" : "cursor-not-allowed bg-[#e0c7bb] text-[#7a6258]"}`}>
        {isPlaying ? "🔊 Playing..." : canPlay ? `▶ Play${playsUsed > 0 ? " Again" : ""}` : "No plays left"}
      </button>
      {hasPlayed && (
        <>
          <textarea value={answer} onChange={(e) => onChange(e.target.value)} disabled={feedback !== null}
            placeholder="Type exactly what you heard..."
            className={`mt-4 min-h-[100px] w-full rounded-2xl border p-4 ${feedback === true ? "border-green-400 bg-green-50" : feedback === false ? "border-red-400 bg-red-50" : "border-[#e0c7bb] bg-white"}`}
          />
          {feedback === null && <button onClick={onCheck} className="mt-3 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Check</button>}
          {feedback === true && <div className="mt-3 rounded-2xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">✓ Perfect!</div>}
          {feedback === false && !revealed && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">✗ Not quite right.</div>
              <div className="flex gap-3">
                <button onClick={onRetry} className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3 font-semibold">Try Again</button>
                <button onClick={onReveal} className="flex-1 rounded-2xl bg-[#3b2f2f] px-4 py-3 font-semibold text-white">Show Answer</button>
              </div>
            </div>
          )}
          {revealed && (
            <div className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white p-4">
              <p className="text-sm text-[#7a6258]">Correct answer:</p>
              <p className="mt-1 font-semibold">{question.sentence.split("|")[0]}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ShortAnswerView({ question, answer, feedback, revealed, onChange, onCheck, onReveal, onRetry }: {
  question: ShortAnswerQuestion;
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
      <p className="text-xl font-bold">{question.question}</p>
      {question.hint && feedback === null && (
        <p className="mt-2 text-sm text-[#7a6258]">💡 Hint: {question.hint}</p>
      )}
      <input type="text" value={answer} onChange={(e) => onChange(e.target.value)} disabled={feedback !== null}
        placeholder="Your answer (max 3 words)..."
        onKeyDown={(e) => { if (e.key === "Enter" && feedback === null) onCheck(); }}
        className={`mt-4 w-full rounded-2xl border p-4 text-lg ${
          feedback === true ? "border-green-400 bg-green-50" :
          feedback === false ? "border-red-400 bg-red-50" :
          "border-[#e0c7bb] bg-white"
        }`}
      />
      {feedback === null && <button onClick={onCheck} className="mt-3 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Check Answer</button>}
      {feedback === true && <div className="mt-3 rounded-2xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">✓ Correct!</div>}
      {feedback === false && !revealed && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">✗ Not quite right.</div>
          <div className="flex gap-3">
            <button onClick={onRetry} className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3 font-semibold">Try Again</button>
            <button onClick={onReveal} className="flex-1 rounded-2xl bg-[#3b2f2f] px-4 py-3 font-semibold text-white">Show Answer</button>
          </div>
        </div>
      )}
      {revealed && (
        <div className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white p-4">
          <p className="text-sm text-[#7a6258]">Correct answer:</p>
          <p className="mt-1 font-semibold">{question.answer.split("|")[0]}</p>
        </div>
      )}
    </div>
  );
}

function MatchingView({ question, userMatches, checked, onMatch, onCheck }: {
  question: MatchingQuestion;
  userMatches: Record<number, number>;
  checked: boolean;
  onMatch: (leftIdx: number, rightIdx: number) => void;
  onCheck: () => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const shuffledRight = question.pairs.map((p, i) => ({ text: p.right, originalIdx: i }))
    .sort((a, b) => a.originalIdx - b.originalIdx);
  const isCorrect = (leftIdx: number) => userMatches[leftIdx] === leftIdx;

  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-[#7a6258]">Match each item on the left with the correct description on the right:</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-[#7a6258] uppercase">Items</p>
          {question.pairs.map((pair, i) => (
            <button key={i} onClick={() => { if (!checked) setSelectedLeft(i); }}
              className={`rounded-2xl border p-3 text-left text-sm font-semibold transition ${
                checked ? (isCorrect(i) ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50") :
                selectedLeft === i ? "border-[#3b2f2f] bg-[#ead7cc]" :
                userMatches[i] !== undefined ? "border-[#c9a99a] bg-[#f7eee8]" :
                "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"
              }`}>
              {pair.left}
              {userMatches[i] !== undefined && !checked && (
                <span className="ml-2 text-xs text-[#7a6258]">→ {shuffledRight[userMatches[i]]?.text}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-[#7a6258] uppercase">Matches</p>
          {shuffledRight.map((item, i) => {
            const isMatched = Object.values(userMatches).includes(i);
            return (
              <button key={i} onClick={() => {
                if (!checked && selectedLeft !== null) {
                  onMatch(selectedLeft, i);
                  setSelectedLeft(null);
                }
              }}
                className={`rounded-2xl border p-3 text-left text-sm transition ${
                  checked ? (Object.entries(userMatches).some(([l, r]) => Number(r) === i && Number(l) === item.originalIdx) ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50") :
                  isMatched ? "border-[#c9a99a] bg-[#f7eee8]" :
                  selectedLeft !== null ? "border-[#3b2f2f] bg-white hover:bg-[#ead7cc] cursor-pointer" :
                  "border-[#e0c7bb] bg-white"
                }`}>
                {item.text}
              </button>
            );
          })}
        </div>
      </div>
      {checked && (
        <div className="mt-4 flex flex-col gap-1">
          {question.pairs.map((pair, i) => (
            <p key={i} className={`text-sm font-semibold ${isCorrect(i) ? "text-green-600" : "text-red-600"}`}>
              {isCorrect(i) ? `✓ ${pair.left} → ${pair.right}` : `✗ ${pair.left} → correct: ${pair.right}`}
            </p>
          ))}
        </div>
      )}
      {!checked && (
        <button onClick={onCheck} className="mt-5 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Check Matches</button>
      )}
    </div>
  );
}

export default function QuizScreen({ episodeId, practiceMode, isQuizMode, onBack, onNextEpisode }: Props) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [nextEpisode, setNextEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [showStartWarning, setShowStartWarning] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [mcqFeedback, setMcqFeedback] = useState<Record<number, boolean>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<number, Record<number, string>>>({});
  const [fillFeedback, setFillFeedback] = useState<Record<number, Record<number, boolean>>>({});
  const [dictationAnswers, setDictationAnswers] = useState<Record<number, string>>({});
  const [dictationFeedback, setDictationFeedback] = useState<Record<number, boolean | null>>({});
  const [dictationRevealed, setDictationRevealed] = useState<Record<number, boolean>>({});
  const [dictationPlays, setDictationPlays] = useState<Record<number, number>>({});
  const dictationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [dictationPlaying, setDictationPlaying] = useState(false);
  const [shortAnswers, setShortAnswers] = useState<Record<number, string>>({});
  const [shortFeedback, setShortFeedback] = useState<Record<number, boolean | null>>({});
  const [shortRevealed, setShortRevealed] = useState<Record<number, boolean>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<Record<number, Record<number, number>>>({});
  const [matchingChecked, setMatchingChecked] = useState<Record<number, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  useEffect(() => {
    async function fetchEpisode() {
      const { data, error } = await supabase.from("episodes").select("*").eq("id", episodeId).single();
      if (!error && data) {
        setEpisode(data);
        const { data: allEpisodes } = await supabase
          .from("episodes")
          .select("id, title, level, audio_url, episode_type, questions, show_notes")
          .eq("level", data.level)
          .eq("episode_type", data.episode_type)
          .order("created_at", { ascending: true });
        if (allEpisodes) {
          const idx = allEpisodes.findIndex((e) => e.id === episodeId);
          if (idx !== -1 && idx < allEpisodes.length - 1) setNextEpisode(allEpisodes[idx + 1]);
        }
      }
      setLoading(false);
    }

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    }

    fetchEpisode();
    getUser();
  }, [episodeId]);

  function toggleMainAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  }

  function calculateScore() {
    if (!episode) return { correct: 0, total: 0 };
    let correct = 0, total = 0;
    episode.questions.forEach((q, i) => {
      const type = episode.episode_type;
      if (type === "practice-mcq" || type?.startsWith("quiz-")) {
        total++; if (mcqAnswers[i] === (q as MCQQuestion).correctAnswer) correct++;
      } else if (type === "practice-fill") {
        (q as FillQuestion).blanks.forEach((_, bi) => { total++; if (fillFeedback[i]?.[bi] === true) correct++; });
      } else if (type === "practice-dictation") {
        total++; if (dictationFeedback[i] === true) correct++;
      } else if (type === "practice-short") {
        total++; if (shortFeedback[i] === true) correct++;
      } else if (type === "practice-matching") {
        const mq = q as MatchingQuestion;
        mq.pairs.forEach((_, pi) => { total++; if (matchingAnswers[i]?.[pi] === pi) correct++; });
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
      user_email: user.email, episode_id: episode.id, episode_title: episode.title,
      level: episode.level, score: correct, total_questions: total,
    }]);
    setResultSaved(true);
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f7eee8]"><p className="text-xl text-[#3b2f2f]">Loading...</p></main>;
  if (!episode) return <main className="flex min-h-screen items-center justify-center bg-[#f7eee8]"><p className="text-xl text-[#3b2f2f]">Episode not found.</p></main>;

  const questions = episode.questions || [];
  const question = questions[currentQuestion];
  const episodeType = episode.episode_type;
  const isFill = episodeType === "practice-fill";
  const isDictation = episodeType === "practice-dictation";
  const isMCQ = episodeType === "practice-mcq" || episodeType?.startsWith("quiz-");
  const isShort = episodeType === "practice-short";
  const isMatching = episodeType === "practice-matching";

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-3xl px-6 py-12">

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#7a6258]">{episode.level}</p>
            <h1 className="text-3xl font-bold md:text-4xl">{episode.title}</h1>
          </div>
          <button onClick={onBack} className="shrink-0 rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold shadow-sm">Back</button>
        </div>

        {/* MCQ dinleme */}
        {isMCQ && !testStarted && (
          <div className="mt-8">
            <audio ref={audioRef} src={episode.audio_url}
              onTimeUpdate={() => { const a = audioRef.current; if (a) setAudioProgress((a.currentTime / a.duration) * 100); }}
              onLoadedMetadata={() => { const a = audioRef.current; if (a) setAudioDuration(a.duration); }}
              onEnded={() => setIsPlaying(false)}
            />
            <AudioPlayer isPlaying={isPlaying} progress={audioProgress} duration={audioDuration} audioRef={audioRef} onToggle={toggleMainAudio} title={episode.title} level={episode.level} />
            {!showStartWarning ? (
              <button onClick={() => setShowStartWarning(true)} className="mt-6 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white">I have listened — Start Questions</button>
            ) : (
              <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-white p-5">
                <p className="font-semibold">⚠️ Before you start</p>
                <p className="mt-2 text-sm text-[#7a6258]">Audio will not be available during questions. Make sure you have taken your notes.</p>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setShowStartWarning(false)} className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3 font-semibold">Go Back</button>
                  <button onClick={() => setTestStarted(true)} className="flex-1 rounded-2xl bg-[#3b2f2f] px-4 py-3 font-semibold text-white">Yes, I'm Ready</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fill in the Blank */}
        {isFill && !showResults && (
          <div className="mt-8">
            <audio ref={audioRef} src={episode.audio_url}
              onTimeUpdate={() => { const a = audioRef.current; if (a) setAudioProgress((a.currentTime / a.duration) * 100); }}
              onLoadedMetadata={() => { const a = audioRef.current; if (a) setAudioDuration(a.duration); }}
              onEnded={() => setIsPlaying(false)}
            />
            <AudioPlayer isPlaying={isPlaying} progress={audioProgress} duration={audioDuration} audioRef={audioRef}
              onToggle={() => { if (!testStarted) setTestStarted(true); toggleMainAudio(); }}
              title={episode.title} level={episode.level}
            />
            {testStarted && (
              <>
                <div className="mt-6 flex flex-col gap-6">
                  {questions.map((q, i) => (
                    <FillQuestionView key={i} question={q as FillQuestion}
                      answers={fillAnswers[i] || {}} feedback={fillFeedback[i] || {}}
                      onCheck={(ans) => {
                        const fb: Record<number, boolean> = {};
                        (q as FillQuestion).blanks.forEach((b, bi) => { fb[bi] = checkAnswer(ans[bi] || "", b.answer); });
                        setFillAnswers({ ...fillAnswers, [i]: ans });
                        setFillFeedback({ ...fillFeedback, [i]: fb });
                      }}
                      onUpdate={(ans) => setFillAnswers({ ...fillAnswers, [i]: ans })}
                    />
                  ))}
                </div>
                <button onClick={async () => { setShowResults(true); await saveResult(); }} className="mt-8 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white">Finish ✓</button>
              </>
            )}
          </div>
        )}

        {/* Dictation giriş */}
        {isDictation && !testStarted && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm text-center">
            <p className="text-lg font-bold">🎙️ Dictation Practice</p>
            <p className="mt-2 text-sm text-[#7a6258]">Listen carefully and type exactly what you hear. You have <strong>2 plays</strong> per sentence.</p>
            <button onClick={() => setTestStarted(true)} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-semibold text-white">Start Dictation</button>
          </div>
        )}

        {/* Short Answer giriş */}
        {isShort && !testStarted && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm text-center">
            <p className="text-lg font-bold">✍️ Short Answer Practice</p>
            <p className="mt-2 text-sm text-[#7a6258]">Listen carefully, then answer each question in 1-3 words.</p>
            <button onClick={() => setTestStarted(true)} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-semibold text-white">Start</button>
          </div>
        )}

        {/* Matching giriş */}
        {isMatching && !testStarted && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm text-center">
            <p className="text-lg font-bold">🔗 Matching Practice</p>
            <p className="mt-2 text-sm text-[#7a6258]">Listen carefully, then match each item on the left with the correct description on the right.</p>
            <button onClick={() => setTestStarted(true)} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-semibold text-white">Start Matching</button>
          </div>
        )}

        {/* Short + Matching audio */}
        {(isShort || isMatching) && !testStarted && (
          <div className="mt-4">
            <audio ref={audioRef} src={episode.audio_url}
              onTimeUpdate={() => { const a = audioRef.current; if (a) setAudioProgress((a.currentTime / a.duration) * 100); }}
              onLoadedMetadata={() => { const a = audioRef.current; if (a) setAudioDuration(a.duration); }}
              onEnded={() => setIsPlaying(false)}
            />
            <AudioPlayer isPlaying={isPlaying} progress={audioProgress} duration={audioDuration} audioRef={audioRef} onToggle={toggleMainAudio} title={episode.title} level={episode.level} />
          </div>
        )}

        {/* Dictation sorular */}
        {isDictation && testStarted && !showResults && question && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#7a6258]">Sentence {currentQuestion + 1} of {questions.length}</p>
              <div className="flex gap-1">{questions.map((_, i) => <div key={i} className={`h-2 w-2 rounded-full ${i === currentQuestion ? "bg-[#3b2f2f]" : i < currentQuestion ? "bg-[#c9a99a]" : "bg-[#e0c7bb]"}`} />)}</div>
            </div>
            <audio ref={dictationAudioRef} src={episode.audio_url} onEnded={() => setDictationPlaying(false)} />
            <DictationQuestionView
              question={question as DictationQuestion}
              answer={dictationAnswers[currentQuestion] || ""}
              feedback={dictationFeedback[currentQuestion] ?? null}
              revealed={dictationRevealed[currentQuestion] || false}
              playsUsed={dictationPlays[currentQuestion] || 0}
              maxPlays={2} isPlaying={dictationPlaying}
              onChange={(v) => setDictationAnswers({ ...dictationAnswers, [currentQuestion]: v })}
              onPlay={() => {
                const audio = dictationAudioRef.current;
                if (!audio) return;
                const plays = dictationPlays[currentQuestion] || 0;
                if (plays >= 2) return;
                setDictationPlays({ ...dictationPlays, [currentQuestion]: plays + 1 });
                audio.currentTime = 0; audio.play(); setDictationPlaying(true);
              }}
              onCheck={() => setDictationFeedback({ ...dictationFeedback, [currentQuestion]: checkAnswer(dictationAnswers[currentQuestion] || "", (question as DictationQuestion).sentence) })}
              onReveal={() => setDictationRevealed({ ...dictationRevealed, [currentQuestion]: true })}
              onRetry={() => { setDictationAnswers({ ...dictationAnswers, [currentQuestion]: "" }); setDictationFeedback({ ...dictationFeedback, [currentQuestion]: null }); }}
            />
            <div className="mt-6 flex justify-between gap-4">
              <button disabled={currentQuestion === 0} onClick={() => { setCurrentQuestion(currentQuestion - 1); setDictationPlaying(false); if (dictationAudioRef.current) dictationAudioRef.current.pause(); }} className="rounded-2xl border border-[#e0c7bb] bg-white px-6 py-3 font-semibold disabled:opacity-30">Previous</button>
              {currentQuestion < questions.length - 1 ? (
                <button onClick={() => { setCurrentQuestion(currentQuestion + 1); setDictationPlaying(false); if (dictationAudioRef.current) dictationAudioRef.current.pause(); }} className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Next →</button>
              ) : (
                <button onClick={async () => { setShowResults(true); await saveResult(); }} className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Finish ✓</button>
              )}
            </div>
          </div>
        )}

        {/* Short Answer sorular */}
        {isShort && testStarted && !showResults && question && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#7a6258]">Question {currentQuestion + 1} of {questions.length}</p>
              <div className="flex gap-1">{questions.map((_, i) => <div key={i} className={`h-2 w-2 rounded-full ${i === currentQuestion ? "bg-[#3b2f2f]" : i < currentQuestion ? "bg-[#c9a99a]" : "bg-[#e0c7bb]"}`} />)}</div>
            </div>
            <ShortAnswerView
              question={question as ShortAnswerQuestion}
              answer={shortAnswers[currentQuestion] || ""}
              feedback={shortFeedback[currentQuestion] ?? null}
              revealed={shortRevealed[currentQuestion] || false}
              onChange={(v) => setShortAnswers({ ...shortAnswers, [currentQuestion]: v })}
              onCheck={() => setShortFeedback({ ...shortFeedback, [currentQuestion]: checkAnswer(shortAnswers[currentQuestion] || "", (question as ShortAnswerQuestion).answer) })}
              onReveal={() => setShortRevealed({ ...shortRevealed, [currentQuestion]: true })}
              onRetry={() => { setShortAnswers({ ...shortAnswers, [currentQuestion]: "" }); setShortFeedback({ ...shortFeedback, [currentQuestion]: null }); }}
            />
            <div className="mt-6 flex justify-between gap-4">
              <button disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(currentQuestion - 1)} className="rounded-2xl border border-[#e0c7bb] bg-white px-6 py-3 font-semibold disabled:opacity-30">Previous</button>
              {currentQuestion < questions.length - 1 ? (
                <button onClick={() => setCurrentQuestion(currentQuestion + 1)} className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Next →</button>
              ) : (
                <button onClick={async () => { setShowResults(true); await saveResult(); }} className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Finish ✓</button>
              )}
            </div>
          </div>
        )}

        {/* Matching sorular */}
        {isMatching && testStarted && !showResults && (
          <div className="mt-8 flex flex-col gap-6">
            {questions.map((q, i) => (
              <MatchingView key={i} question={q as MatchingQuestion}
                userMatches={matchingAnswers[i] || {}}
                checked={matchingChecked[i] || false}
                onMatch={(leftIdx, rightIdx) => setMatchingAnswers({ ...matchingAnswers, [i]: { ...(matchingAnswers[i] || {}), [leftIdx]: rightIdx } })}
                onCheck={() => setMatchingChecked({ ...matchingChecked, [i]: true })}
              />
            ))}
            <button onClick={async () => { setShowResults(true); await saveResult(); }} className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white">Finish ✓</button>
          </div>
        )}

        {/* MCQ sorular */}
        {isMCQ && testStarted && !showResults && question && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#7a6258]">Question {currentQuestion + 1} of {questions.length}</p>
              <div className="flex gap-1">{questions.map((_, i) => <div key={i} className={`h-2 w-2 rounded-full ${i === currentQuestion ? "bg-[#3b2f2f]" : i < currentQuestion ? "bg-[#c9a99a]" : "bg-[#e0c7bb]"}`} />)}</div>
            </div>
            <MCQQuestionView question={question as MCQQuestion} answer={mcqAnswers[currentQuestion]} feedback={mcqFeedback[currentQuestion]}
              onAnswer={(letter) => {
                if (mcqFeedback[currentQuestion] !== undefined) return;
                const isCorrect = letter === (question as MCQQuestion).correctAnswer;
                setMcqAnswers({ ...mcqAnswers, [currentQuestion]: letter });
                setMcqFeedback({ ...mcqFeedback, [currentQuestion]: isCorrect });
              }}
            />
            <div className="mt-6 flex justify-between gap-4">
              <button disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(currentQuestion - 1)} className="rounded-2xl border border-[#e0c7bb] bg-white px-6 py-3 font-semibold disabled:opacity-30">Previous</button>
              {currentQuestion < questions.length - 1 ? (
                <button onClick={() => setCurrentQuestion(currentQuestion + 1)} className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Next →</button>
              ) : (
                <button onClick={async () => { setShowResults(true); await saveResult(); }} className="rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Finish ✓</button>
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
                  <p className="mt-3 text-sm text-[#7a6258]">{pct >= 80 ? "🎯 Excellent work!" : pct >= 60 ? "📈 Good job!" : "💪 Keep going!"}</p>
                </div>
              );
            })()}
            <div className="mt-8 flex flex-col gap-3">
              {nextEpisode && <button onClick={() => onNextEpisode(nextEpisode.id)} className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white">Next Episode →</button>}
              <button onClick={onBack} className="w-full rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f]">Back to Episodes</button>
            </div>
          </div>
        )}

        {/* Comments — her zaman altta görünür */}
        <div className="mt-8">
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 font-semibold transition ${showComments ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}
          >
            <span>💬 Discussion</span>
            <span className="text-sm">{showComments ? "Hide ▲" : "Show ▼"}</span>
          </button>
          {showComments && userEmail && (
            <CommentsPanel episodeId={episodeId} userEmail={userEmail} />
          )}
          {showComments && !userEmail && (
            <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4 text-center text-sm text-[#7a6258]">
              Please log in to view and post comments.
            </div>
          )}
        </div>

      </section>

      {/* Floating Notes */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showNotesPanel && (
          <div className="w-80 rounded-[2rem] border border-[#e0c7bb] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e0c7bb] px-5 py-4">
              <p className="font-bold">📝 My Notes</p>
              <button onClick={() => setShowNotesPanel(false)} className="text-[#7a6258] hover:text-[#3b2f2f]">✕</button>
            </div>
            <div className="p-4">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write your notes here..." className="min-h-[200px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
              {notes && <p className="mt-2 text-right text-xs text-[#7a6258]">{notes.length} chars</p>}
            </div>
          </div>
        )}
        <button onClick={() => setShowNotesPanel(!showNotesPanel)}
          className={`flex items-center gap-2 rounded-full px-5 py-3 font-bold shadow-xl transition ${showNotesPanel ? "bg-[#ead7cc] text-[#3b2f2f]" : "bg-[#3b2f2f] text-white hover:bg-[#2f2424]"}`}>
          📝 {showNotesPanel ? "Close" : "Notes"}
          {notes && !showNotesPanel && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c9a99a] text-xs text-white">✓</span>}
        </button>
      </div>

    </main>
  );
}