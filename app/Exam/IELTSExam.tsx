"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Narrator audio (fixed CDN files) ─────────────────────────────────────────
const NARRATOR = {
  intro: "https://audio.listeningtalkers.com/NARRATOR/1-%20you%20will%20hear%20a%20number.mp3",
  section1: "https://audio.listeningtalkers.com/NARRATOR/2-%20section-1.mp3",
  section2: "https://audio.listeningtalkers.com/NARRATOR/3-%20section-2.mp3",
  section3: "https://audio.listeningtalkers.com/NARRATOR/4-%20section-3.mp3",
  section4: "https://audio.listeningtalkers.com/NARRATOR/5-%20section-4.mp3",
  readQuestionsV1: "https://audio.listeningtalkers.com/NARRATOR/6-%20sorulara%20bakma%20v1.mp3",
  readQuestionsV2: "https://audio.listeningtalkers.com/NARRATOR/7-%20sorulara%20bakma%20v2.mp3",
  nowListen: "https://audio.listeningtalkers.com/NARRATOR/8-%20now%20listen%20carefully.mp3",
  endSection1: "https://audio.listeningtalkers.com/NARRATOR/9-%20end%20section1.mp3",
  endSection2: "https://audio.listeningtalkers.com/NARRATOR/10-%20end%20section2.mp3",
  endSection3: "https://audio.listeningtalkers.com/NARRATOR/11-%20end%20section3.mp3",
  end: "https://audio.listeningtalkers.com/NARRATOR/12-%20end.mp3",
} as const;

