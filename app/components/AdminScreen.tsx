/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = { onBack: () => void; };

type EpisodeType =
  | "practice-mcq" | "practice-fill" | "practice-dictation" | "practice-short" | "practice-matching" | "practice-map"
  | "practice-completion-note" | "practice-completion-form" | "practice-completion-table" | "practice-completion-flow" | "practice-completion-sentence"
  | "exam-ielts" | "exam-toefl" | "exam-toeic" | "exam-celpip"
  | "quiz-ielts" | "quiz-toefl" | "quiz-toeic" | "quiz-celpip";

type MCQQuestion = { question: string; options: { A: string; B: string; C: string; D: string; E: string }; correctAnswer: "A"|"B"|"C"|"D"|"E"; explanation?: string; };
type FillQuestion = { text: string; blanks: { index: number; answer: string }[]; };
type DictationQuestion = { sentence: string; };
type ShortAnswerQuestion = { question: string; answer: string; hint?: string; };
type MatchingQuestion = { pairs: { left: string; right: string }[]; };
type MapPoint = { id: number; x: number; y: number; answer: string; explanation: string; };
type MapOption = { key: string; label: string; };
type MapQuestion = { points: MapPoint[]; options: MapOption[]; };
type NoteItem = { label: string; answer: string; };
type NoteQuestion = { title: string; items: NoteItem[]; };
type FormField = { label: string; answer: string; };
type FormQuestion = { title: string; fields: FormField[]; };
type TableRow = { cells: string[]; answerIndices: number[]; answers: string[]; };
type TableQuestion = { title: string; headers: string[]; rows: TableRow[]; };
type FlowStep = { text: string; answer: string; hasBlank: boolean; };
type FlowQuestion = { title: string; steps: FlowStep[]; };
type SentenceItem = { text: string; answer: string; };
type SentenceQuestion = { items: SentenceItem[]; };
type QuestionGroupType = "mcq" | "form-completion" | "note-completion" | "table-completion" | "flow-completion" | "sentence-completion" | "short-answer" | "matching" | "map";
type QuestionGroup = { id: string; type: QuestionGroupType; label: string; wordLimit?: string; isSection4?: boolean; data: any; };
type ExamSectionType = { id: string; number: number; audioFile: File | null; audioUrl: string; introFile?: File | null; introUrl?: string; questionGroups: QuestionGroup[]; };
type PublishedPractice = { id: string; title: string; level: string; episode_type: EpisodeType; exam_type?: string; exam_section?: number; };
type AdminTab = "new" | "manage" | "users";

const PRACTICE_TYPES = [
  { id: "practice-mcq", label: "Multiple Choice", emoji: "🔤" },
  { id: "practice-fill", label: "Fill in the Blank", emoji: "✏️" },
  { id: "practice-dictation", label: "Dictation", emoji: "🎙️" },
  { id: "practice-short", label: "Short Answer", emoji: "✍️" },
  { id: "practice-matching", label: "Matching", emoji: "🔗" },
  { id: "practice-map", label: "Map Labelling", emoji: "🗺️" },
];
const COMPLETION_TYPES = [
  { id: "practice-completion-note", label: "Note Completion", emoji: "📝" },
  { id: "practice-completion-form", label: "Form Completion", emoji: "📄" },
  { id: "practice-completion-table", label: "Table Completion", emoji: "📊" },
  { id: "practice-completion-flow", label: "Flow Chart", emoji: "🔄" },
  { id: "practice-completion-sentence", label: "Sentence Completion", emoji: "✏️" },
];
const EXAM_TYPES_LIST = [
  { id: "exam-ielts", label: "IELTS Full Exam", emoji: "🎓" },
  { id: "exam-toefl", label: "TOEFL Full Exam", emoji: "🎓" },
  { id: "exam-toeic", label: "TOEIC Full Exam", emoji: "🎓" },
  { id: "exam-celpip", label: "CELPIP Full Exam", emoji: "🎓" },
];
const QUIZ_TYPES = [
  { id: "quiz-ielts", label: "IELTS Style", emoji: "📝" },
  { id: "quiz-toefl", label: "TOEFL Style", emoji: "📝" },
  { id: "quiz-toeic", label: "TOEIC Style", emoji: "📝" },
  { id: "quiz-celpip", label: "CELPIP Style", emoji: "📝" },
];
const ALL_TYPES = [...PRACTICE_TYPES, ...COMPLETION_TYPES, ...EXAM_TYPES_LIST, ...QUIZ_TYPES];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const OPTION_KEYS = ["A","B","C","D","E","F","G","H"];
const QUESTION_GROUP_TYPES: { id: QuestionGroupType; label: string; emoji: string }[] = [
  { id: "mcq", label: "Multiple Choice", emoji: "🔤" },
  { id: "form-completion", label: "Form Completion", emoji: "📄" },
  { id: "note-completion", label: "Note Completion", emoji: "📝" },
  { id: "table-completion", label: "Table Completion", emoji: "📊" },
  { id: "flow-completion", label: "Flow Chart", emoji: "🔄" },
  { id: "sentence-completion", label: "Sentence Completion", emoji: "✏️" },
  { id: "short-answer", label: "Short Answer", emoji: "✍️" },
  { id: "matching", label: "Matching", emoji: "🔗" },
  { id: "map", label: "Map Labelling", emoji: "🗺️" },
];
const IELTS_SECTIONS = [
  { value: 1, label: "Section 1 — Form / Note / Table / Matching (A2–B1)" },
  { value: 2, label: "Section 2 — Map / MCQ / Matching (B1–B2)" },
  { value: 3, label: "Section 3 — MCQ / Matching / Sentence Completion (B2–C1)" },
  { value: 4, label: "Section 4 — Note / Flow Chart / Table / Sentence (C1–C2)" },
];

function getAutoLevel(examType: string, examSection: number | null): string {
  if (examType === "ielts") {
    if (examSection === 1) return "Beginner";
    if (examSection === 2) return "Intermediate";
    if (examSection === 3) return "Intermediate";
    if (examSection === 4) return "Advanced";
  }
  return "Intermediate";
}

function getAutoTitle(examType: string, examSection: number | null, episodeType: string): string {
  if (examType === "ielts" && examSection) {
    return `IELTS S${examSection} — Practice #${Date.now().toString().slice(-4)}`;
  }
  if (episodeType.startsWith("exam-")) {
    return `${episodeType.replace("exam-", "").toUpperCase()} Full Test #${Date.now().toString().slice(-4)}`;
  }
  return `Practice #${Date.now().toString().slice(-4)}`;
}

function createEmptyGroupData(type: QuestionGroupType): any {
  switch (type) {
    case "mcq": return [];
    case "form-completion": return { title: "", fields: [{ label: "", answer: "" }] };
    case "note-completion": return { title: "", items: [{ label: "", answer: "" }] };
    case "table-completion": return { title: "", headers: ["", "", ""], rows: [{ cells: ["", "", ""], answerIndices: [], answers: [] }] };
    case "flow-completion": return { title: "", steps: [{ text: "", answer: "", hasBlank: false }] };
    case "sentence-completion": return { items: [{ text: "", answer: "" }] };
    case "short-answer": return [];
    case "matching": return { pairs: [{ left: "", right: "" }, { left: "", right: "" }] };
    case "map": return { points: [], options: OPTION_KEYS.slice(0, 6).map(k => ({ key: k, label: "" })) };
    default: return [];
  }
}

function createEmptySection(number: number): ExamSectionType {
  return { id: `section-${Date.now()}-${number}`, number, audioFile: null, audioUrl: "", introFile: null, introUrl: "", questionGroups: [] };
}

const createEmptyMCQ = (): MCQQuestion => ({ question: "", options: { A: "", B: "", C: "", D: "", E: "" }, correctAnswer: "A", explanation: "" });
const createEmptyFill = (): FillQuestion => ({ text: "", blanks: [] });
const createEmptyDictation = (): DictationQuestion => ({ sentence: "" });
const createEmptyShort = (): ShortAnswerQuestion => ({ question: "", answer: "", hint: "" });
const createEmptyMatching = (): MatchingQuestion => ({ pairs: [{ left: "", right: "" }, { left: "", right: "" }, { left: "", right: "" }] });
const createEmptyMap = (): MapQuestion => ({ points: [], options: OPTION_KEYS.slice(0, 6).map(k => ({ key: k, label: "" })) });
const createEmptyNote = (): NoteQuestion => ({ title: "", items: [{ label: "", answer: "" }, { label: "", answer: "" }, { label: "", answer: "" }] });
const createEmptyForm = (): FormQuestion => ({ title: "", fields: [{ label: "", answer: "" }, { label: "", answer: "" }, { label: "", answer: "" }] });
const createEmptyTable = (): TableQuestion => ({ title: "", headers: ["", "", ""], rows: [{ cells: ["", "", ""], answerIndices: [], answers: [] }] });
const createEmptyFlow = (): FlowQuestion => ({ title: "", steps: [{ text: "", answer: "", hasBlank: false }, { text: "", answer: "", hasBlank: false }] });
const createEmptySentence = (): SentenceQuestion => ({ items: [{ text: "", answer: "" }, { text: "", answer: "" }] });

