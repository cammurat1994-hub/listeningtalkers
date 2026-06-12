"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  episodeId: string;
  practiceMode: "mcq" | "fill-blank" | "dictation" | "short-answer" | "matching" | "map" | "completion-note" | "completion-form" | "completion-table" | "completion-flow" | "completion-sentence" | null;
  isQuizMode: boolean;
  onBack: () => void;
  onNextEpisode: (nextEpisodeId: string) => void;
  onStudyVocabulary: () => void;
};

type IELTSSectionPart = {
  part: number;
  audioUrl: string;
  groups: { id: string; type: string; label: string; wordLimit?: string; data: any; }[];
};

type MCQQuestion = {
  question: string;
  options: { A: string; B: string; C?: string; D?: string; E?: string; F?: string; G?: string };
  correctAnswer: string | string[];
  explanation?: string;
};
type FillQuestion = { text: string; blanks: { index: number; answer: string }[]; };
type DictationQuestion = { sentence: string; };
type ShortAnswerQuestion = { question: string; answer: string; hint?: string; };
type MatchingQuestion = { items: string[]; options: { key: string; label: string }[]; answers: Record<string, string>; };
type MapPoint = { id: number; x: number; y: number; answer: string; explanation: string; };
type MapOption = { key: string; label: string; };
type MapQuestion = { points: MapPoint[]; options: MapOption[]; imageUrl: string; };

type Episode = {
  id: string; title: string; level: string; audio_url: string; episode_type: string; show_notes: boolean;
  questions: (MCQQuestion | FillQuestion | DictationQuestion | ShortAnswerQuestion | MatchingQuestion | MapQuestion)[];
};

type Comment = { id: string; episode_id: string; user_email: string; content: string; created_at: string; parent_id: string | null; };

function normalize(str: string) { return str.toLowerCase().trim().replace(/[.,!?;:'"]/g, ""); }
function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalize(userAnswer);
  return correctAnswer.split("|").map(normalize).some(v => v === normalizedUser);
}
function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ isPlaying, progress, duration, audioRef, onToggle, title, level }: {
  isPlaying: boolean; progress: number; duration: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onToggle: () => void; title: string; level: string;
}) {
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3b2f2f] shadow-lg">
          <img src="/cat-logo.svg" alt="" className="h-11 w-11 object-contain" />
        </div>
        <div className="text-center"><p className="font-bold">{title}</p><p className="text-sm text-[#7a6258]">{level}</p></div>
        <div className="w-full">
          <div className="relative h-2 w-full cursor-pointer rounded-full bg-[#ead7cc]" onClick={e => {
            const audio = audioRef.current; if (!audio) return;
            const rect = e.currentTarget.getBoundingClientRect();
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
          }}>
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

// ─── MCQ Question View ────────────────────────────────────────────────────────

