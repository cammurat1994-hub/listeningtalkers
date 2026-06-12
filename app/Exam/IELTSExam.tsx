"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Section = {
  number: number;
  audioUrl: string;
  questionGroups: { type: string; label: string; data: unknown }[];
};

type Props = {
  title: string;
  examType: string;
  sections: Section[];
  answers: Record<string, string>;
  onUpdateAnswers: (answers: Record<string, string>) => void;
  onFinish: () => void;
  onBack: () => void;
};

type Phase =
  | { type: "reading"; sectionIndex: number; countdown: number }
  | { type: "listening"; sectionIndex: number }
  | { type: "checking"; sectionIndex: number; countdown: number }
  | { type: "review"; countdown: number }
  | { type: "done" };

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function normalize(str: string) {
  return str.toLowerCase().trim().replace(/[.,!?;:'"]/g, "");
}

function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  return correctAnswer.split("|").map(normalize).some(v => v === normalize(userAnswer));
}

// ─── Question Renderers ───────────────────────────────────────────────────────

function MCQRenderer({ group, sectionNum, answers, onAnswer, locked }: {
  group: { label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  const qs = (Array.isArray(group.data) ? group.data : []) as { question: string; options: Record<string, string>; correctAnswer: string; explanation?: string }[];
  if (!qs.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {qs.map((q, i) => {
        const key = `${sectionNum}-${group.label}-mcq-${i}`;
        return (
          <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-5">
            <p className="font-semibold text-sm mb-3">{i + 1}. {q.question}</p>
            <div className="flex flex-col gap-2">
              {(["A","B","C","D","E"] as const).filter(l => q.options[l]).map(letter => {
                const isSelected = answers[key] === letter;
                const showCorrect = locked && q.correctAnswer === letter;
                const showWrong = locked && isSelected && letter !== q.correctAnswer;
                return (
                  <button key={letter} disabled={locked} onClick={() => onAnswer(key, letter)}
                    className={`rounded-2xl border p-3 text-left text-sm transition ${showCorrect ? "border-green-400 bg-green-50" : showWrong ? "border-red-400 bg-red-50" : isSelected ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
                    <span className="font-bold">{letter}.</span> {q.options[letter]}
                  </button>
                );
              })}
            </div>
            {locked && q.explanation && (
              <div className="mt-3 rounded-2xl border border-[#e0c7bb] bg-[#f7eee8] p-3">
                <p className="text-xs font-bold text-[#7a6258]">💡 {q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NoteFormRenderer({ group, sectionNum, answers, onAnswer, locked }: {
  group: { type: string; label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  const data = group.data as { title?: string; items?: { label: string; answer: string }[]; fields?: { label: string; answer: string }[] };
  const items = data?.items || data?.fields || [];
  return (
    <div className="rounded-2xl border border-[#e0c7bb] bg-white p-5">
      {data?.title && <p className="font-bold mb-4 text-center border-b border-[#e0c7bb] pb-3">{data.title}</p>}
      <div className="flex flex-col gap-3">
        {items.map((item, i) => {
          const key = `${sectionNum}-${group.label}-item-${i}`;
          const userAns = answers[key] || "";
          const isCorrect = locked && checkAnswer(userAns, item.answer);
          const parts = item.label.split("___");
          return (
            <div key={i} className="flex items-center gap-2 flex-wrap text-sm">
              <span>{parts[0]}</span>
              <input type="text" value={userAns} onChange={e => onAnswer(key, e.target.value)} disabled={locked}
                className={`rounded-xl border px-3 py-1.5 text-sm w-32 text-center font-semibold ${locked ? (isCorrect ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700") : "border-[#3b2f2f] bg-white"}`} />
              {parts[1] && <span>{parts[1]}</span>}
              {locked && !isCorrect && <span className="text-xs text-green-600 font-semibold">✓ {item.answer.split("|")[0]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SentenceRenderer({ group, sectionNum, answers, onAnswer, locked }: {
  group: { label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  const items = (group.data as { items?: { text: string; answer: string }[] })?.items || [];
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const key = `${sectionNum}-${group.label}-sent-${i}`;
        const userAns = answers[key] || "";
        const isCorrect = locked && checkAnswer(userAns, item.answer);
        const parts = item.text.split("___");
        return (
          <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm flex items-center gap-1 flex-wrap">
            <span className="font-semibold text-[#7a6258] mr-1">{i + 1}.</span>
            <span>{parts[0]}</span>
            <input type="text" value={userAns} onChange={e => onAnswer(key, e.target.value)} disabled={locked}
              className={`rounded-xl border px-2 py-1 text-sm w-28 text-center font-semibold ${locked ? (isCorrect ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700") : "border-[#3b2f2f] bg-white"}`} />
            {parts[1] && <span>{parts[1]}</span>}
            {locked && !isCorrect && <span className="text-xs text-green-600 font-semibold ml-1">✓ {item.answer.split("|")[0]}</span>}
          </div>
        );
      })}
    </div>
  );
}

function FlowRenderer({ group, sectionNum, answers, onAnswer, locked }: {
  group: { label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  const data = group.data as { title?: string; steps?: { text: string; answer: string; hasBlank: boolean }[] };
  const steps = data?.steps || [];
  let blankIdx = 0;
  return (
    <div className="rounded-2xl border border-[#e0c7bb] bg-white p-5">
      {data?.title && <p className="font-bold mb-4 text-center">{data.title}</p>}
      <div className="flex flex-col items-center gap-0">
        {steps.map((step, i) => {
          const currentBlankIdx = step.hasBlank ? blankIdx++ : -1;
          const key = step.hasBlank ? `${sectionNum}-${group.label}-flow-${currentBlankIdx}` : "";
          const userAns = key ? (answers[key] || "") : "";
          const isCorrect = !!(key && locked && checkAnswer(userAns, step.answer));
          const parts = step.text.split("___");
          return (
            <div key={i} className="flex flex-col items-center w-full">
              <div className="w-full rounded-2xl border-2 border-[#3b2f2f] bg-[#f7eee8] px-4 py-3 text-sm text-center">
                {parts.length > 1 ? (
                  <span className="flex items-center justify-center gap-1 flex-wrap">
                    <span>{parts[0]}</span>
                    <input type="text" value={userAns} onChange={e => onAnswer(key, e.target.value)} disabled={locked}
                      className={`rounded-xl border px-2 py-0.5 text-sm w-28 text-center font-semibold ${locked ? (isCorrect ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700") : "border-[#3b2f2f] bg-white"}`} />
                    {parts[1] && <span>{parts[1]}</span>}
                    {locked && !isCorrect && <span className="text-xs text-green-600 font-semibold">✓ {step.answer.split("|")[0]}</span>}
                  </span>
                ) : <span>{step.text}</span>}
              </div>
              {i < steps.length - 1 && <div className="text-[#3b2f2f] text-xl font-bold leading-none py-1">↓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShortAnswerRenderer({ group, sectionNum, answers, onAnswer, locked }: {
  group: { label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  const qs = (Array.isArray(group.data) ? group.data : []) as { question: string; answer: string }[];
  return (
    <div className="flex flex-col gap-3">
      {qs.map((q, i) => {
        const key = `${sectionNum}-${group.label}-short-${i}`;
        const userAns = answers[key] || "";
        const isCorrect = locked && checkAnswer(userAns, q.answer);
        return (
          <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
            <p className="text-sm font-semibold mb-2">{i + 1}. {q.question}</p>
            <input type="text" value={userAns} onChange={e => onAnswer(key, e.target.value)} disabled={locked}
              placeholder="Your answer..." className={`w-full rounded-2xl border p-3 text-sm ${locked ? (isCorrect ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50") : "border-[#e0c7bb] bg-white"}`} />
            {locked && !isCorrect && <p className="mt-1 text-xs text-green-600 font-semibold">✓ {q.answer.split("|")[0]}</p>}
          </div>
        );
      })}
    </div>
  );
}

function MapRenderer({ group, sectionNum, answers, onAnswer, locked }: {
  group: { label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const data = group.data as { points?: { id: number; x: number; y: number; answer: string }[]; options?: { key: string; label: string }[]; imageUrl?: string };
  const points = data?.points || [];
  const options = data?.options || [];

  function getPointColor(point: { id: number; answer: string }) {
    const key = `${sectionNum}-${group.label}-map-${point.id}`;
    const userAns = answers[key];
    if (!locked) return userAns ? "bg-blue-500" : selectedPoint === point.id ? "bg-blue-700" : "bg-[#3b2f2f]";
    return userAns === point.answer ? "bg-green-500" : "bg-red-500";
  }

  return (
    <div className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
      {data?.imageUrl && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-[#e0c7bb]" style={{ paddingBottom: "60%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt="Map" className="absolute inset-0 h-full w-full object-contain bg-white" draggable={false} />
          {points.map(point => {
            const key = `${sectionNum}-${group.label}-map-${point.id}`;
            const userAns = answers[key];
            return (
              <button key={point.id} disabled={locked} onClick={() => setSelectedPoint(selectedPoint === point.id ? null : point.id)}
                className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg transition ${getPointColor(point)}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}>
                {userAns || point.id}
              </button>
            );
          })}
        </div>
      )}
      {!locked && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-[#7a6258] mb-2">
            {selectedPoint ? `Point ${selectedPoint} selected — choose answer:` : "Tap a point on the map"}
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {options.map(opt => {
              const isUsed = points.some(p => {
                const key = `${sectionNum}-${group.label}-map-${p.id}`;
                return answers[key] === opt.key && p.id !== selectedPoint;
              });
              return (
                <button key={opt.key} disabled={!selectedPoint} onClick={() => {
                  if (selectedPoint) { onAnswer(`${sectionNum}-${group.label}-map-${selectedPoint}`, opt.key); setSelectedPoint(null); }
                }} className={`rounded-2xl border p-2 text-xs text-left transition ${selectedPoint ? "border-[#e0c7bb] bg-white hover:border-[#3b2f2f] hover:bg-[#ead7cc]" : "border-[#e0c7bb] bg-white opacity-50"} ${isUsed ? "opacity-40" : ""}`}>
                  <span className="font-bold">{opt.key})</span> {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {locked && (
        <div className="mt-3 flex flex-col gap-1">
          {points.map(p => {
            const key = `${sectionNum}-${group.label}-map-${p.id}`;
            const userAns = answers[key];
            const correctOpt = options.find(o => o.key === p.answer);
            const userOpt = options.find(o => o.key === userAns);
            const isCorrect = userAns === p.answer;
            return (
              <p key={p.id} className={`text-xs font-semibold ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                {isCorrect ? `✓ Point ${p.id}: ${correctOpt?.key}) ${correctOpt?.label}` : `✗ Point ${p.id}: You: ${userOpt?.label || "blank"} → ✓ ${correctOpt?.key}) ${correctOpt?.label}`}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TableRenderer({ group, sectionNum, answers, onAnswer, locked }: {
  group: { label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  const data = group.data as { title?: string; headers?: string[]; rows?: { cells: string[]; answerIndices: number[]; answers: string[] }[] };
  const headers = data?.headers || [];
  const rows = data?.rows || [];
  let globalAnsIdx = 0;
  return (
    <div className="rounded-2xl border border-[#e0c7bb] bg-white p-4 overflow-x-auto">
      {data?.title && <p className="font-bold mb-3 text-center">{data.title}</p>}
      <table className="w-full text-sm border-collapse">
        {headers.length > 0 && (
          <thead>
            <tr>{headers.map((h, i) => <th key={i} className="border border-[#e0c7bb] bg-[#f7eee8] px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.cells.map((cell, ci) => {
                const isBlank = cell === "___";
                const ansIdx = isBlank ? globalAnsIdx++ : -1;
                const key = isBlank ? `${sectionNum}-${group.label}-table-${ansIdx}` : "";
                const userAns = key ? (answers[key] || "") : "";
                const correctAns = isBlank ? (row.answers[row.answerIndices.indexOf(ci)] || "") : "";
                const isCorrect = isBlank && locked && checkAnswer(userAns, correctAns);
                return (
                  <td key={ci} className="border border-[#e0c7bb] px-3 py-2">
                    {isBlank ? (
                      <div className="flex items-center gap-1">
                        <input type="text" value={userAns} onChange={e => onAnswer(key, e.target.value)} disabled={locked}
                          className={`rounded-xl border px-2 py-1 text-xs w-24 text-center font-semibold ${locked ? (isCorrect ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700") : "border-[#3b2f2f] bg-white"}`} />
                        {locked && !isCorrect && <span className="text-xs text-green-600 font-semibold">✓{correctAns.split("|")[0]}</span>}
                      </div>
                    ) : cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchingRenderer({ group, sectionNum, answers, onAnswer, locked }: {
  group: { label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  const pairs = (group.data as { pairs?: { left: string; right: string }[] })?.pairs || [];
  return (
    <div className="flex flex-col gap-2">
      {pairs.map((pair, i) => {
        const key = `${sectionNum}-${group.label}-match-${i}`;
        const userAns = answers[key] || "";
        const isCorrect = locked && checkAnswer(userAns, pair.right);
        return (
          <div key={i} className={`flex items-center gap-3 rounded-2xl border p-3 ${locked ? (isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50") : "border-[#e0c7bb] bg-white"}`}>
            <span className="text-sm font-semibold w-32 shrink-0">{pair.left}</span>
            <span className="text-[#7a6258]">→</span>
            <input type="text" value={userAns} onChange={e => onAnswer(key, e.target.value)} disabled={locked}
              placeholder="Answer..." className={`flex-1 rounded-xl border px-3 py-1.5 text-sm ${locked ? (isCorrect ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50") : "border-[#e0c7bb] bg-white"}`} />
            {locked && !isCorrect && <span className="text-xs text-green-600 font-semibold shrink-0">✓ {pair.right}</span>}
          </div>
        );
      })}
    </div>
  );
}

function QuestionGroupView({ group, sectionNum, answers, onAnswer, locked }: {
  group: { type: string; label: string; data: unknown };
  sectionNum: number;
  answers: Record<string, string>;
  onAnswer: (key: string, val: string) => void;
  locked: boolean;
}) {
  return (
    <div className="rounded-4xl border border-[#e0c7bb] bg-[#fffaf7] p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#7a6258] mb-4">{group.label}</p>
      {group.type === "mcq" && <MCQRenderer group={group} sectionNum={sectionNum} answers={answers} onAnswer={onAnswer} locked={locked} />}
      {(group.type === "note-completion" || group.type === "form-completion") && <NoteFormRenderer group={group} sectionNum={sectionNum} answers={answers} onAnswer={onAnswer} locked={locked} />}
      {group.type === "sentence-completion" && <SentenceRenderer group={group} sectionNum={sectionNum} answers={answers} onAnswer={onAnswer} locked={locked} />}
      {group.type === "flow-completion" && <FlowRenderer group={group} sectionNum={sectionNum} answers={answers} onAnswer={onAnswer} locked={locked} />}
      {group.type === "short-answer" && <ShortAnswerRenderer group={group} sectionNum={sectionNum} answers={answers} onAnswer={onAnswer} locked={locked} />}
      {group.type === "map" && <MapRenderer group={group} sectionNum={sectionNum} answers={answers} onAnswer={onAnswer} locked={locked} />}
      {group.type === "table-completion" && <TableRenderer group={group} sectionNum={sectionNum} answers={answers} onAnswer={onAnswer} locked={locked} />}
      {group.type === "matching" && <MatchingRenderer group={group} sectionNum={sectionNum} answers={answers} onAnswer={onAnswer} locked={locked} />}
    </div>
  );
}

// ─── Main Exam Screen ─────────────────────────────────────────────────────────

export default function IELTSExam({ title, examType, sections, answers, onUpdateAnswers, onFinish, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: "reading", sectionIndex: 0, countdown: 45 });
  const [totalElapsed, setTotalElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const READING_TIME = 45;
  const CHECKING_TIME = 30;
  const REVIEW_TIME = 600;

  useEffect(() => {
    const interval = setInterval(() => {
      setTotalElapsed(prev => prev + 1);
      setPhase(prev => {
        if (prev.type === "reading") {
          if (prev.countdown <= 1) return { type: "listening", sectionIndex: prev.sectionIndex };
          return { ...prev, countdown: prev.countdown - 1 };
        }
        if (prev.type === "checking") {
          if (prev.countdown <= 1) {
            if (prev.sectionIndex < sections.length - 1) {
              return { type: "reading", sectionIndex: prev.sectionIndex + 1, countdown: READING_TIME };
            } else {
              return { type: "review", countdown: REVIEW_TIME };
            }
          }
          return { ...prev, countdown: prev.countdown - 1 };
        }
        if (prev.type === "review") {
          if (prev.countdown <= 1) { onFinish(); return { type: "done" }; }
          return { ...prev, countdown: prev.countdown - 1 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sections.length, onFinish]);

  useEffect(() => {
    if (phase.type !== "listening") return;
    const section = sections[phase.sectionIndex];
    if (section?.audioUrl && audioRef.current) {
      audioRef.current.src = section.audioUrl;
      audioRef.current.play().catch(() => {});
    }
  }, [phase, sections]);

  function handleAudioEnded() {
    const currentSectionIndex = phase.type === "listening" ? phase.sectionIndex : 0;
    setPhase({ type: "checking", sectionIndex: currentSectionIndex, countdown: CHECKING_TIME });
  }

  function handleAnswer(key: string, val: string) {
    onUpdateAnswers({ ...answers, [key]: val });
  }

  function skipReading() {
    if (phase.type === "reading") {
      setPhase({ type: "listening", sectionIndex: phase.sectionIndex });
    }
  }

  function skipToChecking() {
    if (phase.type === "listening") {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      handleAudioEnded();
    }
  }

  function skipChecking() {
    if (phase.type === "checking") {
      if (phase.sectionIndex < sections.length - 1) {
        setPhase({ type: "reading", sectionIndex: phase.sectionIndex + 1, countdown: READING_TIME });
      } else {
        setPhase({ type: "review", countdown: REVIEW_TIME });
      }
    }
  }

  if (phase.type === "done") {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7eee8]"><p>Loading results...</p></div>;
  }

  const currentSectionIndex =
    phase.type === "reading" ? phase.sectionIndex :
    phase.type === "listening" ? phase.sectionIndex :
    phase.type === "checking" ? phase.sectionIndex : 0;

  const currentSection = sections[currentSectionIndex];

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
        <button onClick={onBack} className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#f1ded5]">← Back</button>
        <div className="text-right">
          <p className="font-bold">{title}</p>
          <p className="text-sm text-[#7a6258]">{examType}</p>
        </div>
      </div>
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-[#e0c7bb] bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {sections.map((_, i) => (
                <div key={i} className={`h-2 w-8 rounded-full transition-all ${
                  i < currentSectionIndex ? "bg-green-400" :
                  i === currentSectionIndex ? "bg-[#3b2f2f]" : "bg-[#e0c7bb]"
                }`} />
              ))}
            </div>
            <span className="text-sm font-semibold">
              {phase.type === "review" ? "📋 Review" : `Section ${currentSection?.number || ""}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {phase.type === "reading" && (
              <div className={`rounded-full px-4 py-1.5 text-sm font-bold ${phase.countdown <= 10 ? "bg-red-100 text-red-600" : "bg-[#ead7cc] text-[#3b2f2f]"}`}>
                📖 {formatTime(phase.countdown)}
              </div>
            )}
            {phase.type === "listening" && (
              <div className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-600 animate-pulse">
                🔊 Listening...
              </div>
            )}
            {phase.type === "checking" && (
              <div className={`rounded-full px-4 py-1.5 text-sm font-bold ${phase.countdown <= 10 ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                ✏️ {formatTime(phase.countdown)}
              </div>
            )}
            {phase.type === "review" && (
              <div className={`rounded-full px-4 py-1.5 text-sm font-bold ${phase.countdown <= 60 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                ✅ {formatTime(phase.countdown)}
              </div>
            )}
            <span className="text-xs text-[#7a6258]">{formatTime(totalElapsed)}</span>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-6 py-8">

        {/* Reading phase */}
        {phase.type === "reading" && currentSection && (
          <div>
            <div className="mb-6 rounded-4xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-blue-700 text-lg">
                    Section {currentSection.number} — Read the questions
                  </p>
                  <p className="mt-1 text-sm text-blue-600">
                    You have <strong>{phase.countdown} seconds</strong> to read the questions before the audio starts. Read carefully.
                  </p>
                  <p className="mt-1 text-xs text-blue-500 italic">
                    {currentSection.number === 1 && "You will hear a conversation between two people."}
                    {currentSection.number === 2 && "You will hear a monologue about a local topic."}
                    {currentSection.number === 3 && "You will hear a discussion between students or academics."}
                    {currentSection.number === 4 && "You will hear an academic lecture or talk."}
                  </p>
                </div>
                <button onClick={skipReading} className="shrink-0 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
                  Ready →
                </button>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-blue-200">
                <div className="h-1.5 rounded-full bg-blue-500 transition-all duration-1000" style={{ width: `${(phase.countdown / READING_TIME) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {currentSection.questionGroups.map((group, gi) => (
                <QuestionGroupView key={gi} group={group} sectionNum={currentSection.number} answers={answers} onAnswer={handleAnswer} locked={false} />
              ))}
            </div>
          </div>
        )}

        {/* Listening phase */}
        {phase.type === "listening" && currentSection && (
          <div>
            <div className="mb-6 rounded-4xl border border-[#e0c7bb] bg-[#fffaf7] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3b2f2f] animate-pulse">
                    <Image src="/cat-logo.svg" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                  </div>
                  <div>
                    <p className="font-bold">Section {currentSection.number} — Now Playing</p>
                    <p className="text-xs text-[#7a6258]">🔊 Audio plays once only. Write your answers as you listen.</p>
                  </div>
                </div>
                <button onClick={skipToChecking} className="rounded-2xl border border-[#e0c7bb] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f1ded5]">
                  Skip →
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {currentSection.questionGroups.map((group, gi) => (
                <QuestionGroupView key={gi} group={group} sectionNum={currentSection.number} answers={answers} onAnswer={handleAnswer} locked={false} />
              ))}
            </div>
          </div>
        )}

        {/* Checking phase */}
        {phase.type === "checking" && currentSection && (
          <div>
            <div className="mb-6 rounded-4xl border border-yellow-200 bg-yellow-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-yellow-700 text-lg">
                    That is the end of Section {currentSection.number}.
                  </p>
                  <p className="mt-1 text-sm text-yellow-600">
                    You have <strong>{phase.countdown} seconds</strong> to check your answers for this section.
                  </p>
                  {phase.sectionIndex < sections.length - 1 && (
                    <p className="mt-1 text-xs text-yellow-600">
                      Now turn to Section {currentSection.number + 1}...
                    </p>
                  )}
                </div>
                <button onClick={skipChecking} className="shrink-0 rounded-2xl bg-yellow-500 px-4 py-2 text-xs font-bold text-white hover:bg-yellow-600">
                  {phase.sectionIndex < sections.length - 1 ? `Next Section →` : "Review All →"}
                </button>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-yellow-200">
                <div className="h-1.5 rounded-full bg-yellow-500 transition-all duration-1000" style={{ width: `${(phase.countdown / CHECKING_TIME) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {currentSection.questionGroups.map((group, gi) => (
                <QuestionGroupView key={gi} group={group} sectionNum={currentSection.number} answers={answers} onAnswer={handleAnswer} locked={false} />
              ))}
            </div>
          </div>
        )}

        {/* Review phase */}
        {phase.type === "review" && (
          <div>
            <div className="mb-6 rounded-4xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-green-700 text-lg">
                    That is the end of the listening test.
                  </p>
                  <p className="mt-1 text-sm text-green-600">
                    You now have <strong>{formatTime(phase.countdown)}</strong> to transfer your answers to the answer sheet.
                  </p>
                  <p className="mt-1 text-xs text-green-500">Review and edit any answers before submitting.</p>
                </div>
                <button onClick={onFinish} className="shrink-0 rounded-2xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">
                  Submit →
                </button>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-green-200">
                <div className="h-1.5 rounded-full bg-green-500 transition-all duration-1000" style={{ width: `${(phase.countdown / REVIEW_TIME) * 100}%` }} />
              </div>
            </div>
            {sections.map((section, si) => (
              <div key={si} className="mb-8">
                <h2 className="text-xl font-bold mb-4 border-b border-[#e0c7bb] pb-2">Section {section.number}</h2>
                <div className="flex flex-col gap-4">
                  {section.questionGroups.map((group, gi) => (
                    <QuestionGroupView key={gi} group={group} sectionNum={section.number} answers={answers} onAnswer={handleAnswer} locked={false} />
                  ))}
                </div>
              </div>
            ))}
            <button onClick={onFinish} className="mt-6 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-bold text-white hover:bg-[#2f2424]">
              Submit Test →
            </button>
          </div>
        )}

      </section>
    </main>
  );
}