function parseBulkMCQ(raw: string): MCQQuestion[] {
  const blocks = raw.trim().split(/\n{2,}/);
  const parsed: MCQQuestion[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const q = createEmptyMCQ();
    for (const line of lines) {
      if (/^Q[):.\s]/i.test(line)) q.question = line.replace(/^Q[):.\s]+/i, "").trim();
      else if (/^A[):.\s]/i.test(line)) q.options.A = line.replace(/^A[):.\s]+/i, "").trim();
      else if (/^B[):.\s]/i.test(line)) q.options.B = line.replace(/^B[):.\s]+/i, "").trim();
      else if (/^C[):.\s]/i.test(line)) q.options.C = line.replace(/^C[):.\s]+/i, "").trim();
      else if (/^D[):.\s]/i.test(line)) q.options.D = line.replace(/^D[):.\s]+/i, "").trim();
      else if (/^E[):.\s]/i.test(line)) q.options.E = line.replace(/^E[):.\s]+/i, "").trim();
      else if (/^correct[):.\s]/i.test(line)) {
        const ans = line.replace(/^correct[):.\s]+/i, "").trim().toUpperCase();
        if (["A","B","C","D","E"].includes(ans)) q.correctAnswer = ans as any;
      }
      else if (/^explanation[):.\s]/i.test(line)) q.explanation = line.replace(/^explanation[):.\s]+/i, "").trim();
    }
    if (q.question) parsed.push(q);
  }
  return parsed;
}

function parseBulkNote(raw: string): NoteQuestion {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => /^TITLE\)/i.test(l))?.replace(/^TITLE\)\s*/i, "") || "";
  const noteLines = lines.filter(l => /^NOTE\)/i.test(l));
  const ansLines = lines.filter(l => /^ANS\d+\)/i.test(l));
  return { title, items: noteLines.map((l, i) => ({ label: l.replace(/^NOTE\)\s*/i, "").trim(), answer: ansLines[i]?.replace(/^ANS\d+\)\s*/i, "").trim() || "" })) };
}

function parseBulkForm(raw: string): FormQuestion {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => /^TITLE\)/i.test(l))?.replace(/^TITLE\)\s*/i, "") || "";
  const fieldLines = lines.filter(l => /^FIELD\)/i.test(l));
  const ansLines = lines.filter(l => /^ANS\d+\)/i.test(l));
  return { title, fields: fieldLines.map((l, i) => ({ label: l.replace(/^FIELD\)\s*/i, "").trim(), answer: ansLines[i]?.replace(/^ANS\d+\)\s*/i, "").trim() || "" })) };
}

function parseBulkTable(raw: string): TableQuestion {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => /^TITLE\)/i.test(l))?.replace(/^TITLE\)\s*/i, "") || "";
  const headerLine = lines.find(l => /^HEADERS\)/i.test(l));
  const headers = headerLine ? headerLine.replace(/^HEADERS\)\s*/i, "").split("|").map(h => h.trim()) : [];
  const rowLines = lines.filter(l => /^ROW\)/i.test(l));
  const ansLines = lines.filter(l => /^ANS\d+\)/i.test(l));
  let ansIdx = 0;
  const rows: TableRow[] = rowLines.map(l => {
    const cells = l.replace(/^ROW\)\s*/i, "").split("|").map(c => c.trim());
    const answerIndices: number[] = [];
    const answers: string[] = [];
    cells.forEach((c, i) => { if (c === "___") { answerIndices.push(i); answers.push(ansLines[ansIdx++]?.replace(/^ANS\d+\)\s*/i, "").trim() || ""); } });
    return { cells, answerIndices, answers };
  });
  return { title, headers, rows };
}

function parseBulkFlow(raw: string): FlowQuestion {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => /^TITLE\)/i.test(l))?.replace(/^TITLE\)\s*/i, "") || "";
  const stepLines = lines.filter(l => /^STEP\)/i.test(l));
  const ansLines = lines.filter(l => /^ANS\d+\)/i.test(l));
  let ansIdx = 0;
  const steps: FlowStep[] = stepLines.map(l => {
    const text = l.replace(/^STEP\)\s*/i, "").trim();
    const hasBlank = text.includes("___");
    return { text, answer: hasBlank ? ansLines[ansIdx++]?.replace(/^ANS\d+\)\s*/i, "").trim() || "" : "", hasBlank };
  });
  return { title, steps };
}

function parseBulkSentence(raw: string): SentenceQuestion {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const sentLines = lines.filter(l => /^S\)/i.test(l));
  const ansLines = lines.filter(l => /^ANS\d+\)/i.test(l));
  return { items: sentLines.map((l, i) => ({ text: l.replace(/^S\)\s*/i, "").trim(), answer: ansLines[i]?.replace(/^ANS\d+\)\s*/i, "").trim() || "" })) };
}

// ─── Question Group Editor ────────────────────────────────────────────────────