type Section = {
  number: number;
  audioUrl: string;       // main speech — Part 1
  audio2Url?: string;     // Part 2 speech (Sections 1–3, optional)
  descUrl?: string;       // admin's "You will hear a conversation between..." description
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

// ─── Narrator-driven step engine ──────────────────────────────────────────────
type StepUi = "intro" | "section-start" | "reading" | "listening" | "checking";
type Step =
  | { kind: "audio"; url: string; ui: StepUi; sectionIndex: number }
  | { kind: "silence"; seconds: number; ui: StepUi; sectionIndex: number }
  | { kind: "review" };

const SECTION_NARR: Record<number, string> = {
  1: NARRATOR.section1, 2: NARRATOR.section2, 3: NARRATOR.section3, 4: NARRATOR.section4,
};
const END_NARR: Record<number, string> = {
  1: NARRATOR.endSection1, 2: NARRATOR.endSection2, 3: NARRATOR.endSection3,
};

// Builds the full ordered narration/audio sequence for the whole exam.
function buildSteps(sections: Section[]): Step[] {
  const steps: Step[] = [];
  // 1. Exam intro — once
  steps.push({ kind: "audio", url: NARRATOR.intro, ui: "intro", sectionIndex: 0 });

  sections.forEach((section, i) => {
    const n = section.number;
    const isLast = i === sections.length - 1;

    // 2. "Section N" announcement
    if (SECTION_NARR[n]) steps.push({ kind: "audio", url: SECTION_NARR[n], ui: "section-start", sectionIndex: i });
    // 3. Admin's section description ("You will hear a conversation between...")
    if (section.descUrl) steps.push({ kind: "audio", url: section.descUrl, ui: "section-start", sectionIndex: i });
    // 4. "Look at the questions" + 20s silence
    steps.push({ kind: "audio", url: NARRATOR.readQuestionsV1, ui: "reading", sectionIndex: i });
    steps.push({ kind: "silence", seconds: 20, ui: "reading", sectionIndex: i });
    // 5. "Now listen carefully"
    steps.push({ kind: "audio", url: NARRATOR.nowListen, ui: "listening", sectionIndex: i });
    // 6. Main speech — Part 1
    if (section.audioUrl) steps.push({ kind: "audio", url: section.audioUrl, ui: "listening", sectionIndex: i });

    // 7-8. Part 2 (Sections 1-3 only, when a second audio is provided)
    if (n !== 4 && section.audio2Url) {
      steps.push({ kind: "audio", url: NARRATOR.readQuestionsV2, ui: "reading", sectionIndex: i });
      steps.push({ kind: "silence", seconds: 30, ui: "reading", sectionIndex: i });
      steps.push({ kind: "audio", url: NARRATOR.nowListen, ui: "listening", sectionIndex: i });
      steps.push({ kind: "audio", url: section.audio2Url, ui: "listening", sectionIndex: i });
    }

    // 9-10. End of section
    if (!isLast) {
      if (END_NARR[n]) steps.push({ kind: "audio", url: END_NARR[n], ui: "checking", sectionIndex: i });
      steps.push({ kind: "silence", seconds: 30, ui: "checking", sectionIndex: i });
    } else {
      steps.push({ kind: "audio", url: NARRATOR.end, ui: "checking", sectionIndex: i });
    }
  });

  steps.push({ kind: "review" });
  return steps;
}

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

const TONE: Record<string, { border: string; bg: string; title: string; desc: string; bar: string; barBg: string; pill: string }> = {
  brown:  { border: "border-[#e0c7bb]", bg: "bg-[#fffaf7]", title: "text-[#3b2f2f]", desc: "text-[#7a6258]", bar: "bg-[#3b2f2f]", barBg: "bg-[#ead7cc]", pill: "bg-[#ead7cc] text-[#3b2f2f]" },
  blue:   { border: "border-blue-200",  bg: "bg-blue-50",   title: "text-blue-700",  desc: "text-blue-600",  bar: "bg-blue-500",  barBg: "bg-blue-200",  pill: "bg-blue-100 text-blue-600" },
  purple: { border: "border-[#e0c7bb]", bg: "bg-[#fffaf7]", title: "text-[#3b2f2f]", desc: "text-[#7a6258]", bar: "bg-[#3b2f2f]", barBg: "bg-[#ead7cc]", pill: "bg-blue-100 text-blue-600" },
  yellow: { border: "border-yellow-200", bg: "bg-yellow-50", title: "text-yellow-700", desc: "text-yellow-600", bar: "bg-yellow-500", barBg: "bg-yellow-200", pill: "bg-yellow-100 text-yellow-700" },
  green:  { border: "border-green-200", bg: "bg-green-50",  title: "text-green-700", desc: "text-green-600", bar: "bg-green-500", barBg: "bg-green-200", pill: "bg-green-100 text-green-600" },
};

const REVIEW_TIME = 600;

export default function IELTSExam({ title, examType, sections, answers, onUpdateAnswers, onFinish, onBack }: Props) {
  const steps = useMemo(() => buildSteps(sections), [sections]);
  const [stepIndex, setStepIndex] = useState(0);
  const [silenceLeft, setSilenceLeft] = useState(0);
  const [reviewLeft, setReviewLeft] = useState(REVIEW_TIME);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const step = steps[stepIndex];
  const isReview = step?.kind === "review";

  const advance = useCallback(() => {
    setStepIndex(i => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  // Refs so the single 1s ticker always reads fresh values without re-subscribing.
  const stepRef = useRef(step);
  stepRef.current = step;
  const silenceRef = useRef(0);
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Start audio playback / silence timer whenever we enter a new step.
  useEffect(() => {
    const s = steps[stepIndex];
    if (!s) return;
    if (s.kind === "audio") {
      if (audioRef.current) {
        audioRef.current.src = s.url;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else if (s.kind === "silence") {
      silenceRef.current = s.seconds;
      setSilenceLeft(s.seconds);
    }
  }, [stepIndex, steps]);

  // Single 1-second ticker: total clock + silence countdown + review countdown.
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalElapsed(p => p + 1);
      const s = stepRef.current;
      if (!s) return;
      if (s.kind === "silence") {
        const next = silenceRef.current - 1;
        if (next <= 0) { silenceRef.current = 0; setSilenceLeft(0); advanceRef.current(); }
        else { silenceRef.current = next; setSilenceLeft(next); }
      } else if (s.kind === "review") {
        setReviewLeft(prev => {
          if (prev <= 1) { onFinishRef.current(); return 0; }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function handleAudioEnded() { advance(); }

  function handleAnswer(key: string, val: string) {
    onUpdateAnswers({ ...answers, [key]: val });
  }

  // Skip the current narration / silence step.
  function handleSkip() {
    const s = steps[stepIndex];
    if (!s || s.kind === "review") return;
    if (audioRef.current) audioRef.current.pause();
    advance();
  }

  const currentSectionIndex = step && step.kind !== "review" ? step.sectionIndex : 0;
  const currentSection = sections[currentSectionIndex];
  const activeUi = step && step.kind !== "review" ? step.ui : null;

  // Banner descriptor for the active step.
  const info = (() => {
    if (!step || step.kind === "review") return null;
    const n = currentSection?.number;
    if (step.ui === "intro")
      return { tone: "brown", icon: "🎧", title: "Introduction", desc: "Listen carefully to the test instructions.", playing: true as const };
    if (step.ui === "section-start")
      return { tone: "brown", icon: "🎧", title: `Section ${n}`, desc: "Get ready — listen to what this section is about.", playing: true as const };
    if (step.ui === "reading") {
      if (step.kind === "silence")
        return { tone: "blue", icon: "📖", title: `Section ${n} — Read the questions`, desc: "You have some time to read the questions before the audio.", timer: silenceLeft, timerMax: step.seconds };
      return { tone: "blue", icon: "📖", title: `Section ${n} — Read the questions`, desc: "Listen to the instructions...", playing: true as const };
    }
    if (step.ui === "listening")
      return { tone: "purple", icon: "🔊", title: `Section ${n} — Now playing`, desc: "Audio plays once only. Write your answers as you listen.", playing: true as const };
    if (step.ui === "checking") {
      if (step.kind === "silence")
        return { tone: "yellow", icon: "✏️", title: `That is the end of Section ${n}`, desc: "Check your answers for this section.", timer: silenceLeft, timerMax: step.seconds };
      return { tone: "yellow", icon: "✏️", title: `That is the end of Section ${n}`, desc: "Listen...", playing: true as const };
    }
    return null;
  })();

  const tone = TONE[info?.tone || "brown"];

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
        <button onClick={onBack} className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#f1ded5]">← Back</button>
        <div className="text-right">
          <p className="font-bold">{title}</p>
          <p className="text-sm text-[#7a6258]">{examType}</p>
        </div>
      </div>
      <audio ref={audioRef} onEnded={handleAudioEnded} onError={handleAudioEnded} />

      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-[#e0c7bb] bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {sections.map((_, i) => (
                <div key={i} className={`h-2 w-8 rounded-full transition-all ${
                  isReview || i < currentSectionIndex ? "bg-green-400" :
                  i === currentSectionIndex ? "bg-[#3b2f2f]" : "bg-[#e0c7bb]"
                }`} />
              ))}
            </div>
            <span className="text-sm font-semibold">
              {isReview ? "📋 Review" : `Section ${currentSection?.number || ""}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {info && (
              <div className={`rounded-full px-4 py-1.5 text-sm font-bold ${info.timer !== undefined && info.timer <= 10 ? "bg-red-100 text-red-600" : tone.pill} ${info.playing ? "animate-pulse" : ""}`}>
                {info.icon} {info.timer !== undefined ? formatTime(info.timer) : (activeUi === "listening" ? "Listening..." : "Playing...")}
              </div>
            )}
            {isReview && (
              <div className={`rounded-full px-4 py-1.5 text-sm font-bold ${reviewLeft <= 60 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                ✅ {formatTime(reviewLeft)}
              </div>
            )}
            <span className="text-xs text-[#7a6258]">{formatTime(totalElapsed)}</span>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-6 py-8">

        {/* Active narration / listening / checking phase */}
        {info && currentSection && (
          <div>
            <div className={`mb-6 rounded-4xl border ${tone.border} ${tone.bg} p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {activeUi === "listening" ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] animate-pulse">
                      <Image src="/cat-logo.svg" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                    </div>
                  ) : (
                    <div className={`text-2xl ${info.playing ? "animate-pulse" : ""}`}>{info.icon}</div>
                  )}
                  <div>
                    <p className={`font-bold text-lg ${tone.title}`}>{info.title}</p>
                    <p className={`mt-1 text-sm ${tone.desc}`}>{info.desc}</p>
                    {info.timer !== undefined && (
                      <p className={`mt-1 text-xs font-bold ${tone.desc}`}>{info.timer}s remaining</p>
                    )}
                  </div>
                </div>
                <button onClick={handleSkip} className="shrink-0 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-xs font-bold hover:bg-[#f1ded5]">
                  Skip →
                </button>
              </div>
              {info.timer !== undefined && info.timerMax ? (
                <div className={`mt-3 h-1.5 w-full rounded-full ${tone.barBg}`}>
                  <div className={`h-1.5 rounded-full ${tone.bar} transition-all duration-1000`} style={{ width: `${(info.timer / info.timerMax) * 100}%` }} />
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-4">
              {currentSection.questionGroups.map((group, gi) => (
                <QuestionGroupView key={gi} group={group} sectionNum={currentSection.number} answers={answers} onAnswer={handleAnswer} locked={false} />
              ))}
            </div>
          </div>
        )}

        {/* Review phase */}
        {isReview && (
          <div>
            <div className="mb-6 rounded-4xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-green-700 text-lg">
                    That is the end of the listening test.
                  </p>
                  <p className="mt-1 text-sm text-green-600">
                    You now have <strong>{formatTime(reviewLeft)}</strong> to transfer your answers to the answer sheet.
                  </p>
                  <p className="mt-1 text-xs text-green-500">Review and edit any answers before submitting.</p>
                </div>
                <button onClick={onFinish} className="shrink-0 rounded-2xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">
                  Submit →
                </button>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-green-200">
                <div className="h-1.5 rounded-full bg-green-500 transition-all duration-1000" style={{ width: `${(reviewLeft / REVIEW_TIME) * 100}%` }} />
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