function MCQQuestionView({ question, selectedAnswers, confirmed, onToggle, onConfirm }: {
  question: MCQQuestion; selectedAnswers: string[]; confirmed: boolean;
  onToggle: (letter: string) => void; onConfirm: () => void;
}) {
  const correctArr = Array.isArray(question.correctAnswer) ? (question.correctAnswer as string[]) : [question.correctAnswer as string];
  const isMultiple = correctArr.length > 1;
  const optionLetters = Object.keys(question.options).filter(k => (question.options as any)[k]);
  const requiredCount = correctArr.length;
  const isCorrectAnswer = (letter: string) => correctArr.includes(letter);
  const isSelected = (letter: string) => selectedAnswers.includes(letter);

  const getButtonClass = (letter: string) => {
    if (!confirmed) return isSelected(letter) ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]";
    if (isCorrectAnswer(letter) && isSelected(letter)) return "border-green-400 bg-green-50";
    if (isCorrectAnswer(letter) && !isSelected(letter)) return "border-green-300 bg-green-50 opacity-70";
    if (!isCorrectAnswer(letter) && isSelected(letter)) return "border-red-400 bg-red-50";
    return "border-[#e0c7bb] bg-white opacity-50";
  };

  const allCorrect = confirmed && correctArr.every(c => selectedAnswers.includes(c)) && selectedAnswers.every(s => correctArr.includes(s));
  const canConfirm = !confirmed && selectedAnswers.length === requiredCount;

  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      {isMultiple && <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ead7cc] px-3 py-1 text-xs font-bold text-[#3b2f2f]">Choose {requiredCount === 2 ? "TWO" : "THREE"} answers</div>}
      <p className="text-xl font-bold">{question.question}</p>
      <div className="mt-5 flex flex-col gap-3">
        {optionLetters.map(letter => (
          <button key={letter} onClick={() => { if (!confirmed) onToggle(letter); }} disabled={confirmed} className={`rounded-2xl border p-4 text-left transition ${getButtonClass(letter)}`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                isSelected(letter) && !confirmed ? "bg-[#3b2f2f] text-white" :
                confirmed && isCorrectAnswer(letter) ? "bg-green-400 text-white" :
                confirmed && isSelected(letter) && !isCorrectAnswer(letter) ? "bg-red-400 text-white" :
                "bg-[#ead7cc] text-[#3b2f2f]"}`}>{letter}</span>
              <span>{(question.options as any)[letter]}</span>
              {confirmed && isCorrectAnswer(letter) && <span className="ml-auto font-bold text-green-600">✓</span>}
              {confirmed && isSelected(letter) && !isCorrectAnswer(letter) && <span className="ml-auto font-bold text-red-600">✗</span>}
            </div>
          </button>
        ))}
      </div>
      {!confirmed && isMultiple && <p className="mt-3 text-xs text-[#7a6258]">{selectedAnswers.length}/{requiredCount} selected{selectedAnswers.length === requiredCount ? " — ready to confirm" : ""}</p>}
      {!confirmed && (
        <button onClick={onConfirm} disabled={!canConfirm} className="mt-4 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white disabled:opacity-40">
          {isMultiple ? (canConfirm ? "Confirm Answers" : `Select ${requiredCount - selectedAnswers.length} more`) : (selectedAnswers.length === 0 ? "Select an answer" : "Confirm Answer")}
        </button>
      )}
      {confirmed && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${allCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {allCorrect ? "✓ Correct!" : `✗ Correct answer${correctArr.length > 1 ? "s" : ""}: ${correctArr.join(" and ")}`}
        </div>
      )}
      {confirmed && question.explanation && (
        <div className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#7a6258] mb-1">💡 Explanation</p>
          <p className="text-sm text-[#3b2f2f]">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

// ─── Fill Question View ───────────────────────────────────────────────────────

function FillQuestionView({ question, answers, feedback, onCheck, onUpdate }: {
  question: FillQuestion; answers: Record<number, string>; feedback: Record<number, boolean>;
  onCheck: (answers: Record<number, string>) => void; onUpdate: (answers: Record<number, string>) => void;
}) {
  const checked = Object.keys(feedback).length > 0;
  let blankIndex = 0;
  const parts = question.text.split("___");
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-[#7a6258]">Fill in the blanks as you listen:</p>
      <div className="text-lg leading-10">
        {parts.map((part, i) => (
          <span key={i}>{part}{i < parts.length - 1 && (() => {
            const bi = blankIndex++;
            const fb = feedback[bi];
            return <input type="text" value={answers[bi] || ""} onChange={e => { if (!checked) onUpdate({ ...answers, [bi]: e.target.value }); }} disabled={checked}
              className={`mx-1 inline-block w-28 rounded-xl border px-2 py-1 text-center text-sm font-semibold ${fb === true ? "border-green-400 bg-green-50 text-green-700" : fb === false ? "border-red-400 bg-red-50 text-red-700" : "border-[#3b2f2f] bg-white"}`} />;
          })()}</span>
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
      {!checked && <button onClick={() => onCheck(answers)} className="mt-5 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Check Answers</button>}
    </div>
  );
}

// ─── Dictation Question View ──────────────────────────────────────────────────

function DictationQuestionView({ question, answer, feedback, revealed, playsUsed, maxPlays, isPlaying, onChange, onPlay, onCheck, onReveal, onRetry }: {
  question: DictationQuestion; answer: string; feedback: boolean | null; revealed: boolean;
  playsUsed: number; maxPlays: number; isPlaying: boolean;
  onChange: (v: string) => void; onPlay: () => void; onCheck: () => void; onReveal: () => void; onRetry: () => void;
}) {
  const canPlay = playsUsed < maxPlays;
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4"><p className="font-bold text-lg">🎙️ Listen and type what you hear</p><span className="text-sm text-[#7a6258]">{playsUsed}/{maxPlays} plays</span></div>
      <button onClick={onPlay} disabled={!canPlay || isPlaying} className={`mt-4 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 font-bold transition ${canPlay && !isPlaying ? "bg-[#3b2f2f] text-white hover:bg-[#2f2424]" : "cursor-not-allowed bg-[#e0c7bb] text-[#7a6258]"}`}>
        {isPlaying ? "🔊 Playing..." : canPlay ? `▶ Play${playsUsed > 0 ? " Again" : ""}` : "No plays left"}
      </button>
      {playsUsed > 0 && (
        <>
          <textarea value={answer} onChange={e => onChange(e.target.value)} disabled={feedback !== null} placeholder="Type exactly what you heard..." className={`mt-4 min-h-[100px] w-full rounded-2xl border p-4 ${feedback === true ? "border-green-400 bg-green-50" : feedback === false ? "border-red-400 bg-red-50" : "border-[#e0c7bb] bg-white"}`} />
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
          {revealed && <div className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white p-4"><p className="text-sm text-[#7a6258]">Correct answer:</p><p className="mt-1 font-semibold">{question.sentence.split("|")[0]}</p></div>}
        </>
      )}
    </div>
  );
}

// ─── Short Answer View ────────────────────────────────────────────────────────

function ShortAnswerView({ question, answer, feedback, revealed, onChange, onCheck, onReveal, onRetry }: {
  question: ShortAnswerQuestion; answer: string; feedback: boolean | null; revealed: boolean;
  onChange: (v: string) => void; onCheck: () => void; onReveal: () => void; onRetry: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <p className="text-xl font-bold">{question.question}</p>
      {question.hint && feedback === null && <p className="mt-2 text-sm text-[#7a6258]">💡 Hint: {question.hint}</p>}
      <input type="text" value={answer} onChange={e => onChange(e.target.value)} disabled={feedback !== null} placeholder="Your answer (max 3 words)..." onKeyDown={e => { if (e.key === "Enter" && feedback === null) onCheck(); }}
        className={`mt-4 w-full rounded-2xl border p-4 text-lg ${feedback === true ? "border-green-400 bg-green-50" : feedback === false ? "border-red-400 bg-red-50" : "border-[#e0c7bb] bg-white"}`} />
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
      {revealed && <div className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white p-4"><p className="text-sm text-[#7a6258]">Correct answer:</p><p className="mt-1 font-semibold">{question.answer.split("|")[0]}</p></div>}
    </div>
  );
}

// ─── Matching View ────────────────────────────────────────────────────────────

function MatchingView({ question, userAnswers, checked, onAnswer, onCheck }: {
  question: MatchingQuestion; userAnswers: Record<number, string>; checked: boolean;
  onAnswer: (itemIndex: number, optionKey: string) => void; onCheck: () => void;
}) {
  const isCorrect = (i: number) => userAnswers[i] === question.answers[String(i)];
  const allAnswered = question.items.every((_, i) => userAnswers[i]);
  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <p className="mb-2 text-sm font-semibold text-[#7a6258]">Match each item with the correct option.</p>
      <div className="mb-5 rounded-2xl border border-[#e0c7bb] bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#7a6258] mb-2">Options</p>
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {question.options.map(opt => (
            <div key={opt.key} className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ead7cc] text-xs font-bold text-[#3b2f2f]">{opt.key}</span>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {question.items.map((item, i) => {
          const selected = userAnswers[i]; const correct = question.answers[String(i)];
          const correct_label = question.options.find(o => o.key === correct)?.label;
          const selected_label = question.options.find(o => o.key === selected)?.label;
          return (
            <div key={i} className={`rounded-2xl border p-4 ${checked ? (isCorrect(i) ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50") : "border-[#e0c7bb] bg-white"}`}>
              <div className="flex items-start gap-3 flex-wrap">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">{i + 1}</span>
                <span className="flex-1 text-sm font-semibold pt-0.5">{item}</span>
                {!checked ? (
                  <select value={selected || ""} onChange={e => onAnswer(i, e.target.value)} className="rounded-xl border border-[#e0c7bb] bg-[#f7eee8] px-3 py-1.5 text-sm font-semibold">
                    <option value="">Select...</option>
                    {question.options.map(opt => <option key={opt.key} value={opt.key}>{opt.key}</option>)}
                  </select>
                ) : (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${isCorrect(i) ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>{selected || "—"} {isCorrect(i) ? "✓" : `✗ → ${correct}`}</span>
                )}
              </div>
              {checked && !isCorrect(i) && (
                <div className="mt-2 ml-10 text-xs text-[#7a6258]">
                  <span className="text-red-600">Your answer: {selected || "none"}) {selected_label || "—"}</span>
                  <span className="mx-2">|</span>
                  <span className="text-green-700">Correct: {correct}) {correct_label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!checked && <button onClick={onCheck} disabled={!allAnswered} className="mt-5 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white disabled:opacity-40">{allAnswered ? "Check Answers" : `Answer all items (${Object.keys(userAnswers).length}/${question.items.length})`}</button>}
      {checked && <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${question.items.every((_, i) => isCorrect(i)) ? "bg-green-100 text-green-700" : "bg-[#f7eee8] text-[#7a6258]"}`}>{question.items.filter((_, i) => isCorrect(i)).length}/{question.items.length} correct</div>}
    </div>
  );
}

// ─── Map View ─────────────────────────────────────────────────────────────────

function MapView({ question, userAnswers, checked, playsUsed, maxPlays, isPlaying, onAnswer, onCheck, onPlay }: {
  question: MapQuestion; userAnswers: Record<number, string>; checked: boolean;
  playsUsed: number; maxPlays: number; isPlaying: boolean;
  onAnswer: (pointId: number, optionKey: string) => void; onCheck: () => void; onPlay: () => void;
}) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);
  const canPlay = playsUsed < maxPlays;
  const correctCount = checked ? question.points.filter(p => userAnswers[p.id] === p.answer).length : 0;

  const getPointColor = (point: MapPoint) => {
    if (!checked) {
      if (selectedPoint === point.id) return "bg-blue-600 border-white ring-2 ring-blue-300";
      if (userAnswers[point.id]) return "bg-blue-500 border-white";
      return "bg-[#3b2f2f] border-white";
    }
    return userAnswers[point.id] === point.answer ? "bg-green-500 border-white" : "bg-red-500 border-white";
  };

  return (
    <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🗺️ Map Labelling</h3><span className="text-sm text-[#7a6258]">{playsUsed}/{maxPlays} plays</span></div>
      <button onClick={onPlay} disabled={!canPlay || isPlaying} className={`mb-5 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 font-bold transition ${canPlay && !isPlaying ? "bg-[#3b2f2f] text-white hover:bg-[#2f2424]" : "cursor-not-allowed bg-[#e0c7bb] text-[#7a6258]"}`}>
        {isPlaying ? "🔊 Playing..." : canPlay ? `▶ Play${playsUsed > 0 ? " Again" : " Audio"}` : "No plays left"}
      </button>
      {playsUsed > 0 && (
        <>
          <p className="mb-3 text-sm text-[#7a6258]">{!checked ? (selectedPoint ? `Point ${selectedPoint} selected — choose an option below` : "Tap a numbered point on the map, then select an answer") : `${correctCount}/${question.points.length} correct`}</p>
          <div className="relative w-full overflow-hidden rounded-[2rem] border-2 border-[#e0c7bb] bg-white" style={{ paddingBottom: "65%" }}>
            <img src={question.imageUrl} alt="Map" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
            {question.points.map(point => (
              <button key={point.id} disabled={checked} onClick={() => setSelectedPoint(selectedPoint === point.id ? null : point.id)}
                className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow-lg transition ${getPointColor(point)} ${!checked ? "hover:scale-110 active:scale-95" : ""}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}>{point.id}</button>
            ))}
          </div>
          {!checked && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7a6258]">Options — {selectedPoint ? `Answering Point ${selectedPoint}` : "Select a point first"}</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {question.options.map(opt => {
                  const isAssigned = Object.entries(userAnswers).some(([pid, key]) => key === opt.key && Number(pid) !== selectedPoint);
                  const isSelectedForThisPoint = selectedPoint !== null && userAnswers[selectedPoint] === opt.key;
                  return (
                    <button key={opt.key} disabled={!selectedPoint} onClick={() => { if (selectedPoint !== null) { onAnswer(selectedPoint, opt.key); setSelectedPoint(null); } }}
                      className={`rounded-2xl border p-3 text-left text-sm transition ${isSelectedForThisPoint ? "border-blue-400 bg-blue-50 font-bold" : isAssigned ? "border-[#c9a99a] bg-[#f7eee8] opacity-60" : selectedPoint ? "border-[#e0c7bb] bg-white hover:border-[#3b2f2f] hover:bg-[#ead7cc]" : "border-[#e0c7bb] bg-white opacity-50 cursor-not-allowed"}`}>
                      <span className="font-bold">{opt.key})</span> {opt.label}
                    </button>
                  );
                })}
              </div>
              {Object.keys(userAnswers).length > 0 && (
                <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#7a6258] mb-2">Your answers so far:</p>
                  <div className="flex flex-wrap gap-2">
                    {question.points.map(point => userAnswers[point.id] ? (
                      <div key={point.id} className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-xs">{point.id}</span>
                        → {userAnswers[point.id]}) {question.options.find(o => o.key === userAnswers[point.id])?.label}
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}
              <button onClick={onCheck} disabled={Object.keys(userAnswers).length < question.points.length} className="mt-4 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white disabled:opacity-40">
                {Object.keys(userAnswers).length < question.points.length ? `Answer all points (${Object.keys(userAnswers).length}/${question.points.length})` : "Check Answers"}
              </button>
            </div>
          )}
          {checked && (
            <div className="mt-4">
              <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${correctCount === question.points.length ? "bg-green-100 text-green-700" : correctCount >= question.points.length / 2 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                {correctCount === question.points.length ? "🎯 Perfect! All correct!" : `${correctCount}/${question.points.length} correct`}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {question.points.map(point => {
                  const isCorrect = userAnswers[point.id] === point.answer;
                  const correctOption = question.options.find(o => o.key === point.answer);
                  const userOption = question.options.find(o => o.key === userAnswers[point.id]);
                  return (
                    <div key={point.id} className={`rounded-2xl border p-3 ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>{point.id}</div>
                        <p className={`text-sm font-semibold ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                          {isCorrect ? `✓ ${correctOption?.key}) ${correctOption?.label}` : `✗ You: ${userOption?.key || "?"}) ${userOption?.label || "No answer"} → Correct: ${correctOption?.key}) ${correctOption?.label}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {question.points.some(p => p.explanation) && (
                <button onClick={() => setShowExplanations(!showExplanations)} className="mt-4 w-full rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 text-sm font-semibold hover:bg-[#f1ded5]">
                  {showExplanations ? "Hide Explanations ▲" : "💡 View Explanations ▼"}
                </button>
              )}
              {showExplanations && (
                <div className="mt-3 flex flex-col gap-3">
                  {question.points.filter(p => p.explanation).map(point => {
                    const opt = question.options.find(o => o.key === point.answer);
                    return (
                      <div key={point.id} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                        <div className="flex items-center gap-2 mb-2"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">{point.id}</div><p className="text-sm font-bold">{opt?.key}) {opt?.label}</p></div>
                        <p className="text-sm text-[#7a6258]">{point.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Comments Panel ───────────────────────────────────────────────────────────

function CommentsPanel({ episodeId, userEmail }: { episodeId: string; userEmail: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchComments(); }, [episodeId]);

  async function fetchComments() {
    const { data, error } = await supabase.from("comments").select("*").eq("episode_id", episodeId).order("created_at", { ascending: true });
    if (!error && data) setComments(data);
    setLoading(false);
  }
  async function submitComment() {
    if (!newComment.trim()) return; setSubmitting(true);
    await supabase.from("comments").insert([{ episode_id: episodeId, user_email: userEmail, content: newComment.trim(), parent_id: null }]);
    setNewComment(""); await fetchComments(); setSubmitting(false);
  }
  async function submitReply(parentId: string) {
    if (!replyText.trim()) return; setSubmitting(true);
    await supabase.from("comments").insert([{ episode_id: episodeId, user_email: userEmail, content: replyText.trim(), parent_id: parentId }]);
    setReplyText(""); setReplyTo(null); await fetchComments(); setSubmitting(false);
  }

  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);
  const getInitial = (email: string) => email.charAt(0).toUpperCase();
  const getDisplayName = (email: string) => email.split("@")[0];

  return (
    <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
      <h3 className="text-lg font-bold">💬 Discussion</h3>
      <p className="mt-1 text-sm text-[#7a6258]">Ask questions or share tips about this practice.</p>
      <div className="mt-5">
        <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." className="min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm" />
        <button onClick={submitComment} disabled={submitting || !newComment.trim()} className="mt-2 rounded-2xl bg-[#3b2f2f] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">{submitting ? "Posting..." : "Post Comment"}</button>
      </div>
      {loading ? <p className="mt-4 text-sm text-[#7a6258]">Loading comments...</p> :
        topLevel.length === 0 ? <p className="mt-4 text-sm text-[#7a6258]">No comments yet. Be the first!</p> : (
          <div className="mt-6 flex flex-col gap-4">
            {topLevel.map(comment => (
              <div key={comment.id} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">{getInitial(comment.user_email)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><p className="text-sm font-bold">{getDisplayName(comment.user_email)}</p><p className="text-xs text-[#7a6258]">{formatDate(comment.created_at)}</p></div>
                    <p className="mt-1 text-sm text-[#3b2f2f]">{comment.content}</p>
                    <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="mt-2 text-xs font-semibold text-[#7a6258] hover:text-[#3b2f2f]">{replyTo === comment.id ? "Cancel" : "Reply"}</button>
                  </div>
                </div>
                {replyTo === comment.id && (
                  <div className="mt-3 ml-11">
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." className="min-h-[60px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                    <button onClick={() => submitReply(comment.id)} disabled={submitting || !replyText.trim()} className="mt-2 rounded-2xl bg-[#3b2f2f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{submitting ? "Posting..." : "Post Reply"}</button>
                  </div>
                )}
                {getReplies(comment.id).length > 0 && (
                  <div className="mt-3 ml-11 flex flex-col gap-3">
                    {getReplies(comment.id).map(reply => (
                      <div key={reply.id} className="rounded-2xl border border-[#e0c7bb] bg-[#f7eee8] p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c9a99a] text-xs font-bold text-white">{getInitial(reply.user_email)}</div>
                          <div>
                            <div className="flex items-center gap-2"><p className="text-xs font-bold">{getDisplayName(reply.user_email)}</p><p className="text-xs text-[#7a6258]">{formatDate(reply.created_at)}</p></div>
                            <p className="mt-1 text-sm text-[#3b2f2f]">{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── Main QuizScreen ──────────────────────────────────────────────────────────

export default function QuizScreen({ episodeId, onBack, onNextEpisode }: Props) {
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

  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string[]>>({});
  const [mcqConfirmed, setMcqConfirmed] = useState<Record<number, boolean>>({});
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
  const [matchingAnswers, setMatchingAnswers] = useState<Record<number, Record<number, string>>>({});
  const [matchingChecked, setMatchingChecked] = useState<Record<number, boolean>>({});
  const [mapAnswers, setMapAnswers] = useState<Record<number, string>>({});
  const [mapChecked, setMapChecked] = useState(false);
  const [mapPlays, setMapPlays] = useState(0);
  const [mapPlaying, setMapPlaying] = useState(false);
  const mapAudioRef = useRef<HTMLAudioElement | null>(null);

  // IELTS Section state
  const [ieltsPartIndex, setIeltsPartIndex] = useState(0);
  const [ieltsGroupIndex, setIeltsGroupIndex] = useState(0);
  const [ieltsAnswers, setIeltsAnswers] = useState<Record<string, any>>({});
  const [ieltsChecked, setIeltsChecked] = useState<Record<string, boolean>>({});
  const [ieltsAudioPlaying, setIeltsAudioPlaying] = useState(false);
  const ieltsAudioRef = useRef<HTMLAudioElement | null>(null);

  const [showResults, setShowResults] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);

  useEffect(() => {
    async function fetchEpisode() {
      const { data, error } = await supabase.from("episodes").select("*").eq("id", episodeId).single();
      if (!error && data) {
        setEpisode(data);
        const { data: allEpisodes } = await supabase.from("episodes").select("id, title, level, audio_url, episode_type, questions, show_notes").eq("level", data.level).eq("episode_type", data.episode_type).order("created_at", { ascending: true });
        if (allEpisodes) { const idx = allEpisodes.findIndex(e => e.id === episodeId); if (idx !== -1 && idx < allEpisodes.length - 1) setNextEpisode(allEpisodes[idx + 1]); }
      }
      setLoading(false);
    }
    async function getUser() { const { data: { user } } = await supabase.auth.getUser(); if (user?.email) setUserEmail(user.email); }
    fetchEpisode(); getUser();
  }, [episodeId]);

  function toggleMainAudio() {
    const audio = audioRef.current; if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); } else { audio.play(); setIsPlaying(true); }
  }

  function calculateScore() {
    if (!episode) return { correct: 0, total: 0 };
    let correct = 0, total = 0;
    const episodeType = episode.episode_type;

    // IELTS Section — separate calculation (different data structure)
    if (episodeType === "ielts-section") {
      const parts = episode.questions as unknown as IELTSSectionPart[];
      parts?.forEach(part => {
        part.groups?.forEach(group => {
          if (group.type === "note-completion" || group.type === "form-completion") {
            const items = group.data?.items || group.data?.fields || [];
            items.forEach((_: any, bi: number) => {
              total++;
              const key = `${part.part}-${group.id}-${bi}`;
              const userAns = ieltsAnswers[key] || "";
              const correctAns = group.data?.items?.[bi]?.answer || group.data?.fields?.[bi]?.answer || "";
              if (checkAnswer(userAns, correctAns)) correct++;
            });
          } else if (group.type === "sentence-completion") {
            (group.data?.items || []).forEach((_: any, bi: number) => {
              total++;
              const key = `${part.part}-${group.id}-${bi}`;
              const userAns = ieltsAnswers[key] || "";
              const correctAns = group.data?.items?.[bi]?.answer || "";
              if (checkAnswer(userAns, correctAns)) correct++;
            });
          } else if (group.type === "mcq") {
            (group.data || []).forEach((q: any, qi: number) => {
              total++;
              const key = `${part.part}-${group.id}-${qi}`;
              const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
              const userArr = ieltsAnswers[key] || [];
              if (correctArr.length === userArr.length && correctArr.every((c: string) => userArr.includes(c))) correct++;
            });
          } else if (group.type === "matching") {
            (group.data?.items || []).forEach((_: any, ii: number) => {
              total++;
              const key = `${part.part}-${group.id}-${ii}`;
              if (ieltsAnswers[key] === group.data?.answers?.[String(ii)]) correct++;
            });
          } else if (group.type === "map") {
            (group.data?.points || []).forEach((p: any) => {
              total++;
              const key = `${part.part}-${group.id}-${p.id}`;
              if (ieltsAnswers[key] === p.answer) correct++;
            });
          }
        });
      });
      return { correct, total };
    }

    // All other types
    episode.questions.forEach((q, i) => {
      if (episodeType === "practice-mcq" || episodeType?.startsWith("quiz-")) {
        const mq = q as MCQQuestion;
        const correctArr = Array.isArray(mq.correctAnswer) ? (mq.correctAnswer as string[]) : [mq.correctAnswer as string];
        const userArr = mcqAnswers[i] || [];
        total++;
        if (correctArr.length === userArr.length && correctArr.every(c => userArr.includes(c))) correct++;
      } else if (episodeType === "practice-fill") {
        (q as FillQuestion).blanks.forEach((_, bi) => { total++; if (fillFeedback[i]?.[bi] === true) correct++; });
      } else if (episodeType === "practice-dictation") {
        total++; if (dictationFeedback[i] === true) correct++;
      } else if (episodeType === "practice-short") {
        total++; if (shortFeedback[i] === true) correct++;
      } else if (episodeType === "practice-matching") {
        const mq = q as MatchingQuestion;
        mq.items.forEach((_, pi) => { total++; if (matchingAnswers[i]?.[pi] === mq.answers[String(pi)]) correct++; });
      } else if (episodeType === "practice-map") {
        const mq = q as MapQuestion;
        mq.points.forEach(p => { total++; if (mapAnswers[p.id] === p.answer) correct++; });
      }
    });
    return { correct, total };
  }

  async function saveResult() {
    if (!episode || resultSaved) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { correct, total } = calculateScore();
    await supabase.from("user_results").insert([{ user_email: user.email, episode_id: episode.id, episode_title: episode.title, level: episode.level, episode_type: episode.episode_type, score: correct, total_questions: total }]);
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
  const isMap = episodeType === "practice-map";
  const isIELTSSection = episodeType === "ielts-section";

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

        {/* ─── MCQ — Listening phase ─── */}
        {isMCQ && !testStarted && (
          <div className="mt-8">
            <audio ref={audioRef} src={episode.audio_url}
              onTimeUpdate={() => { const a = audioRef.current; if (a) setAudioProgress((a.currentTime / a.duration) * 100); }}
              onLoadedMetadata={() => { const a = audioRef.current; if (a) setAudioDuration(a.duration); }}
              onEnded={() => setIsPlaying(false)} />
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

        {/* ─── MCQ — Questions phase ─── */}
        {isMCQ && testStarted && !showResults && question && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#7a6258]">Question {currentQuestion + 1} of {questions.length}</p>
              <div className="flex gap-1">{questions.map((_, i) => <div key={i} className={`h-2 w-2 rounded-full ${i === currentQuestion ? "bg-[#3b2f2f]" : mcqConfirmed[i] ? "bg-[#c9a99a]" : "bg-[#e0c7bb]"}`} />)}</div>
            </div>
            <MCQQuestionView
              question={question as MCQQuestion}
              selectedAnswers={mcqAnswers[currentQuestion] || []}
              confirmed={mcqConfirmed[currentQuestion] || false}
              onToggle={letter => {
                if (mcqConfirmed[currentQuestion]) return;
                const q = question as MCQQuestion;
                const correctArr = Array.isArray(q.correctAnswer) ? (q.correctAnswer as string[]) : [q.correctAnswer as string];
                const current = mcqAnswers[currentQuestion] || [];
                let next: string[];
                if (correctArr.length === 1) { next = [letter]; }
                else { next = current.includes(letter) ? current.filter(a => a !== letter) : current.length < correctArr.length ? [...current, letter].sort() : current; }
                setMcqAnswers({ ...mcqAnswers, [currentQuestion]: next });
              }}
              onConfirm={() => setMcqConfirmed({ ...mcqConfirmed, [currentQuestion]: true })}
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

        {/* ─── Fill ─── */}
        {isFill && !showResults && (
          <div className="mt-8">
            <audio ref={audioRef} src={episode.audio_url}
              onTimeUpdate={() => { const a = audioRef.current; if (a) setAudioProgress((a.currentTime / a.duration) * 100); }}
              onLoadedMetadata={() => { const a = audioRef.current; if (a) setAudioDuration(a.duration); }}
              onEnded={() => setIsPlaying(false)} />
            <AudioPlayer isPlaying={isPlaying} progress={audioProgress} duration={audioDuration} audioRef={audioRef}
              onToggle={() => { if (!testStarted) setTestStarted(true); toggleMainAudio(); }}
              title={episode.title} level={episode.level} />
            {testStarted && (
              <>
                <div className="mt-6 flex flex-col gap-6">
                  {questions.map((q, i) => (
                    <FillQuestionView key={i} question={q as FillQuestion} answers={fillAnswers[i] || {}} feedback={fillFeedback[i] || {}}
                      onCheck={ans => {
                        const fb: Record<number, boolean> = {};
                        (q as FillQuestion).blanks.forEach((b, bi) => { fb[bi] = checkAnswer(ans[bi] || "", b.answer); });
                        setFillAnswers({ ...fillAnswers, [i]: ans }); setFillFeedback({ ...fillFeedback, [i]: fb });
                      }}
                      onUpdate={ans => setFillAnswers({ ...fillAnswers, [i]: ans })} />
                  ))}
                </div>
                <button onClick={async () => { setShowResults(true); await saveResult(); }} className="mt-8 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white">Finish ✓</button>
              </>
            )}
          </div>
        )}

        {/* ─── Dictation — Intro ─── */}
        {isDictation && !testStarted && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm text-center">
            <p className="text-lg font-bold">🎙️ Dictation Practice</p>
            <p className="mt-2 text-sm text-[#7a6258]">Listen carefully and type exactly what you hear. You have <strong>2 plays</strong> per sentence.</p>
            <button onClick={() => setTestStarted(true)} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-semibold text-white">Start Dictation</button>
          </div>
        )}

        {/* ─── Dictation — Questions ─── */}
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
              maxPlays={2}
              isPlaying={dictationPlaying}
              onChange={v => setDictationAnswers({ ...dictationAnswers, [currentQuestion]: v })}
              onPlay={() => {
                const audio = dictationAudioRef.current; if (!audio) return;
                const plays = dictationPlays[currentQuestion] || 0; if (plays >= 2) return;
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

        {/* ─── Short Answer — Intro ─── */}
        {isShort && !testStarted && (
          <div className="mt-8">
            <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm text-center mb-4">
              <p className="text-lg font-bold">✍️ Short Answer Practice</p>
              <p className="mt-2 text-sm text-[#7a6258]">Listen carefully, then answer each question in 1–3 words.</p>
              <button onClick={() => setTestStarted(true)} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-semibold text-white">Start</button>
            </div>
            <audio ref={audioRef} src={episode.audio_url}
              onTimeUpdate={() => { const a = audioRef.current; if (a) setAudioProgress((a.currentTime / a.duration) * 100); }}
              onLoadedMetadata={() => { const a = audioRef.current; if (a) setAudioDuration(a.duration); }}
              onEnded={() => setIsPlaying(false)} />
            <AudioPlayer isPlaying={isPlaying} progress={audioProgress} duration={audioDuration} audioRef={audioRef} onToggle={toggleMainAudio} title={episode.title} level={episode.level} />
          </div>
        )}

        {/* ─── Short Answer — Questions ─── */}
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
              onChange={v => setShortAnswers({ ...shortAnswers, [currentQuestion]: v })}
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

        {/* ─── Matching — Intro ─── */}
        {isMatching && !testStarted && (
          <div className="mt-8">
            <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm text-center mb-4">
              <p className="text-lg font-bold">🔗 Matching Practice</p>
              <p className="mt-2 text-sm text-[#7a6258]">Listen carefully, then match each item with the correct option.</p>
              <button onClick={() => setTestStarted(true)} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-semibold text-white">Start Matching</button>
            </div>
            <audio ref={audioRef} src={episode.audio_url}
              onTimeUpdate={() => { const a = audioRef.current; if (a) setAudioProgress((a.currentTime / a.duration) * 100); }}
              onLoadedMetadata={() => { const a = audioRef.current; if (a) setAudioDuration(a.duration); }}
              onEnded={() => setIsPlaying(false)} />
            <AudioPlayer isPlaying={isPlaying} progress={audioProgress} duration={audioDuration} audioRef={audioRef} onToggle={toggleMainAudio} title={episode.title} level={episode.level} />
          </div>
        )}

        {/* ─── Matching — Questions ─── */}
        {isMatching && testStarted && !showResults && (
          <div className="mt-8 flex flex-col gap-6">
            {questions.map((q, i) => (
              <MatchingView key={i} question={q as MatchingQuestion} userAnswers={matchingAnswers[i] || {}} checked={matchingChecked[i] || false}
                onAnswer={(itemIndex, optionKey) => setMatchingAnswers({ ...matchingAnswers, [i]: { ...(matchingAnswers[i] || {}), [itemIndex]: optionKey } })}
                onCheck={() => setMatchingChecked({ ...matchingChecked, [i]: true })} />
            ))}
            <button onClick={async () => { setShowResults(true); await saveResult(); }} className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white">Finish ✓</button>
          </div>
        )}

        {/* ─── Map — Intro ─── */}
        {isMap && !testStarted && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm text-center">
            <p className="text-lg font-bold">🗺️ Map Labelling</p>
            <p className="mt-2 text-sm text-[#7a6258]">Listen to the audio, then label the locations on the map. You have <strong>2 plays</strong>.</p>
            <button onClick={() => setTestStarted(true)} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-semibold text-white">Start Map Exercise</button>
          </div>
        )}

        {/* ─── Map — Questions ─── */}
        {isMap && testStarted && !showResults && questions[0] && (
          <div className="mt-8">
            <audio ref={mapAudioRef} src={episode.audio_url} onEnded={() => setMapPlaying(false)} />
            <MapView
              question={questions[0] as MapQuestion}
              userAnswers={mapAnswers}
              checked={mapChecked}
              playsUsed={mapPlays}
              maxPlays={2}
              isPlaying={mapPlaying}
              onAnswer={(pointId, optionKey) => setMapAnswers(prev => ({ ...prev, [pointId]: optionKey }))}
              onCheck={() => setMapChecked(true)}
              onPlay={() => {
                const audio = mapAudioRef.current; if (!audio || mapPlays >= 2) return;
                setMapPlays(prev => prev + 1); audio.currentTime = 0; audio.play(); setMapPlaying(true);
              }}
            />
            {mapChecked && <button onClick={async () => { setShowResults(true); await saveResult(); }} className="mt-6 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white">Finish ✓</button>}
          </div>
        )}

        {/* ─── IELTS Section — Intro ─── */}
        {isIELTSSection && !testStarted && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm text-center">
            <p className="text-lg font-bold">🎧 IELTS Listening Practice</p>
            <p className="mt-2 text-sm text-[#7a6258]">Listen to the audio carefully. You will answer questions as you listen.</p>
            <p className="mt-2 text-xs text-[#7a6258]">💡 Read the questions before pressing play.</p>
            <button onClick={() => setTestStarted(true)} className="mt-6 rounded-2xl bg-[#3b2f2f] px-8 py-4 font-semibold text-white">Start Practice</button>
          </div>
        )}

        {/* ─── IELTS Section — Questions ─── */}
        {isIELTSSection && testStarted && !showResults && (() => {
          const parts = (episode.questions as unknown as IELTSSectionPart[]) || [];
          const part = parts[ieltsPartIndex];
          if (!part) return null;
          const group = part.groups?.[ieltsGroupIndex];
          const isLastGroup = ieltsGroupIndex >= (part.groups?.length || 0) - 1;
          const isLastPart = ieltsPartIndex >= parts.length - 1;
          const isSection4 = parts.length === 1;

          function nextGroup() {
            if (!isLastGroup) { setIeltsGroupIndex(i => i + 1); }
            else if (!isLastPart) { setIeltsPartIndex(i => i + 1); setIeltsGroupIndex(0); setIeltsAudioPlaying(false); if (ieltsAudioRef.current) ieltsAudioRef.current.pause(); }
            else { setShowResults(true); saveResult(); }
          }

          return (
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#7a6258]">Part {ieltsPartIndex + 1} of {parts.length} — Group {ieltsGroupIndex + 1} of {part.groups?.length || 1}</p>
                {!isSection4 && <span className={`rounded-full px-3 py-1 text-xs font-bold ${ieltsPartIndex === 0 ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>{ieltsPartIndex === 0 ? "Part 1" : "Part 2"}</span>}
              </div>

              <audio ref={ieltsAudioRef} src={part.audioUrl} onEnded={() => setIeltsAudioPlaying(false)} />
              <button onClick={() => {
                const audio = ieltsAudioRef.current; if (!audio) return;
                if (ieltsAudioPlaying) { audio.pause(); setIeltsAudioPlaying(false); } else { audio.play(); setIeltsAudioPlaying(true); }
              }} className={`mb-5 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 font-bold transition ${ieltsAudioPlaying ? "bg-[#c9a99a] text-white" : "bg-[#3b2f2f] text-white hover:bg-[#2f2424]"}`}>
                {ieltsAudioPlaying ? "⏸ Pause Audio" : "▶ Play Audio"}
              </button>

              {group?.wordLimit && <div className="mb-4 rounded-2xl bg-[#ead7cc] px-4 py-2 text-sm font-semibold text-[#3b2f2f]">✏️ Write {group.wordLimit}</div>}
              <p className="mb-3 text-sm font-bold text-[#7a6258] uppercase tracking-wide">{group?.label}</p>

              {/* Note/Form Completion */}
              {(group?.type === "note-completion" || group?.type === "form-completion") && (() => {
                const items = group.data?.items || group.data?.fields || [];
                return (
                  <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
                    {group.data?.title && <p className="font-bold mb-4">{group.data.title}</p>}
                    <div className="flex flex-col gap-3">
                      {items.map((item: any, bi: number) => {
                        const key = `${part.part}-${group.id}-${bi}`;
                        const checked = ieltsChecked[key];
                        const userAns = ieltsAnswers[key] || "";
                        const isCorrect = checked && checkAnswer(userAns, item.answer);
                        return (
                          <div key={bi} className="flex items-center gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">{bi + 1}</span>
                            <span className="text-sm flex-1">{item.label.replace("___", "")}</span>
                            <input type="text" value={userAns} onChange={e => setIeltsAnswers(prev => ({ ...prev, [key]: e.target.value }))} disabled={!!checked}
                              className={`w-32 rounded-xl border px-2 py-1 text-sm text-center font-semibold ${checked ? (isCorrect ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700") : "border-[#3b2f2f] bg-white"}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Sentence Completion */}
              {group?.type === "sentence-completion" && (() => {
                const items = group.data?.items || [];
                return (
                  <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
                    <div className="flex flex-col gap-4">
                      {items.map((item: any, bi: number) => {
                        const key = `${part.part}-${group.id}-${bi}`;
                        const checked = ieltsChecked[key];
                        const userAns = ieltsAnswers[key] || "";
                        const isCorrect = checked && checkAnswer(userAns, item.answer);
                        const parts2 = item.text.split("___");
                        return (
                          <div key={bi} className="flex items-center flex-wrap gap-1 text-sm">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white mr-1">{bi + 1}</span>
                            <span>{parts2[0]}</span>
                            <input type="text" value={userAns} onChange={e => setIeltsAnswers(prev => ({ ...prev, [key]: e.target.value }))} disabled={!!checked}
                              className={`w-28 rounded-xl border px-2 py-1 text-sm text-center font-semibold ${checked ? (isCorrect ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700") : "border-[#3b2f2f] bg-white"}`} />
                            {parts2[1] && <span>{parts2[1]}</span>}
                            {checked && !isCorrect && <span className="text-xs text-red-600 ml-1">→ {item.answer.split("|")[0]}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* MCQ */}
              {group?.type === "mcq" && (
                <div className="flex flex-col gap-4">
                  {(group.data || []).map((q: any, qi: number) => {
                    const key = `${part.part}-${group.id}-${qi}`;
                    const confirmed = ieltsChecked[key] || false;
                    const selected = ieltsAnswers[key] || [];
                    return (
                      <MCQQuestionView key={qi} question={q as MCQQuestion} selectedAnswers={selected} confirmed={confirmed}
                        onToggle={letter => {
                          if (confirmed) return;
                          const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                          const current = selected;
                          let next: string[];
                          if (correctArr.length === 1) { next = [letter]; }
                          else { next = current.includes(letter) ? current.filter((a: string) => a !== letter) : current.length < correctArr.length ? [...current, letter].sort() : current; }
                          setIeltsAnswers(prev => ({ ...prev, [key]: next }));
                        }}
                        onConfirm={() => setIeltsChecked(prev => ({ ...prev, [key]: true }))}
                      />
                    );
                  })}
                </div>
              )}

              {/* Matching */}
              {group?.type === "matching" && (
                <MatchingView
                  question={group.data as MatchingQuestion}
                  userAnswers={(() => {
                    const ans: Record<number, string> = {};
                    (group.data?.items || []).forEach((_: any, ii: number) => {
                      const val = ieltsAnswers[`${part.part}-${group.id}-${ii}`];
                      if (val) ans[ii] = val;
                    });
                    return ans;
                  })()}
                  checked={ieltsChecked[`${part.part}-${group.id}-checked`] || false}
                  onAnswer={(itemIndex, optionKey) => setIeltsAnswers(prev => ({ ...prev, [`${part.part}-${group.id}-${itemIndex}`]: optionKey }))}
                  onCheck={() => setIeltsChecked(prev => ({ ...prev, [`${part.part}-${group.id}-checked`]: true }))}
                />
              )}

              {/* Map */}
              {group?.type === "map" && (
                <MapView
                  question={group.data as MapQuestion}
                  userAnswers={Object.fromEntries(
                    (group.data?.points || []).map((p: any) => [p.id, ieltsAnswers[`${part.part}-${group.id}-${p.id}`] || ""])
                  )}
                  checked={ieltsChecked[`${part.part}-${group.id}-checked`] || false}
                  playsUsed={0} maxPlays={99} isPlaying={false}
                  onAnswer={(pointId, optionKey) => setIeltsAnswers(prev => ({ ...prev, [`${part.part}-${group.id}-${pointId}`]: optionKey }))}
                  onCheck={() => setIeltsChecked(prev => ({ ...prev, [`${part.part}-${group.id}-checked`]: true }))}
                  onPlay={() => {}}
                />
              )}

              {/* Check + Next buttons */}
              <div className="mt-6 flex gap-3">
                {(group?.type === "note-completion" || group?.type === "form-completion" || group?.type === "sentence-completion") && (
                  <button onClick={() => {
                    const items = group.data?.items || group.data?.fields || [];
                    const newChecked = { ...ieltsChecked };
                    items.forEach((_: any, bi: number) => { newChecked[`${part.part}-${group.id}-${bi}`] = true; });
                    setIeltsChecked(newChecked);
                  }} className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3 font-semibold text-sm">Check Answers</button>
                )}
                <button onClick={nextGroup} className="flex-1 rounded-2xl bg-[#3b2f2f] px-4 py-3 font-semibold text-white text-sm">
                  {isLastGroup && isLastPart ? "Finish ✓" : isLastGroup && !isLastPart ? "Next Part →" : "Next Group →"}
                </button>
              </div>
            </div>
          );
        })()}

        {/* ─── Results ─── */}
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
              {nextEpisode && <button onClick={() => onNextEpisode(nextEpisode.id)} className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white">Next Practice →</button>}
              <button onClick={onBack} className="w-full rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f]">Back to Practices</button>
            </div>
          </div>
        )}

        {/* ─── Comments ─── */}
        <div className="mt-8">
          <button onClick={() => setShowComments(!showComments)} className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 font-semibold transition ${showComments ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
            <span>💬 Discussion</span>
            <span className="text-sm">{showComments ? "Hide ▲" : "Show ▼"}</span>
          </button>
          {showComments && userEmail && <CommentsPanel episodeId={episodeId} userEmail={userEmail} />}
          {showComments && !userEmail && <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4 text-center text-sm text-[#7a6258]">Please log in to view and post comments.</div>}
        </div>
      </section>

      {/* ─── Floating Notes ─── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showNotesPanel && (
          <div className="w-80 rounded-[2rem] border border-[#e0c7bb] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e0c7bb] px-5 py-4">
              <p className="font-bold">📝 My Notes</p>
              <button onClick={() => setShowNotesPanel(false)} className="text-[#7a6258] hover:text-[#3b2f2f]">✕</button>
            </div>
            <div className="p-4">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Write your notes here..." className="min-h-[200px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
              {notes && <p className="mt-2 text-right text-xs text-[#7a6258]">{notes.length} chars</p>}
            </div>
          </div>
        )}
        <button onClick={() => setShowNotesPanel(!showNotesPanel)} className={`flex items-center gap-2 rounded-full px-5 py-3 font-bold shadow-xl transition ${showNotesPanel ? "bg-[#ead7cc] text-[#3b2f2f]" : "bg-[#3b2f2f] text-white hover:bg-[#2f2424]"}`}>
          📝 {showNotesPanel ? "Close" : "Notes"}
          {notes && !showNotesPanel && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c9a99a] text-xs text-white">✓</span>}
        </button>
      </div>
    </main>
  );
}