function QuestionGroupEditor({ group, onChange, onRemove }: {
  group: QuestionGroup;
  onChange: (data: any) => void;
  onRemove: () => void;
}) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [addingPoint, setAddingPoint] = useState(false);
  const [mapPreview, setMapPreview] = useState("");
  const localMapRef = useRef<HTMLDivElement>(null);
  const data = group.data;
  const typeLabel = QUESTION_GROUP_TYPES.find(t => t.id === group.type);

  function getBulkFormat() {
    switch (group.type) {
      case "mcq": return `Q) Soru\nA) Şık A\nB) Şık B\nC) Şık C\nD) Şık D\nE) Şık E\nCorrect) C\nExplanation) Açıklama\n\nQ) Sonraki...`;
      case "note-completion": return `TITLE) Meeting Notes\nNOTE) Speaker: ___\nNOTE) Topic: ___\nANS1) Dr. Johnson\nANS2) writing`;
      case "form-completion": return `TITLE) Registration Form\nFIELD) Name: John ___\nFIELD) ID: ___\nANS1) Peterson\nANS2) LB4521`;
      case "table-completion": return `TITLE) Train Schedule\nHEADERS) Destination|Time|Platform\nROW) London|09:15|___\nROW) ___|11:30|Platform 3\nANS1) Platform 2\nANS2) Birmingham`;
      case "flow-completion": return `TITLE) Process\nSTEP) Start at ___\nSTEP) Check documents\nSTEP) Submit if ___\nANS1) main desk\nANS2) approved`;
      case "sentence-completion": return `S) The conference will be held in ___ next month.\nS) Arrive ___ minutes early.\nANS1) Berlin\nANS2) fifteen|15`;
      case "short-answer": return `Q) What time does it close?\nA) 9pm|nine\nH) Hint (optional)\n\nQ) Where is it held?\nA) conference room`;
      case "matching": return `L) Monday\nR) First day\n\nL) Tuesday\nR) Second day`;
      default: return "";
    }
  }

  function applyBulk() {
    if (!bulkText.trim()) return;
    switch (group.type) {
      case "mcq": onChange(parseBulkMCQ(bulkText)); break;
      case "note-completion": onChange(parseBulkNote(bulkText)); break;
      case "form-completion": onChange(parseBulkForm(bulkText)); break;
      case "table-completion": onChange(parseBulkTable(bulkText)); break;
      case "flow-completion": onChange(parseBulkFlow(bulkText)); break;
      case "sentence-completion": onChange(parseBulkSentence(bulkText)); break;
      case "short-answer": {
        const blocks = bulkText.trim().split(/\n{2,}/);
        const parsed: ShortAnswerQuestion[] = [];
        for (const block of blocks) {
          const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
          const qLine = lines.find(l => /^Q\)/i.test(l));
          const aLine = lines.find(l => /^A\)/i.test(l));
          const hLine = lines.find(l => /^H\)/i.test(l));
          if (!qLine || !aLine) continue;
          parsed.push({ question: qLine.replace(/^Q\)\s*/i, "").trim(), answer: aLine.replace(/^A\)\s*/i, "").trim(), hint: hLine ? hLine.replace(/^H\)\s*/i, "").trim() : "" });
        }
        onChange(parsed);
        break;
      }
      case "matching": {
        const blocks = bulkText.trim().split(/\n{2,}/);
        const pairs: { left: string; right: string }[] = [];
        for (const block of blocks) {
          const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
          const lLine = lines.find(l => /^L\)/i.test(l));
          const rLine = lines.find(l => /^R\)/i.test(l));
          if (!lLine || !rLine) continue;
          pairs.push({ left: lLine.replace(/^L\)\s*/i, "").trim(), right: rLine.replace(/^R\)\s*/i, "").trim() });
        }
        onChange({ pairs });
        break;
      }
    }
    setBulkMode(false);
    setBulkText("");
  }

  return (
    <div className="rounded-2xl border-2 border-[#e0c7bb] bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">{typeLabel?.emoji}</span>
          <span className="font-bold text-sm">{typeLabel?.label}</span>
          <span className="text-xs text-[#7a6258]">— {group.label}</span>
          {group.wordLimit && <span className="rounded-full bg-[#ead7cc] px-2 py-0.5 text-xs font-semibold text-[#3b2f2f]">{group.wordLimit}</span>}
          {group.isSection4 && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Section 4</span>}
        </div>
        <div className="flex gap-2">
          {group.type !== "map" && (
            <button onClick={() => { setBulkMode(!bulkMode); setBulkText(""); }}
              className={`rounded-xl px-3 py-1 text-xs font-semibold ${bulkMode ? "bg-[#ead7cc]" : "border border-[#e0c7bb]"}`}>
              {bulkMode ? "Manual" : "Bulk"}
            </button>
          )}
          <button onClick={onRemove} className="rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">Remove</button>
        </div>
      </div>

      {bulkMode && (
        <div className="mb-4 rounded-xl border border-[#e0c7bb] bg-[#f7eee8] p-4">
          <pre className="text-xs leading-6 text-[#7a6258] mb-2 whitespace-pre-wrap">{getBulkFormat()}</pre>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Yapıştır..." className="min-h-[200px] w-full rounded-xl border border-[#e0c7bb] bg-white p-3 font-mono text-xs" />
          <button onClick={applyBulk} className="mt-2 w-full rounded-xl bg-[#3b2f2f] py-2 text-sm font-semibold text-white">Apply</button>
        </div>
      )}

      {!bulkMode && group.type === "mcq" && (
        <div className="flex flex-col gap-4">
          {(Array.isArray(data) ? data : []).map((item: MCQQuestion, idx: number) => (
            <div key={idx} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-[#7a6258]">Q{idx + 1}</span>
                <button onClick={() => { const u = [...data]; u.splice(idx, 1); onChange(u); }} className="text-xs text-red-600">Remove</button>
              </div>
              <textarea value={item.question} onChange={e => { const u = [...data]; u[idx].question = e.target.value; onChange(u); }} placeholder="Question" className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-sm min-h-[60px]" />
              {(["A","B","C","D","E"] as const).map(letter => (
                <div key={letter} className="mt-1 flex items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.correctAnswer === letter ? "bg-green-200 text-green-800" : "bg-[#ead7cc]"}`}>{letter}</span>
                  <input type="text" value={item.options[letter]} onChange={e => { const u = [...data]; u[idx].options[letter] = e.target.value; onChange(u); }} placeholder={`Option ${letter}`} className="flex-1 rounded-xl border border-[#e0c7bb] bg-white p-1.5 text-xs" />
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs font-semibold">Correct:</label>
                <select value={item.correctAnswer} onChange={e => { const u = [...data]; u[idx].correctAnswer = e.target.value; onChange(u); }} className="rounded-xl border border-[#e0c7bb] bg-white px-2 py-1 text-xs">
                  {["A","B","C","D","E"].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <textarea value={item.explanation || ""} onChange={e => { const u = [...data]; u[idx].explanation = e.target.value; onChange(u); }} placeholder="Explanation (optional)" className="mt-2 w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs min-h-[50px]" />
            </div>
          ))}
          <button onClick={() => onChange([...(Array.isArray(data) ? data : []), createEmptyMCQ()])} className="rounded-xl border border-[#e0c7bb] bg-white py-2 text-sm font-semibold">+ Add Question</button>
        </div>
      )}

      {!bulkMode && group.type === "note-completion" && (
        <div>
          <input type="text" value={data?.title || ""} onChange={e => onChange({ ...data, title: e.target.value })} placeholder="Title" className="w-full rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm mb-3" />
          {(data?.items || []).map((item: NoteItem, i: number) => (
            <div key={i} className="mt-2 grid grid-cols-2 gap-2">
              <input type="text" value={item.label} onChange={e => { const u = [...data.items]; u[i].label = e.target.value; onChange({ ...data, items: u }); }} placeholder="Label (e.g. Speaker: ___)" className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-xs" />
              <input type="text" value={item.answer} onChange={e => { const u = [...data.items]; u[i].answer = e.target.value; onChange({ ...data, items: u }); }} placeholder="Answer | alt" className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-xs" />
            </div>
          ))}
          <button onClick={() => onChange({ ...data, items: [...(data?.items || []), { label: "", answer: "" }] })} className="mt-2 rounded-xl border border-[#e0c7bb] bg-white px-3 py-1 text-xs font-semibold">+ Add Item</button>
        </div>
      )}

      {!bulkMode && group.type === "form-completion" && (
        <div>
          <input type="text" value={data?.title || ""} onChange={e => onChange({ ...data, title: e.target.value })} placeholder="Form Title" className="w-full rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm mb-3" />
          {(data?.fields || []).map((field: FormField, i: number) => (
            <div key={i} className="mt-2 grid grid-cols-2 gap-2">
              <input type="text" value={field.label} onChange={e => { const u = [...data.fields]; u[i].label = e.target.value; onChange({ ...data, fields: u }); }} placeholder="Field label" className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-xs" />
              <input type="text" value={field.answer} onChange={e => { const u = [...data.fields]; u[i].answer = e.target.value; onChange({ ...data, fields: u }); }} placeholder="Answer | alt" className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-xs" />
            </div>
          ))}
          <button onClick={() => onChange({ ...data, fields: [...(data?.fields || []), { label: "", answer: "" }] })} className="mt-2 rounded-xl border border-[#e0c7bb] bg-white px-3 py-1 text-xs font-semibold">+ Add Field</button>
        </div>
      )}

      {!bulkMode && group.type === "sentence-completion" && (
        <div>
          {(data?.items || []).map((item: SentenceItem, i: number) => (
            <div key={i} className="mt-2 rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
              <input type="text" value={item.text} onChange={e => { const u = [...data.items]; u[i].text = e.target.value; onChange({ ...data, items: u }); }} placeholder="Sentence with ___ blank" className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
              <input type="text" value={item.answer} onChange={e => { const u = [...data.items]; u[i].answer = e.target.value; onChange({ ...data, items: u }); }} placeholder="Answer | alt" className="mt-1 w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
            </div>
          ))}
          <button onClick={() => onChange({ ...data, items: [...(data?.items || []), { text: "", answer: "" }] })} className="mt-2 rounded-xl border border-[#e0c7bb] bg-white px-3 py-1 text-xs font-semibold">+ Add Sentence</button>
        </div>
      )}

      {!bulkMode && group.type === "flow-completion" && (
        <div>
          <input type="text" value={data?.title || ""} onChange={e => onChange({ ...data, title: e.target.value })} placeholder="Flow Chart Title" className="w-full rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm mb-3" />
          {(data?.steps || []).map((step: FlowStep, i: number) => (
            <div key={i} className="mt-2 rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white mb-1">{i + 1}</div>
              <input type="text" value={step.text} onChange={e => { const u = [...data.steps]; u[i].text = e.target.value; u[i].hasBlank = e.target.value.includes("___"); onChange({ ...data, steps: u }); }} placeholder="Step text (use ___ for blank)" className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
              {step.hasBlank && <input type="text" value={step.answer} onChange={e => { const u = [...data.steps]; u[i].answer = e.target.value; onChange({ ...data, steps: u }); }} placeholder="Answer | alt" className="mt-1 w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />}
            </div>
          ))}
          <button onClick={() => onChange({ ...data, steps: [...(data?.steps || []), { text: "", answer: "", hasBlank: false }] })} className="mt-2 rounded-xl border border-[#e0c7bb] bg-white px-3 py-1 text-xs font-semibold">+ Add Step</button>
        </div>
      )}

      {!bulkMode && group.type === "short-answer" && (
        <div className="flex flex-col gap-3">
          {(Array.isArray(data) ? data : []).map((item: ShortAnswerQuestion, i: number) => (
            <div key={i} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-[#7a6258]">Q{i + 1}</span>
                <button onClick={() => { const u = [...data]; u.splice(i, 1); onChange(u); }} className="text-xs text-red-600">Remove</button>
              </div>
              <input type="text" value={item.question} onChange={e => { const u = [...data]; u[i].question = e.target.value; onChange(u); }} placeholder="Question" className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
              <input type="text" value={item.answer} onChange={e => { const u = [...data]; u[i].answer = e.target.value; onChange(u); }} placeholder="Answer | alt" className="mt-1 w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
              <input type="text" value={item.hint || ""} onChange={e => { const u = [...data]; u[i].hint = e.target.value; onChange(u); }} placeholder="Hint (optional)" className="mt-1 w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
            </div>
          ))}
          <button onClick={() => onChange([...(Array.isArray(data) ? data : []), createEmptyShort()])} className="rounded-xl border border-[#e0c7bb] bg-white py-2 text-sm font-semibold">+ Add Question</button>
        </div>
      )}

      {!bulkMode && group.type === "matching" && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <span className="text-xs font-bold text-[#7a6258]">LEFT</span>
            <span className="text-xs font-bold text-[#7a6258]">RIGHT</span>
          </div>
          {(data?.pairs || []).map((pair: { left: string; right: string }, i: number) => (
            <div key={i} className="mt-1 grid grid-cols-2 gap-2">
              <input type="text" value={pair.left} onChange={e => { const u = [...data.pairs]; u[i].left = e.target.value; onChange({ pairs: u }); }} placeholder={`Item ${i + 1}`} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-xs" />
              <input type="text" value={pair.right} onChange={e => { const u = [...data.pairs]; u[i].right = e.target.value; onChange({ pairs: u }); }} placeholder={`Match ${i + 1}`} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-xs" />
            </div>
          ))}
          <button onClick={() => onChange({ pairs: [...(data?.pairs || []), { left: "", right: "" }] })} className="mt-2 rounded-xl border border-[#e0c7bb] bg-white px-3 py-1 text-xs font-semibold">+ Add Pair</button>
        </div>
      )}

      {group.type === "map" && (
        <div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold">Map Image</label>
            <input type="file" accept="image/*" onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = ev => setMapPreview(ev.target?.result as string);
              reader.readAsDataURL(f);
              onChange({ ...data, _imageFile: f });
            }} className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold">Options (A–H)</label>
              <div className="flex gap-1">
                <button onClick={() => { const next = OPTION_KEYS[(data?.options || []).length]; if (next) onChange({ ...data, options: [...(data?.options || []), { key: next, label: "" }] }); }} disabled={(data?.options || []).length >= 8} className="rounded-lg bg-[#3b2f2f] px-2 py-0.5 text-xs text-white disabled:opacity-40">+</button>
                <button onClick={() => { if ((data?.options || []).length > 2) onChange({ ...data, options: (data?.options || []).slice(0, -1) }); }} className="rounded-lg border border-[#e0c7bb] px-2 py-0.5 text-xs">-</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(data?.options || []).map((opt: MapOption, i: number) => (
                <div key={opt.key} className="flex items-center gap-1">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">{opt.key}</span>
                  <input type="text" value={opt.label} onChange={e => { const u = [...data.options]; u[i].label = e.target.value; onChange({ ...data, options: u }); }} placeholder="Location name" className="flex-1 rounded-lg border border-[#e0c7bb] bg-[#fffaf7] p-1.5 text-xs" />
                </div>
              ))}
            </div>
          </div>
          {(mapPreview || data?.imageUrl) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold">Click map to add points</label>
                <button onClick={() => setAddingPoint(!addingPoint)} className={`rounded-xl px-3 py-1 text-xs font-semibold ${addingPoint ? "bg-blue-600 text-white" : "border border-[#e0c7bb]"}`}>
                  {addingPoint ? "🎯 Click map..." : "➕ Add Point"}
                </button>
              </div>
              <div ref={localMapRef} onClick={e => {
                if (!addingPoint) return;
                const rect = localMapRef.current?.getBoundingClientRect();
                if (!rect) return;
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                const newId = (data?.points || []).length + 1;
                onChange({ ...data, points: [...(data?.points || []), { id: newId, x, y, answer: "", explanation: "" }] });
                setAddingPoint(false);
              }} className={`relative w-full overflow-hidden rounded-2xl border-2 ${addingPoint ? "border-blue-400 cursor-crosshair" : "border-[#e0c7bb]"}`} style={{ paddingBottom: "55%" }}>
                <img src={mapPreview || data?.imageUrl} alt="Map" className="absolute inset-0 h-full w-full object-contain bg-white" draggable={false} />
                {(data?.points || []).map((point: MapPoint) => (
                  <div key={point.id} className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#3b2f2f] text-xs font-bold text-white shadow-lg cursor-pointer hover:bg-red-600" style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    onClick={e => { e.stopPropagation(); if (!addingPoint) onChange({ ...data, points: (data?.points || []).filter((p: MapPoint) => p.id !== point.id).map((p: MapPoint, i: number) => ({ ...p, id: i + 1 })) }); }}>{point.id}</div>
                ))}
              </div>
              {(data?.points || []).length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {(data?.points || []).map((point: MapPoint, i: number) => (
                    <div key={point.id} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">{point.id}</div>
                        <span className="text-xs font-semibold">Point {point.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={point.answer} onChange={e => { const u = [...data.points]; u[i].answer = e.target.value; onChange({ ...data, points: u }); }} className="rounded-xl border border-[#e0c7bb] bg-white p-1.5 text-xs">
                          <option value="">Select...</option>
                          {(data?.options || []).map((opt: MapOption) => <option key={opt.key} value={opt.key}>{opt.key}) {opt.label}</option>)}
                        </select>
                        <input type="text" value={point.explanation} onChange={e => { const u = [...data.points]; u[i].explanation = e.target.value; onChange({ ...data, points: u }); }} placeholder="Explanation" className="rounded-xl border border-[#e0c7bb] bg-white p-1.5 text-xs" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Exam Section Editor ──────────────────────────────────────────────────────

function ExamSectionEditor({ section, onChange, onRemove }: {
  section: ExamSectionType;
  onChange: (s: ExamSectionType) => void;
  onRemove: () => void;
}) {
  const [addingGroupType, setAddingGroupType] = useState<QuestionGroupType | "">("");
  const [groupLabel, setGroupLabel] = useState("");
  const [groupWordLimit, setGroupWordLimit] = useState("");
  const [groupIsSection4, setGroupIsSection4] = useState(false);

  function addGroup() {
    if (!addingGroupType) return;
    const newGroup: QuestionGroup = {
      id: `group-${Date.now()}`,
      type: addingGroupType,
      label: groupLabel || `Questions ${section.questionGroups.length * 5 + 1}–${(section.questionGroups.length + 1) * 5}`,
      wordLimit: groupWordLimit || "NO MORE THAN TWO WORDS AND/OR A NUMBER",
      isSection4: groupIsSection4,
      data: createEmptyGroupData(addingGroupType),
    };
    onChange({ ...section, questionGroups: [...section.questionGroups, newGroup] });
    setAddingGroupType(""); setGroupLabel(""); setGroupWordLimit(""); setGroupIsSection4(false);
  }

  return (
    <div className="rounded-3xl border-2 border-[#3b2f2f] bg-[#fffaf7] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold">Section {section.number}</h3>
        <button onClick={onRemove} className="rounded-2xl border border-red-200 bg-white px-3 py-1 text-sm font-semibold text-red-600">Remove Section</button>
      </div>
      <div className="mb-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
        <label className="mb-2 block text-sm font-semibold">🎙️ Intro Audio <span className="font-normal text-xs text-[#7a6258]">(yönlendirme cümleleri + sessizlikler)</span></label>
        {section.introUrl && <p className="mb-1 text-xs text-green-600">✓ Intro audio uploaded</p>}
        <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) onChange({ ...section, introFile: f, introUrl: "" }); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
        <p className="mt-1 text-xs text-[#7a6258]">
          {section.number === 1 && "\"Now turn to Section 1...\" → 25sn → Q1-5 → \"Before you hear the rest...\" → 20sn → Q6-10 → \"That is the end of Section 1...\" → 30sn"}
          {section.number === 2 && "\"Now turn to Section 2...\" → 25sn → Q11-15 → ara → Q16-20 → \"That is the end of Section 2...\" → 30sn"}
          {section.number === 3 && "\"Now turn to Section 3...\" → 25sn → Q21-25 → ara → Q26-30 → \"That is the end of Section 3...\" → 30sn"}
          {section.number === 4 && "\"Now turn to Section 4...\" → 45sn → ders başlar (ARA YOK) → \"That is the end of the listening test. You now have 10 minutes...\""}
        </p>
      </div>
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold">🔊 Main Audio <span className="font-normal text-xs text-[#7a6258]">(sadece konuşma içeriği)</span></label>
        {section.audioUrl && <p className="mb-1 text-xs text-green-600">✓ Main audio uploaded</p>}
        <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) onChange({ ...section, audioFile: f, audioUrl: "" }); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />
      </div>
      <div className="flex flex-col gap-4">
        {section.questionGroups.map((group, gi) => (
          <QuestionGroupEditor key={group.id} group={group}
            onChange={newData => { const updated = [...section.questionGroups]; updated[gi] = { ...group, data: newData }; onChange({ ...section, questionGroups: updated }); }}
            onRemove={() => { const updated = section.questionGroups.filter((_, i) => i !== gi); onChange({ ...section, questionGroups: updated }); }}
          />
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-dashed border-[#c9a99a] bg-[#f7eee8] p-4">
        <p className="mb-3 text-sm font-semibold text-[#7a6258]">Add Question Group to Section {section.number}</p>
        <div className="grid gap-2 md:grid-cols-2">
          <select value={addingGroupType} onChange={e => setAddingGroupType(e.target.value as QuestionGroupType)} className="rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm">
            <option value="">Select type...</option>
            {QUESTION_GROUP_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
          </select>
          <input type="text" value={groupLabel} onChange={e => setGroupLabel(e.target.value)} placeholder="e.g. Questions 1–5" className="rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm" />
        </div>
        <div className="grid gap-2 md:grid-cols-2 mt-2">
          <input type="text" value={groupWordLimit} onChange={e => setGroupWordLimit(e.target.value)} placeholder="Word limit — e.g. NO MORE THAN TWO WORDS AND/OR A NUMBER" className="rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input type="checkbox" checked={groupIsSection4} onChange={e => setGroupIsSection4(e.target.checked)} className="h-4 w-4" />
              Section 4 (no reading break)
            </label>
            <button onClick={addGroup} disabled={!addingGroupType} className="flex-1 rounded-2xl bg-[#3b2f2f] py-2 text-sm font-semibold text-white disabled:opacity-40">+ Add Group</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main AdminScreen ─────────────────────────────────────────────────────────

export default function AdminScreen({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("new");
  const [episodeType, setEpisodeType] = useState<EpisodeType>("practice-mcq");
  const [examType, setExamType] = useState("");
  const [examSection, setExamSection] = useState<number | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([createEmptyMCQ()]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [fillQuestions, setFillQuestions] = useState<FillQuestion[]>([createEmptyFill()]);
  const [dictationQuestions, setDictationQuestions] = useState<DictationQuestion[]>([createEmptyDictation()]);
  const [shortQuestions, setShortQuestions] = useState<ShortAnswerQuestion[]>([createEmptyShort()]);
  const [matchingQuestions, setMatchingQuestions] = useState<MatchingQuestion[]>([createEmptyMatching()]);
  const [mapQuestion, setMapQuestion] = useState<MapQuestion>(createEmptyMap());
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState("");
  const [mapImagePreview, setMapImagePreview] = useState("");
  const [addingPoint, setAddingPoint] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [noteQuestion, setNoteQuestion] = useState<NoteQuestion>(createEmptyNote());
  const [formQuestion, setFormQuestion] = useState<FormQuestion>(createEmptyForm());
  const [tableQuestion, setTableQuestion] = useState<TableQuestion>(createEmptyTable());
  const [flowQuestion, setFlowQuestion] = useState<FlowQuestion>(createEmptyFlow());
  const [sentenceQuestion, setSentenceQuestion] = useState<SentenceQuestion>(createEmptySentence());
  const [completionBulkText, setCompletionBulkText] = useState("");
  const [completionBulkMode, setCompletionBulkMode] = useState(false);
  const [examSections, setExamSections] = useState<ExamSectionType[]>([createEmptySection(1), createEmptySection(2), createEmptySection(3), createEmptySection(4)]);
  const [practices, setPractices] = useState<PublishedPractice[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterExamSection, setFilterExamSection] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<{ email: string; created_at: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [managePage, setManagePage] = useState(0);

  const isPractice = episodeType.startsWith("practice-");
  const isCompletion = episodeType.startsWith("practice-completion-");
  const isExam = episodeType.startsWith("exam-");

  useEffect(() => { fetchPractices(); }, []);

  async function fetchPractices() {
    const { data, error } = await supabase.from("episodes").select("id, title, level, episode_type, exam_type, exam_section").order("created_at", { ascending: false });
    if (!error && data) setPractices(data);
  }

  async function fetchUsers() {
    setLoadingUsers(true);
    const { data, error } = await supabase.from("user_results").select("user_email, created_at").order("created_at", { ascending: false });
    if (!error && data) {
      const unique = Array.from(new Map(data.map(u => [u.user_email, u])).values()).map(u => ({ email: u.user_email, created_at: u.created_at }));
      setUsers(unique);
    }
    setLoadingUsers(false);
  }

  async function uploadFile(file: File, folder: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
    const { url } = await res.json();
    return url;
  }

  function handleMapImageSelect(file: File) {
    setMapImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setMapImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!addingPoint) return;
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newId = mapQuestion.points.length + 1;
    setMapQuestion(prev => ({ ...prev, points: [...prev.points, { id: newId, x, y, answer: "", explanation: "" }] }));
    setAddingPoint(false);
  }

  async function publishPractice() {
    setUploading(true);
    try {
      let audioUrl = existingAudioUrl;
      if (audioFile) audioUrl = await uploadFile(audioFile, "episode");
      let pdfUrl = existingPdfUrl;
      if (pdfFile) pdfUrl = await uploadFile(pdfFile, "pdf");
      let questions: any = null;
      let sections: any = null;

      if (isExam) {
        const processedSections = await Promise.all(examSections.map(async section => {
          let sectionAudioUrl = section.audioUrl;
          if (section.audioFile) sectionAudioUrl = await uploadFile(section.audioFile, "section");
          let introUrl = section.introUrl || "";
          if (section.introFile) introUrl = await uploadFile(section.introFile, "intro");
          const processedGroups = await Promise.all(section.questionGroups.map(async group => {
            if (group.type === "map" && group.data?._imageFile) {
              const imageUrl = await uploadFile(group.data._imageFile, "map");
              const { _imageFile, ...cleanData } = group.data;
              return { ...group, data: { ...cleanData, imageUrl } };
            }
            return group;
          }));
          return { number: section.number, audioUrl: sectionAudioUrl, introUrl, questionGroups: processedGroups };
        }));
        sections = processedSections;
      } else if (!audioUrl) {
        alert("Please upload main audio."); setUploading(false); return;
      }

      if (episodeType === "practice-mcq" || episodeType.startsWith("quiz-")) {
        if (bulkMode && bulkText.trim()) {
          const parsed = parseBulkMCQ(bulkText);
          if (!parsed.length) { alert("No questions found."); setUploading(false); return; }
          questions = parsed;
        } else {
          questions = mcqQuestions.filter(q => q.question.trim());
          if (!questions.length) { alert("Please add at least one question."); setUploading(false); return; }
        }
      } else if (episodeType === "practice-fill") { questions = fillQuestions.filter(q => q.text.trim());
      } else if (episodeType === "practice-dictation") { questions = dictationQuestions.filter(q => q.sentence.trim());
      } else if (episodeType === "practice-short") { questions = shortQuestions.filter(q => q.question.trim() && q.answer.trim());
      } else if (episodeType === "practice-matching") { questions = matchingQuestions;
      } else if (episodeType === "practice-map") {
        if (!mapImageFile && !mapImageUrl) { alert("Please upload a map image."); setUploading(false); return; }
        const finalMapImageUrl = mapImageFile ? await uploadFile(mapImageFile, "map") : mapImageUrl;
        questions = [{ ...mapQuestion, imageUrl: finalMapImageUrl }];
      } else if (episodeType === "practice-completion-note") { questions = [noteQuestion];
      } else if (episodeType === "practice-completion-form") { questions = [formQuestion];
      } else if (episodeType === "practice-completion-table") { questions = [tableQuestion];
      } else if (episodeType === "practice-completion-flow") { questions = [flowQuestion];
      } else if (episodeType === "practice-completion-sentence") { questions = [sentenceQuestion]; }

      const autoLevel = isPractice ? getAutoLevel(examType, examSection) : null;
      const autoTitle = getAutoTitle(examType, examSection, episodeType);

      const payload: Record<string, any> = {
        level: autoLevel,
        title: autoTitle,
        audio_url: isExam ? null : audioUrl,
        episode_type: episodeType,
        show_notes: episodeType === "practice-fill" ? showNotes : false,
        questions: isExam ? null : questions,
        sections: isExam ? sections : null,
        vocabulary: [],
        pdf_url: pdfUrl || null,
        exam_type: isPractice && examType ? examType : null,
        exam_section: isPractice && examType === "ielts" && examSection ? examSection : null,
      };

      let dbError = null;
      if (editingId) { const { error } = await supabase.from("episodes").update(payload).eq("id", editingId); dbError = error; }
      else { const { error } = await supabase.from("episodes").insert([payload]); dbError = error; }
      if (dbError) throw new Error(dbError.message);
      resetForm(); await fetchPractices();
      alert(editingId ? "Practice updated!" : "Practice published!");
    } catch (err) {
      alert("Failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally { setUploading(false); }
  }

  function resetForm() {
    setEditingId(null); setAudioFile(null); setExistingAudioUrl("");
    setPdfFile(null); setExistingPdfUrl(""); setShowNotes(false);
    setExamType(""); setExamSection(null);
    setMcqQuestions([createEmptyMCQ()]); setFillQuestions([createEmptyFill()]);
    setDictationQuestions([createEmptyDictation()]); setShortQuestions([createEmptyShort()]);
    setMatchingQuestions([createEmptyMatching()]);
    setMapQuestion(createEmptyMap()); setMapImageFile(null); setMapImageUrl(""); setMapImagePreview(""); setAddingPoint(false);
    setNoteQuestion(createEmptyNote()); setFormQuestion(createEmptyForm());
    setTableQuestion(createEmptyTable()); setFlowQuestion(createEmptyFlow()); setSentenceQuestion(createEmptySentence());
    setCompletionBulkText(""); setCompletionBulkMode(false);
    setExamSections([createEmptySection(1), createEmptySection(2), createEmptySection(3), createEmptySection(4)]);
    setBulkMode(false); setBulkText(""); setBulkError("");
  }

  async function handleEdit(id: string) {
    const { data, error } = await supabase.from("episodes").select("*").eq("id", id).single();
    if (error || !data) return;
    setEditingId(data.id); setEpisodeType(data.episode_type || "practice-mcq");
    setExamType(data.exam_type || ""); setExamSection(data.exam_section || null);
    setExistingAudioUrl(data.audio_url || ""); setExistingPdfUrl(data.pdf_url || "");
    setShowNotes(data.show_notes || false); setAudioFile(null); setPdfFile(null);
    setBulkMode(false); setBulkText(""); setBulkError("");
    setCompletionBulkText(""); setCompletionBulkMode(false);
    if (data.sections && data.episode_type?.startsWith("exam-")) {
      setExamSections(data.sections.map((s: any) => ({
        id: `section-${s.number}`, number: s.number,
        audioFile: null, audioUrl: s.audioUrl || "",
        introFile: null, introUrl: s.introUrl || "",
        questionGroups: s.questionGroups || []
      })));
    }
    if (data.questions) {
      const et = data.episode_type;
      if (et === "practice-fill") setFillQuestions(data.questions);
      else if (et === "practice-dictation") setDictationQuestions(data.questions);
      else if (et === "practice-short") setShortQuestions(data.questions);
      else if (et === "practice-matching") setMatchingQuestions(data.questions);
      else if (et === "practice-map") { const mq = data.questions[0]; setMapQuestion({ points: mq.points || [], options: mq.options || [] }); setMapImageUrl(mq.imageUrl || ""); setMapImagePreview(mq.imageUrl || ""); }
      else if (et === "practice-completion-note") setNoteQuestion(data.questions[0]);
      else if (et === "practice-completion-form") setFormQuestion(data.questions[0]);
      else if (et === "practice-completion-table") setTableQuestion(data.questions[0]);
      else if (et === "practice-completion-flow") setFlowQuestion(data.questions[0]);
      else if (et === "practice-completion-sentence") setSentenceQuestion(data.questions[0]);
      else setMcqQuestions(data.questions.map((q: MCQQuestion) => ({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation || "" })));
    }
    setActiveTab("new"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filteredPractices = practices.filter(p => {
    const matchType = filterType === "all" || p.episode_type === filterType;
    const matchLevel = filterLevel === "all" || p.level === filterLevel;
    const matchSection = filterExamSection === "all" || String(p.exam_section) === filterExamSection;
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchLevel && matchSection && matchSearch;
  });

  function applyCompletionBulk() {
    if (!completionBulkText.trim()) return;
    if (episodeType === "practice-completion-note") setNoteQuestion(parseBulkNote(completionBulkText));
    else if (episodeType === "practice-completion-form") setFormQuestion(parseBulkForm(completionBulkText));
    else if (episodeType === "practice-completion-table") setTableQuestion(parseBulkTable(completionBulkText));
    else if (episodeType === "practice-completion-flow") setFlowQuestion(parseBulkFlow(completionBulkText));
    else if (episodeType === "practice-completion-sentence") setSentenceQuestion(parseBulkSentence(completionBulkText));
    setCompletionBulkMode(false); setCompletionBulkText("");
  }

  function getBulkFormat() {
    if (episodeType === "practice-completion-note") return `TITLE) Meeting Notes\nNOTE) Speaker: ___\nNOTE) Topic: ___\nANS1) Dr. Johnson\nANS2) writing`;
    if (episodeType === "practice-completion-form") return `TITLE) Registration\nFIELD) Name: John ___\nFIELD) ID: ___\nANS1) Peterson\nANS2) LB4521`;
    if (episodeType === "practice-completion-table") return `TITLE) Train Schedule\nHEADERS) Destination|Time|Platform\nROW) London|09:15|___\nROW) ___|11:30|Platform 3\nANS1) Platform 2\nANS2) Birmingham`;
    if (episodeType === "practice-completion-flow") return `TITLE) Process\nSTEP) Return book at ___\nSTEP) Check documents\nANS1) main desk`;
    if (episodeType === "practice-completion-sentence") return `S) The conference will be in ___ next month.\nS) Arrive ___ minutes early.\nANS1) Berlin\nANS2) fifteen|15`;
    return "";
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">Admin Panel</h1>
            <p className="mt-2 text-[#7a6258]">Create and manage practices.</p>
          </div>
          <button onClick={onBack} className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold shadow-sm">Back</button>
        </div>

        <div className="mt-8 flex gap-3 flex-wrap">
          {[
            { id: "new", label: editingId ? "✏️ Edit" : "➕ New Practice" },
            { id: "manage", label: `📋 Manage (${practices.length})` },
            { id: "users", label: "👥 Users" },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as AdminTab); if (tab.id === "users") fetchUsers(); }}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${activeTab === tab.id ? "bg-[#3b2f2f] text-white" : "border border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── NEW PRACTICE TAB ─── */}
        {activeTab === "new" && (
          <div className="mt-8">
            <div className="rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold">{editingId ? "Edit Practice" : "New Practice"}</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                {[
                  { label: "Practice", types: PRACTICE_TYPES },
                  { label: "Completions", types: COMPLETION_TYPES },
                  { label: "🎓 Full Exam", types: EXAM_TYPES_LIST },
                  { label: "Quiz", types: QUIZ_TYPES },
                ].map(col => (
                  <div key={col.label}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7a6258]">{col.label}</p>
                    <div className="flex flex-col gap-2">
                      {col.types.map(t => (
                        <button key={t.id} onClick={() => { setEpisodeType(t.id as EpisodeType); setExamType(""); setExamSection(null); }}
                          className={`rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition ${episodeType === t.id ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4">
                {/* Exam Type */}
                {isPractice && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Exam Type <span className="font-normal text-xs text-[#7a6258]">(optional)</span>
                    </label>
                    <select value={examType} onChange={e => { setExamType(e.target.value); setExamSection(null); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <option value="">General — no exam tag</option>
                      <option value="ielts">IELTS</option>
                      <option value="toefl">TOEFL</option>
                      <option value="toeic">TOEIC</option>
                      <option value="celpip">CELPIP</option>
                    </select>
                  </div>
                )}

                {/* IELTS Section */}
                {isPractice && examType === "ielts" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">IELTS Section</label>
                    <select value={examSection || ""} onChange={e => setExamSection(Number(e.target.value))} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <option value="">Select section...</option>
                      {IELTS_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                )}

                {/* Auto info */}
                {isPractice && (
                  <div className="rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm text-[#7a6258]">
                    <p>📋 <strong>Level:</strong> {getAutoLevel(examType, examSection)}</p>
                    <p className="mt-1">🏷️ <strong>Title will be:</strong> {getAutoTitle(examType, examSection, episodeType)}</p>
                  </div>
                )}

                {/* Audio */}
                {!isExam && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Main Audio</label>
                    {existingAudioUrl && !audioFile && <p className="mb-2 text-sm text-green-600">✓ Current audio kept.</p>}
                    <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] ?? null)} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4" />
                  </div>
                )}

                {/* PDF */}
                {isExam && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Question Paper PDF <span className="font-normal text-[#7a6258]">(optional)</span></label>
                    {existingPdfUrl && !pdfFile && <p className="mb-2 text-sm text-green-600">✓ PDF uploaded.</p>}
                    <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4" />
                  </div>
                )}
              </div>
            </div>

            {/* EXAM SECTIONS */}
            {isExam && (
              <div className="mt-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Exam Sections</h2>
                  <button onClick={() => setExamSections([...examSections, createEmptySection(examSections.length + 1)])} className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#f1ded5]">+ Add Section</button>
                </div>
                {examSections.map((section, si) => (
                  <ExamSectionEditor key={section.id} section={section}
                    onChange={updated => { const u = [...examSections]; u[si] = updated; setExamSections(u); }}
                    onRemove={() => setExamSections(examSections.filter((_, i) => i !== si).map((s, i) => ({ ...s, number: i + 1 })))}
                  />
                ))}
              </div>
            )}

            {/* MCQ */}
            {(episodeType === "practice-mcq" || episodeType.startsWith("quiz-")) && (
              <div className="mt-6 rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold">Questions</h2>
                  <div className="flex gap-3">
                    <button onClick={() => { setBulkMode(!bulkMode); setBulkError(""); }} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${bulkMode ? "bg-[#ead7cc]" : "border border-[#e0c7bb] bg-white"}`}>{bulkMode ? "Manual" : "Bulk Paste"}</button>
                    {!bulkMode && <button onClick={() => setMcqQuestions([...mcqQuestions, createEmptyMCQ()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Question</button>}
                  </div>
                </div>
                {bulkMode && (
                  <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-white p-5">
                    <pre className="rounded-2xl bg-[#f7eee8] p-3 text-xs leading-6 text-[#7a6258]">{`Q) Soru\nA) Şık A\nB) Şık B\nC) Şık C\nD) Şık D\nE) Şık E\nCorrect) C\nExplanation) Açıklama\n\nQ) Sonraki...`}</pre>
                    <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Soruları yapıştır..." className="mt-3 min-h-[280px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 font-mono text-sm" />
                    {bulkError && <p className="mt-2 text-sm text-red-600">{bulkError}</p>}
                    <button onClick={() => { setBulkError(""); const parsed = parseBulkMCQ(bulkText); if (!parsed.length) { setBulkError("No questions found."); return; } setMcqQuestions(parsed); setBulkMode(false); setBulkText(""); }} className="mt-3 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Apply</button>
                  </div>
                )}
                {!bulkMode && (
                  <div className="mt-6 flex flex-col gap-6">
                    {mcqQuestions.map((item, index) => (
                      <div key={index} className="rounded-2xl border border-[#e0c7bb] bg-white p-5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Question {index + 1}</span>
                          <button onClick={() => setMcqQuestions(mcqQuestions.filter((_, i) => i !== index))} className="text-sm text-red-600">Remove</button>
                        </div>
                        <textarea value={item.question} onChange={e => { const u = [...mcqQuestions]; u[index].question = e.target.value; setMcqQuestions(u); }} placeholder="Write your question..." className="mt-3 min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3" />
                        <div className="mt-4 flex flex-col gap-2">
                          {(["A","B","C","D","E"] as const).map(letter => (
                            <div key={letter} className="flex items-center gap-3 rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${item.correctAnswer === letter ? "bg-green-200 text-green-800" : "bg-[#ead7cc]"}`}>{letter}</span>
                              <input type="text" value={item.options[letter]} onChange={e => { const u = [...mcqQuestions]; u[index].options[letter] = e.target.value; setMcqQuestions(u); }} placeholder={`Option ${letter}`} className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-sm" />
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-sm font-semibold">Correct Answer</label>
                          <select value={item.correctAnswer} onChange={e => { const u = [...mcqQuestions]; u[index].correctAnswer = e.target.value as any; setMcqQuestions(u); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                            {["A","B","C","D","E"].map(l => <option key={l}>{l}</option>)}
                          </select>
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-sm font-semibold">Explanation</label>
                          <textarea value={item.explanation || ""} onChange={e => { const u = [...mcqQuestions]; u[index].explanation = e.target.value; setMcqQuestions(u); }} placeholder="Doğru cevap neden doğru?" className="min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fill */}
            {episodeType === "practice-fill" && (
              <div className="mt-6 rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Fill in the Blank</h2>
                  <button onClick={() => setFillQuestions([...fillQuestions, createEmptyFill()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Paragraph</button>
                </div>
                <label className="mt-5 flex items-center gap-3 text-sm font-semibold">
                  <input type="checkbox" checked={showNotes} onChange={e => setShowNotes(e.target.checked)} className="h-4 w-4" />Show notes field
                </label>
                <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
                  <pre className="text-xs leading-6 text-[#7a6258]">{`TEXT) The meeting was ___ at 3pm.\nANS1) scheduled\nANS2) conference room|boardroom`}</pre>
                </div>
                <textarea placeholder={`TEXT) The meeting was ___ at 3pm.\nANS1) scheduled|planned`} className="mt-4 min-h-[200px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 font-mono text-sm"
                  onChange={e => {
                    const blocks = e.target.value.trim().split(/\n{2,}/);
                    const parsed: FillQuestion[] = [];
                    for (const block of blocks) {
                      const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
                      const textLine = lines.find(l => /^TEXT\)/i.test(l));
                      if (!textLine) continue;
                      const text = textLine.replace(/^TEXT\)\s*/i, "");
                      const answerLines = lines.filter(l => /^ANS\d+\)/i.test(l));
                      const blanks = answerLines.map((l, idx) => ({ index: idx, answer: l.replace(/^ANS\d+\)\s*/i, "").trim() }));
                      parsed.push({ text, blanks });
                    }
                    if (parsed.length) setFillQuestions(parsed);
                  }}
                />
                <div className="mt-4 flex flex-col gap-3">
                  {fillQuestions.map((item, i) => (
                    <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Paragraph {i + 1}</span>
                        <button onClick={() => fillQuestions.length > 1 && setFillQuestions(fillQuestions.filter((_, j) => j !== i))} disabled={fillQuestions.length <= 1} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                      </div>
                      <p className="mt-2 text-sm text-[#7a6258]">{item.text || "—"}</p>
                      {item.blanks.map((b, bi) => <p key={bi} className="mt-1 text-xs text-[#7a6258]">Blank {bi + 1}: <strong>{b.answer}</strong></p>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dictation */}
            {episodeType === "practice-dictation" && (
              <div className="mt-6 rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <h2 className="text-2xl font-bold">Dictation</h2>
                <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
                  <pre className="text-xs leading-6 text-[#7a6258]">{`S) The conference will be held next Monday.\nS) The colour|color of the sky is blue.`}</pre>
                </div>
                <textarea placeholder="S) The conference will be held next Monday." className="mt-4 min-h-[150px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 font-mono text-sm"
                  onChange={e => { const lines = e.target.value.split("\n").map(l => l.trim()).filter(l => /^S\)/i.test(l)); if (lines.length) setDictationQuestions(lines.map(l => ({ sentence: l.replace(/^S\)\s*/i, "").trim() }))); }}
                />
                <div className="mt-4 flex flex-col gap-3">
                  {dictationQuestions.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <p className="text-sm">{item.sentence || "—"}</p>
                      <button onClick={() => dictationQuestions.length > 1 && setDictationQuestions(dictationQuestions.filter((_, j) => j !== i))} disabled={dictationQuestions.length <= 1} className="ml-4 shrink-0 text-sm text-red-600 disabled:opacity-30">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Short Answer */}
            {episodeType === "practice-short" && (
              <div className="mt-6 rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Short Answer</h2>
                  <button onClick={() => setShortQuestions([...shortQuestions, createEmptyShort()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Question</button>
                </div>
                <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
                  <pre className="text-xs leading-6 text-[#7a6258]">{`Q) What time does the library close?\nA) 9pm|nine o'clock\nH) Think about closing times`}</pre>
                </div>
                <textarea placeholder={`Q) What time?\nA) 9pm|nine\nH) Hint`} className="mt-4 min-h-[150px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 font-mono text-sm"
                  onChange={e => {
                    const blocks = e.target.value.trim().split(/\n{2,}/);
                    const parsed: ShortAnswerQuestion[] = [];
                    for (const block of blocks) {
                      const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
                      const qLine = lines.find(l => /^Q\)/i.test(l)); const aLine = lines.find(l => /^A\)/i.test(l)); const hLine = lines.find(l => /^H\)/i.test(l));
                      if (!qLine || !aLine) continue;
                      parsed.push({ question: qLine.replace(/^Q\)\s*/i, "").trim(), answer: aLine.replace(/^A\)\s*/i, "").trim(), hint: hLine ? hLine.replace(/^H\)\s*/i, "").trim() : "" });
                    }
                    if (parsed.length) setShortQuestions(parsed);
                  }}
                />
                <div className="mt-4 flex flex-col gap-4">
                  {shortQuestions.map((item, i) => (
                    <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Q{i + 1}</span>
                        <button onClick={() => shortQuestions.length > 1 && setShortQuestions(shortQuestions.filter((_, j) => j !== i))} disabled={shortQuestions.length <= 1} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                      </div>
                      <input type="text" value={item.question} onChange={e => { const u = [...shortQuestions]; u[i].question = e.target.value; setShortQuestions(u); }} placeholder="Question" className="mt-2 w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                      <input type="text" value={item.answer} onChange={e => { const u = [...shortQuestions]; u[i].answer = e.target.value; setShortQuestions(u); }} placeholder="Answer | alt" className="mt-2 w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                      <input type="text" value={item.hint || ""} onChange={e => { const u = [...shortQuestions]; u[i].hint = e.target.value; setShortQuestions(u); }} placeholder="Hint (optional)" className="mt-2 w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matching */}
            {episodeType === "practice-matching" && (
              <div className="mt-6 rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Matching</h2>
                  <button onClick={() => setMatchingQuestions([...matchingQuestions, createEmptyMatching()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Set</button>
                </div>
                <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
                  <pre className="text-xs leading-6 text-[#7a6258]">{`L) Monday\nR) First day\n\nL) Tuesday\nR) Second day`}</pre>
                </div>
                <textarea placeholder={`L) Monday\nR) First day`} className="mt-4 min-h-[200px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 font-mono text-sm"
                  onChange={e => {
                    const blocks = e.target.value.trim().split(/\n{2,}/);
                    const pairs: { left: string; right: string }[] = [];
                    for (const block of blocks) {
                      const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
                      const lLine = lines.find(l => /^L\)/i.test(l)); const rLine = lines.find(l => /^R\)/i.test(l));
                      if (!lLine || !rLine) continue;
                      pairs.push({ left: lLine.replace(/^L\)\s*/i, "").trim(), right: rLine.replace(/^R\)\s*/i, "").trim() });
                    }
                    if (pairs.length) setMatchingQuestions([{ pairs }]);
                  }}
                />
                <div className="mt-4 flex flex-col gap-6">
                  {matchingQuestions.map((mq, mi) => (
                    <div key={mi} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold">Set {mi + 1}</span>
                        <div className="flex gap-3">
                          <button onClick={() => { const u = [...matchingQuestions]; u[mi].pairs.push({ left: "", right: "" }); setMatchingQuestions(u); }} className="text-sm font-semibold text-[#3b2f2f]">+ Pair</button>
                          {matchingQuestions.length > 1 && <button onClick={() => setMatchingQuestions(matchingQuestions.filter((_, j) => j !== mi))} className="text-sm text-red-600">Remove</button>}
                        </div>
                      </div>
                      {mq.pairs.map((pair, pi) => (
                        <div key={pi} className="mt-2 grid grid-cols-2 gap-2">
                          <input type="text" value={pair.left} onChange={e => { const u = [...matchingQuestions]; u[mi].pairs[pi].left = e.target.value; setMatchingQuestions(u); }} placeholder={`Item ${pi + 1}`} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                          <input type="text" value={pair.right} onChange={e => { const u = [...matchingQuestions]; u[mi].pairs[pi].right = e.target.value; setMatchingQuestions(u); }} placeholder={`Match ${pi + 1}`} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {episodeType === "practice-map" && (
              <div className="mt-6 rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <h2 className="text-2xl font-bold">🗺️ Map Labelling</h2>
                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold">Map Image</label>
                  <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleMapImageSelect(f); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4" />
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold">Options (A–H)</label>
                    <div className="flex gap-2">
                      <button onClick={() => { const next = OPTION_KEYS[mapQuestion.options.length]; if (next) setMapQuestion(prev => ({ ...prev, options: [...prev.options, { key: next, label: "" }] })); }} disabled={mapQuestion.options.length >= 8} className="rounded-xl bg-[#3b2f2f] px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">+</button>
                      <button onClick={() => { if (mapQuestion.options.length > 2) setMapQuestion(prev => ({ ...prev, options: prev.options.slice(0, -1) })); }} disabled={mapQuestion.options.length <= 2} className="rounded-xl border border-[#e0c7bb] bg-white px-3 py-1 text-xs font-semibold disabled:opacity-40">-</button>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {mapQuestion.options.map((opt, i) => (
                      <div key={opt.key} className="flex items-center gap-2 rounded-2xl border border-[#e0c7bb] bg-white p-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">{opt.key}</span>
                        <input type="text" value={opt.label} onChange={e => { const u = [...mapQuestion.options]; u[i].label = e.target.value; setMapQuestion(prev => ({ ...prev, options: u })); }} placeholder="e.g. Library" className="w-full rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
                {mapImagePreview && (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-semibold">Click to add points</label>
                      <button onClick={() => setAddingPoint(!addingPoint)} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${addingPoint ? "bg-blue-600 text-white" : "border border-[#e0c7bb] bg-white"}`}>{addingPoint ? "🎯 Click map..." : "➕ Add Point"}</button>
                    </div>
                    <div ref={mapContainerRef} onClick={handleMapClick} className={`relative w-full overflow-hidden rounded-3xl border-2 ${addingPoint ? "border-blue-400 cursor-crosshair" : "border-[#e0c7bb]"}`} style={{ paddingBottom: "60%" }}>
                      <img src={mapImagePreview} alt="Map" className="absolute inset-0 h-full w-full object-contain bg-white" draggable={false} />
                      {mapQuestion.points.map(point => (
                        <div key={point.id} className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#3b2f2f] text-xs font-bold text-white shadow-lg cursor-pointer hover:bg-red-600 transition" style={{ left: `${point.x}%`, top: `${point.y}%` }}
                          onClick={e => { e.stopPropagation(); if (!addingPoint) setMapQuestion(prev => ({ ...prev, points: prev.points.filter(p => p.id !== point.id).map((p, i) => ({ ...p, id: i + 1 })) })); }}>{point.id}</div>
                      ))}
                    </div>
                  </div>
                )}
                {mapQuestion.points.length > 0 && (
                  <div className="mt-6">
                    <label className="mb-3 block text-sm font-semibold">Point Answers & Explanations</label>
                    <div className="flex flex-col gap-4">
                      {mapQuestion.points.map((point, i) => (
                        <div key={point.id} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white mb-3">{point.id}</div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select value={point.answer} onChange={e => { const u = [...mapQuestion.points]; u[i].answer = e.target.value; setMapQuestion(prev => ({ ...prev, points: u })); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm">
                              <option value="">Select...</option>
                              {mapQuestion.options.map(opt => <option key={opt.key} value={opt.key}>{opt.key}) {opt.label}</option>)}
                            </select>
                            <textarea value={point.explanation} onChange={e => { const u = [...mapQuestion.points]; u[i].explanation = e.target.value; setMapQuestion(prev => ({ ...prev, points: u })); }} placeholder="Explanation..." className="min-h-[70px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completion Types */}
            {isCompletion && (
              <div className="mt-6 rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold">
                    {episodeType === "practice-completion-note" && "📝 Note Completion"}
                    {episodeType === "practice-completion-form" && "📄 Form Completion"}
                    {episodeType === "practice-completion-table" && "📊 Table Completion"}
                    {episodeType === "practice-completion-flow" && "🔄 Flow Chart"}
                    {episodeType === "practice-completion-sentence" && "✏️ Sentence Completion"}
                  </h2>
                  <button onClick={() => setCompletionBulkMode(!completionBulkMode)} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${completionBulkMode ? "bg-[#ead7cc]" : "border border-[#e0c7bb] bg-white"}`}>{completionBulkMode ? "Manual" : "Bulk Paste"}</button>
                </div>
                {completionBulkMode && (
                  <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-white p-5">
                    <pre className="rounded-2xl bg-[#f7eee8] p-3 text-xs leading-6 text-[#7a6258]">{getBulkFormat()}</pre>
                    <textarea value={completionBulkText} onChange={e => setCompletionBulkText(e.target.value)} placeholder="Yapıştır..." className="mt-3 min-h-[250px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 font-mono text-sm" />
                    <button onClick={applyCompletionBulk} className="mt-3 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Apply</button>
                  </div>
                )}
                {!completionBulkMode && episodeType === "practice-completion-note" && (
                  <div className="mt-6">
                    <input type="text" value={noteQuestion.title} onChange={e => setNoteQuestion(prev => ({ ...prev, title: e.target.value }))} placeholder="Title" className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm mb-3" />
                    {noteQuestion.items.map((item, i) => (
                      <div key={i} className="mt-2 grid grid-cols-2 gap-2">
                        <input type="text" value={item.label} onChange={e => { const u = [...noteQuestion.items]; u[i].label = e.target.value; setNoteQuestion(prev => ({ ...prev, items: u })); }} placeholder="Label" className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                        <input type="text" value={item.answer} onChange={e => { const u = [...noteQuestion.items]; u[i].answer = e.target.value; setNoteQuestion(prev => ({ ...prev, items: u })); }} placeholder="Answer | alt" className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                      </div>
                    ))}
                    <button onClick={() => setNoteQuestion(prev => ({ ...prev, items: [...prev.items, { label: "", answer: "" }] }))} className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold">+ Add Item</button>
                  </div>
                )}
                {!completionBulkMode && episodeType === "practice-completion-form" && (
                  <div className="mt-6">
                    <input type="text" value={formQuestion.title} onChange={e => setFormQuestion(prev => ({ ...prev, title: e.target.value }))} placeholder="Form Title" className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm mb-3" />
                    {formQuestion.fields.map((field, i) => (
                      <div key={i} className="mt-2 grid grid-cols-2 gap-2">
                        <input type="text" value={field.label} onChange={e => { const u = [...formQuestion.fields]; u[i].label = e.target.value; setFormQuestion(prev => ({ ...prev, fields: u })); }} placeholder="Field label" className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                        <input type="text" value={field.answer} onChange={e => { const u = [...formQuestion.fields]; u[i].answer = e.target.value; setFormQuestion(prev => ({ ...prev, fields: u })); }} placeholder="Answer | alt" className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                      </div>
                    ))}
                    <button onClick={() => setFormQuestion(prev => ({ ...prev, fields: [...prev.fields, { label: "", answer: "" }] }))} className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold">+ Add Field</button>
                  </div>
                )}
                {!completionBulkMode && episodeType === "practice-completion-flow" && (
                  <div className="mt-6">
                    <input type="text" value={flowQuestion.title} onChange={e => setFlowQuestion(prev => ({ ...prev, title: e.target.value }))} placeholder="Title" className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm mb-3" />
                    {flowQuestion.steps.map((step, i) => (
                      <div key={i} className="mt-2 rounded-2xl border border-[#e0c7bb] bg-white p-3">
                        <input type="text" value={step.text} onChange={e => { const u = [...flowQuestion.steps]; u[i].text = e.target.value; u[i].hasBlank = e.target.value.includes("___"); setFlowQuestion(prev => ({ ...prev, steps: u })); }} placeholder="Step (use ___ for blank)" className="w-full rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                        {step.hasBlank && <input type="text" value={step.answer} onChange={e => { const u = [...flowQuestion.steps]; u[i].answer = e.target.value; setFlowQuestion(prev => ({ ...prev, steps: u })); }} placeholder="Answer" className="mt-1 w-full rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />}
                      </div>
                    ))}
                    <button onClick={() => setFlowQuestion(prev => ({ ...prev, steps: [...prev.steps, { text: "", answer: "", hasBlank: false }] }))} className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold">+ Add Step</button>
                  </div>
                )}
                {!completionBulkMode && episodeType === "practice-completion-sentence" && (
                  <div className="mt-6">
                    {sentenceQuestion.items.map((item, i) => (
                      <div key={i} className="mt-2 rounded-2xl border border-[#e0c7bb] bg-white p-3">
                        <input type="text" value={item.text} onChange={e => { const u = [...sentenceQuestion.items]; u[i].text = e.target.value; setSentenceQuestion(prev => ({ ...prev, items: u })); }} placeholder="Sentence with ___ blank" className="w-full rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                        <input type="text" value={item.answer} onChange={e => { const u = [...sentenceQuestion.items]; u[i].answer = e.target.value; setSentenceQuestion(prev => ({ ...prev, items: u })); }} placeholder="Answer | alt" className="mt-1 w-full rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                      </div>
                    ))}
                    <button onClick={() => setSentenceQuestion(prev => ({ ...prev, items: [...prev.items, { text: "", answer: "" }] }))} className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold">+ Add Sentence</button>
                  </div>
                )}
                {!completionBulkMode && episodeType === "practice-completion-table" && (
                  <div className="mt-6">
                    <p className="text-sm text-[#7a6258]">Use Bulk Paste for tables — it's much easier.</p>
                    <pre className="mt-2 rounded-2xl bg-[#f7eee8] p-3 text-xs text-[#7a6258]">{getBulkFormat()}</pre>
                  </div>
                )}
              </div>
            )}

            <button onClick={publishPractice} disabled={uploading} className="mt-8 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424] disabled:opacity-40">
              {uploading ? "Publishing..." : editingId ? "Update Practice" : "Publish Practice"}
            </button>
            {editingId && <button onClick={resetForm} className="mt-3 w-full rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f]">Cancel Edit</button>}
          </div>
        )}

        {/* ─── MANAGE TAB ─── */}
        {activeTab === "manage" && (
          <div className="mt-8">
            <div className="rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Practices</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setManagePage(0); }} placeholder="🔍 Search..." className="rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setManagePage(0); }} className="rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm">
                  <option value="all">All Types</option>
                  {ALL_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
                </select>
                <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setManagePage(0); }} className="rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm">
                  <option value="all">All Levels</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={filterExamSection} onChange={e => { setFilterExamSection(e.target.value); setManagePage(0); }} className="rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm">
                  <option value="all">All Sections</option>
                  {IELTS_SECTIONS.map(s => <option key={s.value} value={String(s.value)}>IELTS S{s.value}</option>)}
                </select>
              </div>
              {(() => {
                const MANAGE_PAGE_SIZE = 15;
                const totalPages = Math.ceil(filteredPractices.length / MANAGE_PAGE_SIZE);
                const paged = filteredPractices.slice(managePage * MANAGE_PAGE_SIZE, (managePage + 1) * MANAGE_PAGE_SIZE);
                return (
                  <>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-[#7a6258]">{filteredPractices.length} practice found</p>
                      {totalPages > 1 && <p className="text-sm text-[#7a6258]">Page {managePage + 1} / {totalPages}</p>}
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      {paged.map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white p-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs text-[#7a6258]">{p.level ? `${p.level} — ` : ""}{ALL_TYPES.find(t => t.id === p.episode_type)?.label || p.episode_type}</p>
                              {p.exam_type === "ielts" && p.exam_section && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">IELTS S{p.exam_section}</span>
                              )}
                            </div>
                            <p className="font-bold">{p.title}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(p.id)} className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold">Edit</button>
                            <button onClick={async () => { if (!confirm("Delete?")) return; await supabase.from("episodes").delete().eq("id", p.id); fetchPractices(); }} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
                          </div>
                        </div>
                      ))}
                      {paged.length === 0 && <p className="py-8 text-center text-[#7a6258]">No practices found.</p>}
                    </div>
                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                        <button onClick={() => setManagePage(p => Math.max(0, p - 1))} disabled={managePage === 0} className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">← Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <button key={i} onClick={() => setManagePage(i)} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${managePage === i ? "bg-[#3b2f2f] text-white" : "border border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>{i + 1}</button>
                        ))}
                        <button onClick={() => setManagePage(p => Math.min(totalPages - 1, p + 1))} disabled={managePage === totalPages - 1} className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Next →</button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ─── USERS TAB ─── */}
        {activeTab === "users" && (
          <div className="mt-8">
            <div className="rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Users</h2>
                  <p className="mt-1 text-sm text-[#7a6258]">{users.length} registered users</p>
                </div>
                <button onClick={() => { const emails = users.map(u => u.email).join("\n"); navigator.clipboard.writeText(emails); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">
                  {copied ? "Copied ✓" : "Copy All Emails"}
                </button>
              </div>
              {loadingUsers ? <p className="mt-6 text-center text-[#7a6258]">Loading...</p> : (
                <div className="mt-6 flex flex-col gap-2">
                  {users.map((user, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3">
                      <p className="text-sm font-semibold">{user.email}</p>
                      <p className="text-xs text-[#7a6258]">{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {users.length === 0 && <p className="py-8 text-center text-[#7a6258]">No users yet.</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}