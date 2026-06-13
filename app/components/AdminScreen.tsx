/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = { onBack: () => void; };

type EpisodeType =
  | "practice-mcq" | "practice-fill" | "practice-dictation" | "practice-short" | "practice-matching" | "practice-map"
  | "practice-completion-note" | "practice-completion-form" | "practice-completion-table" | "practice-completion-flow" | "practice-completion-sentence"
  | "ielts-section"
  | "exam-ielts" | "exam-toefl" | "exam-toeic" | "exam-celpip"
  | "quiz-ielts" | "quiz-toefl" | "quiz-toeic" | "quiz-celpip";

type MCQQuestion = {
  question: string;
  options: { A: string; B: string; C: string; D?: string; E?: string; F?: string; G?: string };
  correctAnswer: string | string[];
  explanation?: string;
};
type FillQuestion = { text: string; blanks: { index: number; answer: string }[]; };
type DictationQuestion = { sentence: string; };
type ShortAnswerQuestion = { question: string; answer: string; hint?: string; };
type MatchingQuestion = {
  items: string[];
  options: { key: string; label: string }[];
  answers: Record<string, string>;
};
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
type ExamSectionType = { id: string; number: number; audioFile: File | null; audioUrl: string; audio2File?: File | null; audio2Url?: string; descFile?: File | null; descUrl?: string; introFile?: File | null; introUrl?: string; questionGroups: QuestionGroup[]; };
type PublishedPractice = { id: string; title: string; level: string; episode_type: EpisodeType; exam_type?: string; exam_section?: number; };
type AdminTab = "new" | "manage" | "users";

const PRACTICE_TYPES = [
  { id: "ielts-section", label: "IELTS Section (Mixed)", emoji: "🎧" },
  { id: "practice-mcq", label: "Multiple Choice", emoji: "🔤" },
  { id: "practice-fill", label: "Fill in the Blank", emoji: "✏️" },
  { id: "practice-dictation", label: "Dictation", emoji: "🎙️" },
  { id: "practice-short", label: "Short Answer", emoji: "✍️" },
  { id: "practice-matching", label: "Matching", emoji: "🔗" },
  { id: "practice-map", label: "Map Labelling", emoji: "🗺️" },
];
const PRACTICE_EXAM_TYPES = [
  { id: "ielts", label: "IELTS", emoji: "🎧" },
  { id: "toefl", label: "TOEFL", emoji: "🎓" },
  { id: "toeic", label: "TOEIC", emoji: "💼" },
  { id: "celpip", label: "CELPIP", emoji: "🍁" },
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
  return { id: `section-${Date.now()}-${number}`, number, audioFile: null, audioUrl: "", audio2File: null, audio2Url: "", descFile: null, descUrl: "", introFile: null, introUrl: "", questionGroups: [] };
}

const createEmptyMCQ = (): MCQQuestion => ({ question: "", options: { A: "", B: "", C: "" }, correctAnswer: "A", explanation: "" });
const createEmptyFill = (): FillQuestion => ({ text: "", blanks: [] });
const createEmptyDictation = (): DictationQuestion => ({ sentence: "" });
const createEmptyShort = (): ShortAnswerQuestion => ({ question: "", answer: "", hint: "" });
const createEmptyMatching = (): MatchingQuestion => ({
  items: ["", "", "", "", ""],
  options: [
    { key: "A", label: "" }, { key: "B", label: "" }, { key: "C", label: "" },
    { key: "D", label: "" }, { key: "E", label: "" }, { key: "F", label: "" },
    { key: "G", label: "" },
  ],
  answers: {},
});
const createEmptyMap = (): MapQuestion => ({ points: [], options: OPTION_KEYS.slice(0, 6).map(k => ({ key: k, label: "" })) });
const createEmptyNote = (): NoteQuestion => ({ title: "", items: [{ label: "", answer: "" }, { label: "", answer: "" }, { label: "", answer: "" }] });
const createEmptyForm = (): FormQuestion => ({ title: "", fields: [{ label: "", answer: "" }, { label: "", answer: "" }, { label: "", answer: "" }] });
const createEmptyTable = (): TableQuestion => ({ title: "", headers: ["", "", ""], rows: [{ cells: ["", "", ""], answerIndices: [], answers: [] }] });
const createEmptyFlow = (): FlowQuestion => ({ title: "", steps: [{ text: "", answer: "", hasBlank: false }, { text: "", answer: "", hasBlank: false }] });
const createEmptySentence = (): SentenceQuestion => ({ items: [{ text: "", answer: "" }, { text: "", answer: "" }] });
type IELTSSectionPart = {
  audioFile: File | null;
  audioUrl: string;
  introAudioFile?: File | null;
  introAudioUrl?: string;
  questionGroups: QuestionGroup[];
  mapImageFile?: File | null;
  mapImageUrl?: string;
  mapImagePreview?: string;
};

function createEmptyPart(): IELTSSectionPart {
  return { audioFile: null, audioUrl: "", introAudioFile: null, introAudioUrl: "", questionGroups: [], mapImageFile: null, mapImageUrl: "", mapImagePreview: "" };
}
function parseBulkMCQ(raw: string): MCQQuestion[] {
  const blocks = raw.trim().split(/\n{2,}/);
  const parsed: MCQQuestion[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const q: MCQQuestion = { question: "", options: { A: "", B: "", C: "" }, correctAnswer: "A", explanation: "" };
    for (const line of lines) {
      if (/^Q[):.\s]/i.test(line)) q.question = line.replace(/^Q[):.\s]+/i, "").trim();
      else if (/^A[):.\s]/i.test(line)) q.options.A = line.replace(/^A[):.\s]+/i, "").trim();
      else if (/^B[):.\s]/i.test(line)) q.options.B = line.replace(/^B[):.\s]+/i, "").trim();
      else if (/^C[):.\s]/i.test(line)) q.options.C = line.replace(/^C[):.\s]+/i, "").trim();
      else if (/^D[):.\s]/i.test(line)) q.options.D = line.replace(/^D[):.\s]+/i, "").trim();
      else if (/^E[):.\s]/i.test(line)) q.options.E = line.replace(/^E[):.\s]+/i, "").trim();
      else if (/^F[):.\s]/i.test(line)) q.options.F = line.replace(/^F[):.\s]+/i, "").trim();
      else if (/^G[):.\s]/i.test(line)) q.options.G = line.replace(/^G[):.\s]+/i, "").trim();
      else if (/^correct[):.\s]/i.test(line)) {
        const raw = line.replace(/^correct[):.\s]+/i, "").trim().toUpperCase();
        const answers = raw.split(",").map(a => a.trim()).filter(a => /^[A-G]$/.test(a));
        q.correctAnswer = answers.length === 1 ? answers[0] : answers;
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

// Helper: apply bulk text to a given IELTS part (0 or 1)
function applyBulkToPart(partIndex: number, type: QuestionGroupType | "", raw: string) {
  if (!raw.trim() || !type) return null;
  switch (type) {
    case "mcq": return parseBulkMCQ(raw);
    case "note-completion": return parseBulkNote(raw);
    case "form-completion": return parseBulkForm(raw);
    case "table-completion": return parseBulkTable(raw);
    case "flow-completion": return parseBulkFlow(raw);
    case "sentence-completion": return parseBulkSentence(raw);
    case "short-answer": {
      const blocks = raw.trim().split(/\n{2,}/);
      const parsed: ShortAnswerQuestion[] = [];
      for (const block of blocks) {
        const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
        const qLine = lines.find(l => /^Q\)/i.test(l));
        const aLine = lines.find(l => /^A\)/i.test(l));
        const hLine = lines.find(l => /^H\)/i.test(l));
        if (!qLine || !aLine) continue;
        parsed.push({ question: qLine.replace(/^Q\)\s*/i, "").trim(), answer: aLine.replace(/^A\)\s*/i, "").trim(), hint: hLine ? hLine.replace(/^H\)\s*/i, "").trim() : "" });
      }
      return parsed;
    }
    case "matching": {
      const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
      const items: string[] = [];
      const options: { key: string; label: string }[] = [];
      const answers: Record<string, string> = {};
      for (const line of lines) {
        if (/^Q\d+\)/i.test(line)) {
          const match = line.match(/^Q(\d+)\)\s*(.*)/i);
          if (match) items.push(match[2].trim());
        } else if (/^[A-G]\)/i.test(line)) {
          const key = line[0].toUpperCase();
          const label = line.replace(/^[A-G]\)\s*/i, "").trim();
          options.push({ key, label });
        } else if (/^ANS\d+\)/i.test(line)) {
          const match = line.match(/^ANS(\d+)\)\s*([A-G])/i);
          if (match) answers[String(parseInt(match[1]) - 1)] = match[2].toUpperCase();
        }
      }
      return { items, options, answers } as any;
    }
    default: return null;
  }
}

function getQuestionTypeDescription(type: QuestionGroupType) {
  switch (type) {
    case "mcq": return "MCQ bulk format: Q) Question, A) Option A, B) Option B, C) Option C, Correct) A, Explanation) ...";
    case "matching": return "Matching bulk format: use Q1) item, A) option A, B) option B, ANS1) A, ANS2) B.";
    case "form-completion": return "Form completion bulk: TITLE) form title, FIELD) field text, ANS1) answer.";
    case "note-completion": return "Note completion bulk: TITLE) note title, NOTE) text, ANS1) answer.";
    case "table-completion": return "Table bulk format: TITLE) name, HEADERS) col1|col2|col3, ROW) cell1|cell2|cell3, ANS1) answer.";
    case "flow-completion": return "Flow chart bulk: TITLE) title, STEP) text, ANS1) answer.";
    case "sentence-completion": return "Sentence bulk: S) sentence with ___ blank, ANS1) answer.";
    case "short-answer": return "Short answer bulk: Q) question, A) answer, H) optional hint.";
    case "map": return "Map Labelling bulk requires a map image upload and coordinates in the question data.";
    default: return "Paste bulk text in the selected question format.";
  }
}

function getQuestionTypePlaceholder(type: QuestionGroupType, partLabel: string) {
  switch (type) {
    case "mcq": return `${partLabel}: Q) Question\nA) Option A\nB) Option B\nC) Option C\nD) Option D\nCorrect) A`;
    case "matching": return `${partLabel}: Q1) item\nQ2) item\nA) option A\nB) option B\nANS1) A\nANS2) B`;
    case "form-completion": return `${partLabel}: TITLE) Form\nFIELD) Name: ___\nANS1) Answer`;
    case "note-completion": return `${partLabel}: TITLE) Notes\nNOTE) Speaker: ___\nANS1) Answer`;
    case "table-completion": return `${partLabel}: TITLE) Table\nHEADERS) Col1|Col2|Col3\nROW) Cell1|Cell2|Cell3\nANS1) Answer`;
    case "flow-completion": return `${partLabel}: TITLE) Flow\nSTEP) Text with ___\nANS1) Answer`;
    case "sentence-completion": return `${partLabel}: S) The ___ is ready\nANS1) answer`;
    case "short-answer": return `${partLabel}: Q) Question\nA) Answer`;
    case "map": return `${partLabel}: Paste map question coordinates and option labels.`;
    default: return `${partLabel}: Paste questions here...`;
  }
}

function getGroupTypeLabel(type: QuestionGroupType) {
  return QUESTION_GROUP_TYPES.find(t => t.id === type)?.label || type;
}

function getQuestionGroupItemCount(group: QuestionGroup) {
  const data = group.data;
  if (Array.isArray(data)) return data.length;
  if (group.type === "matching") return data?.items?.length ?? 0;
  if (group.type === "form-completion") return data?.fields?.length ?? 0;
  if (group.type === "note-completion") return data?.items?.length ?? 0;
  if (group.type === "table-completion") return data?.rows?.length ?? 0;
  if (group.type === "flow-completion") return data?.steps?.length ?? 0;
  if (group.type === "sentence-completion") return data?.items?.length ?? 0;
  if (group.type === "map") return data?.points?.length ?? 0;
  return 0;
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
      case "matching": return `Q1) Pinewood Cottage\nQ2) Hillside Lodge\nQ3) Riverside Retreat\nQ4) Oak House\nQ5) Valley View\nA) close to the beach\nB) provides free bicycles\nC) has a private garden\nD) recently renovated\nE) cheapest option\nF) has a swimming pool\nG) near a train station\nANS1) A\nANS2) B\nANS3) C\nANS4) D\nANS5) E`;
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
        const lines = bulkText.trim().split("\n").map(l => l.trim()).filter(Boolean);
        const items: string[] = [];
        const options: { key: string; label: string }[] = [];
        const answers: Record<string, string> = {};
        for (const line of lines) {
          if (/^Q\d+\)/i.test(line)) {
            const match = line.match(/^Q(\d+)\)\s*(.*)/i);
            if (match) items.push(match[2].trim());
          } else if (/^[A-G]\)/i.test(line)) {
            const key = line[0].toUpperCase();
            const label = line.replace(/^[A-G]\)\s*/i, "").trim();
            options.push({ key, label });
          } else if (/^ANS\d+\)/i.test(line)) {
            const match = line.match(/^ANS(\d+)\)\s*([A-G])/i);
            if (match) {
              const itemIndex = String(parseInt(match[1]) - 1);
              answers[itemIndex] = match[2].toUpperCase();
            }
          }
        }
        onChange({ items, options, answers });
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
                <div
                  role="img"
                  aria-label="Map"
                  className="absolute inset-0 bg-white"
                  style={{
                    backgroundImage: `url(${mapPreview || data?.imageUrl})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "contain",
                  }}
                />
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
function AddGroupPanel({ onAdd }: { onAdd: (group: QuestionGroup) => void }) {
  const [type, setType] = useState<QuestionGroupType | "">("");
  const [label, setLabel] = useState("");
  const [wordLimit, setWordLimit] = useState("");

  function add() {
    if (!type) return;
    const group: QuestionGroup = {
      id: `group-${Date.now()}`,
      type,
      label: label || `Questions`,
      wordLimit: wordLimit || "NO MORE THAN TWO WORDS AND/OR A NUMBER",
      data: createEmptyGroupData(type),
    };
    onAdd(group);
    setType(""); setLabel(""); setWordLimit("");
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[#7a6258]">Add Question Group</p>
      <div className="grid gap-2 md:grid-cols-2">
        <select value={type} onChange={e => setType(e.target.value as QuestionGroupType)}
          className="rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm">
          <option value="">Select type...</option>
          {QUESTION_GROUP_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
        </select>
        <input type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Questions 1–5"
          className="rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm" />
      </div>
      <div className="mt-2 flex gap-2">
        <input type="text" value={wordLimit} onChange={e => setWordLimit(e.target.value)}
          placeholder="Word limit — e.g. NO MORE THAN TWO WORDS AND/OR A NUMBER"
          className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm" />
        <button onClick={add} disabled={!type}
          className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          + Add
        </button>
      </div>
    </div>
  );
}
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
      <div className="mb-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
        <label className="mb-2 block text-sm font-semibold">🗣️ Section Description Audio <span className="font-normal text-xs text-[#7a6258]">(&quot;You will hear a conversation between...&quot;)</span></label>
        {section.descUrl && <p className="mb-1 text-xs text-green-600">✓ Description audio uploaded</p>}
        <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) onChange({ ...section, descFile: f, descUrl: "" }); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
        <p className="mt-1 text-xs text-[#7a6258]">Narrator çalar: intro → Section {section.number} → <strong>bu açıklama</strong> → &quot;look at the questions&quot; → ...</p>
      </div>
      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold">🔊 Main Audio — Part 1 <span className="font-normal text-xs text-[#7a6258]">(sadece konuşma içeriği)</span></label>
        {section.audioUrl && <p className="mb-1 text-xs text-green-600">✓ Part 1 audio uploaded</p>}
        <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) onChange({ ...section, audioFile: f, audioUrl: "" }); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />
      </div>
      {section.number !== 4 && (
        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold">🔊 Main Audio — Part 2 <span className="font-normal text-xs text-[#7a6258]">(opsiyonel — Section 1-3 ikinci yarı)</span></label>
          {section.audio2Url && <p className="mb-1 text-xs text-green-600">✓ Part 2 audio uploaded</p>}
          <input type="file" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) onChange({ ...section, audio2File: f, audio2Url: "" }); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />
          <p className="mt-1 text-xs text-[#7a6258]">Yüklenirse: Part 1 sonrası &quot;sorulara bakma v2&quot; → 30sn → &quot;now listen&quot; → Part 2 çalar.</p>
        </div>
      )}
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
  const [examSection, setExamSection] = useState<number | null>(null);
  const [creationMode, setCreationMode] = useState<"practice" | "exam">("practice");
  const [practiceExamType, setPracticeExamType] = useState<"ielts" | "toefl" | "toeic" | "celpip" | null>(null);
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
  const [sectionParts, setSectionParts] = useState<IELTSSectionPart[]>([createEmptyPart(), createEmptyPart()]);
  const [sectionNumber, setSectionNumber] = useState<number>(1);
  const [managePage, setManagePage] = useState(0);
  const [partBulkType1, setPartBulkType1] = useState<QuestionGroupType | "">("");
  const [partBulkText1, setPartBulkText1] = useState("");
  const [partBulkError1, setPartBulkError1] = useState("");
  const [partBulkType2, setPartBulkType2] = useState<QuestionGroupType | "">("");
  const [partBulkText2, setPartBulkText2] = useState("");
  const [partBulkError2, setPartBulkError2] = useState("");

 const isIELTSSection = episodeType === "ielts-section";
  const isPractice = episodeType.startsWith("practice-") || isIELTSSection;
  const isCompletion = episodeType.startsWith("practice-completion-");
  const isExam = episodeType.startsWith("exam-");

  useEffect(() => {
    if (isIELTSSection && practiceExamType === "ielts" && examSection) {
      setSectionNumber(examSection);
    }
  }, [isIELTSSection, practiceExamType, examSection]);

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

  function handleIeltsMapImageSelect(partIndex: number, file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      setSectionParts(prev => {
        const next = [...prev];
        next[partIndex] = {
          ...next[partIndex],
          mapImageFile: file,
          mapImageUrl: "",
          mapImagePreview: e.target?.result as string,
        };
        return next;
      });
    };
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
    if (creationMode === "practice" && !practiceExamType) {
      alert("Please select a practice exam type before publishing.");
      setUploading(false);
      return;
    }
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
          let sectionAudio2Url = section.audio2Url || "";
          if (section.audio2File) sectionAudio2Url = await uploadFile(section.audio2File, "section");
          let descUrl = section.descUrl || "";
          if (section.descFile) descUrl = await uploadFile(section.descFile, "section");
          let introUrl = section.introUrl || "";
          if (section.introFile) introUrl = await uploadFile(section.introFile, "intro");
          const processedGroups = await Promise.all(section.questionGroups.map(async group => {
            if (group.type === "map" && group.data?._imageFile) {
              const imageUrl = await uploadFile(group.data._imageFile, "map");
              const { _imageFile, ...cleanData } = group.data;
              void _imageFile;
              return { ...group, data: { ...cleanData, imageUrl } };
            }
            return group;
          }));
          return { number: section.number, audioUrl: sectionAudioUrl, audio2Url: sectionAudio2Url, descUrl, introUrl, questionGroups: processedGroups };
        }));
        sections = processedSections;
    } else if (!isIELTSSection && !audioUrl) {
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
     } else if (episodeType === "practice-matching") { questions = matchingQuestions.length > 0 ? [matchingQuestions[0]] : [];
      } else if (episodeType === "practice-map") {
        if (!mapImageFile && !mapImageUrl) { alert("Please upload a map image."); setUploading(false); return; }
        const finalMapImageUrl = mapImageFile ? await uploadFile(mapImageFile, "map") : mapImageUrl;
        questions = [{ ...mapQuestion, imageUrl: finalMapImageUrl }];
      } else if (episodeType === "practice-completion-note") { questions = [noteQuestion];
      } else if (episodeType === "practice-completion-form") { questions = [formQuestion];
      } else if (episodeType === "practice-completion-table") { questions = [tableQuestion];
      } else if (episodeType === "practice-completion-flow") { questions = [flowQuestion];
   } else if (episodeType === "practice-completion-sentence") { questions = [sentenceQuestion];
      } else if (episodeType === "ielts-section") {
        const processedParts = await Promise.all(sectionParts.map(async (part, pi) => {
          let audioUrl = part.audioUrl;
          if (part.audioFile) audioUrl = await uploadFile(part.audioFile, "episode");
          let introAudioUrl = part.introAudioUrl || "";
          if (part.introAudioFile) introAudioUrl = await uploadFile(part.introAudioFile, "episode");
          const processedGroups = await Promise.all(part.questionGroups.map(async group => {
            if (group.type === "map" && group.data?._imageFile) {
              const imageUrl = await uploadFile(group.data._imageFile, "map");
              const { _imageFile, ...cleanData } = group.data;
              void _imageFile;
              return { ...group, data: { ...cleanData, imageUrl } };
            }
            return group;
          }));
          return { part: pi + 1, audioUrl, introAudioUrl, groups: processedGroups };
        }));
        questions = processedParts;
      }

  const effectiveSection = episodeType === "ielts-section" ? sectionNumber : examSection;

      const autoLevel = isPractice
        ? effectiveSection === 1 ? "Beginner"
        : effectiveSection === 2 ? "Intermediate"
        : effectiveSection === 3 ? "Intermediate"
        : effectiveSection === 4 ? "Advanced"
        : "Intermediate"
        : null;

      const sectionLabel = effectiveSection ? `IELTS S${effectiveSection} — ` : "";
const typeLabel = PRACTICE_TYPES.find(t => t.id === episodeType)?.label
  || COMPLETION_TYPES.find(t => t.id === episodeType)?.label
  || "";
const autoTitle = isExam
  ? `${episodeType.replace("exam-", "").toUpperCase()} Full Test #${Date.now().toString().slice(-4)}`
  : `${sectionLabel}${typeLabel} #${Date.now().toString().slice(-4)}`;

   

      const payload: Record<string, any> = {
        level: autoLevel,
        title: autoTitle,
        audio_url: isExam || isIELTSSection ? null : audioUrl,
        audio_part1_url: isIELTSSection ? (sectionParts[0].audioUrl || null) : null,
        audio_part2_url: isIELTSSection && sectionNumber !== 4 ? (sectionParts[1].audioUrl || null) : null,
        episode_type: episodeType,
        show_notes: episodeType === "practice-fill" ? showNotes : false,
        questions: isExam ? null : questions,
        sections: isExam ? sections : null,
        vocabulary: [],
        pdf_url: pdfUrl || null,
        exam_type: isExam ? episodeType.replace("exam-", "") : isPractice ? (practiceExamType || (episodeType === "ielts-section" ? "ielts" : null)) : null,
        exam_section: isPractice ? (episodeType === "ielts-section" ? sectionNumber : examSection) || null : null,
      };

      let dbError = null;
      if (editingId) { const { error } = await supabase.from("episodes").update(payload).eq("id", editingId); dbError = error; }
      else { const { error } = await supabase.from("episodes").insert([payload]); dbError = error; }
      if (dbError) throw new Error(dbError.message);
      resetForm(); await fetchPractices();
      alert(editingId ? "Content updated!" : "Content published!");
    } catch (err) {
      alert("Failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally { setUploading(false); }
  }

  function resetForm() {
    setEditingId(null); setAudioFile(null); setExistingAudioUrl("");
    setPdfFile(null); setExistingPdfUrl(""); setShowNotes(false);
    setExamSection(null);
    setMcqQuestions([createEmptyMCQ()]); setFillQuestions([createEmptyFill()]);
    setDictationQuestions([createEmptyDictation()]); setShortQuestions([createEmptyShort()]);
    setMatchingQuestions([createEmptyMatching()]);
    setMapQuestion(createEmptyMap()); setMapImageFile(null); setMapImageUrl(""); setMapImagePreview(""); setAddingPoint(false);
    setNoteQuestion(createEmptyNote()); setFormQuestion(createEmptyForm());
    setTableQuestion(createEmptyTable()); setFlowQuestion(createEmptyFlow()); setSentenceQuestion(createEmptySentence());
    setCompletionBulkText(""); setCompletionBulkMode(false);
    setExamSections([createEmptySection(1), createEmptySection(2), createEmptySection(3), createEmptySection(4)]);
    setSectionParts([createEmptyPart(), createEmptyPart()]);
    setSectionNumber(1);
    setBulkMode(false); setBulkText(""); setBulkError("");
    setCreationMode("practice"); setPracticeExamType(null);
  }

  async function handleEdit(id: string) {
    const { data, error } = await supabase.from("episodes").select("*").eq("id", id).single();
    if (error || !data) return;
    setEditingId(data.id); setEpisodeType(data.episode_type || "practice-mcq");
    setExamSection(data.exam_section || null);
    setExistingAudioUrl(data.audio_url || ""); setExistingPdfUrl(data.pdf_url || "");
    setShowNotes(data.show_notes || false); setAudioFile(null); setPdfFile(null);
    setBulkMode(false); setBulkText(""); setBulkError("");
    setCompletionBulkText(""); setCompletionBulkMode(false);
    if (data.sections && data.episode_type?.startsWith("exam-")) {
      setExamSections(data.sections.map((s: any) => ({
        id: `section-${s.number}`, number: s.number,
        audioFile: null, audioUrl: s.audioUrl || "",
        audio2File: null, audio2Url: s.audio2Url || "",
        descFile: null, descUrl: s.descUrl || "",
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
    if (data.episode_type === "ielts-section" && data.audio_part1_url !== undefined) {
      setSectionNumber(data.exam_section || 1);
      setSectionParts([
        { audioFile: null, audioUrl: data.audio_part1_url || "", introAudioFile: null, introAudioUrl: data.questions?.[0]?.introAudioUrl || "", questionGroups: data.questions?.[0]?.groups || [] },
        { audioFile: null, audioUrl: data.audio_part2_url || "", introAudioFile: null, introAudioUrl: data.questions?.[1]?.introAudioUrl || "", questionGroups: data.questions?.[1]?.groups || [] },
      ]);
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

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#7a6258]">Create</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: "practice", label: "Practice", description: "Create practice content" },
                      { id: "exam", label: "Exam", description: "Create full exam content" },
                    ].map(mode => (
                      <button key={mode.id} onClick={() => {
                        setCreationMode(mode.id as "practice" | "exam");
                        if (mode.id === "exam") { setPracticeExamType(null); setEpisodeType("exam-ielts"); setExamSection(null); }
                        else { setEpisodeType("practice-mcq"); }
                      }}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${creationMode === mode.id ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
                        <div className="font-bold">{mode.label}</div>
                        <div className="mt-1 text-xs text-[#7a6258]">{mode.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e0c7eb] bg-white p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#7a6258]">Exam Type</p>
                  <div className="flex flex-wrap gap-2">
                    {PRACTICE_EXAM_TYPES.map(type => (
                      <button key={type.id} onClick={() => setPracticeExamType(type.id as "ielts" | "toefl" | "toeic" | "celpip")}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${practiceExamType === type.id ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7eb] bg-white hover:bg-[#f1ded5]"}`}>
                        {type.emoji} {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e0c7eb] bg-white p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#7a6258]">Section</p>
                  <select value={practiceExamType === "ielts" ? (examSection || "") : ""}
                    onChange={e => {
                      const section = e.target.value ? Number(e.target.value) : null;
                      setExamSection(section);
                      if (episodeType === "ielts-section" && section) {
                        setSectionNumber(section);
                      }
                    }}
                    disabled={practiceExamType !== "ielts"}
                    className="w-full rounded-2xl border border-[#e0c7eb] bg-white p-3 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Select IELTS section</option>
                    {IELTS_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {practiceExamType !== "ielts" && <p className="mt-2 text-xs text-[#7a6258]">Section selection is only for IELTS.</p>}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 text-sm text-[#7a6258]">
                {creationMode === "practice" && !practiceExamType && <p>Select a practice exam type before picking practice content.</p>}
                {creationMode === "practice" && practiceExamType && (
                  <p>Practice exam type selected: <strong>{practiceExamType.toUpperCase()}</strong>{practiceExamType === "ielts" && examSection ? ` · Section ${examSection}` : ""}</p>
                )}
                {creationMode === "exam" && <p>Exam creation mode selected. Choose a full exam type below.</p>}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {(creationMode === "practice" ? [
                  { label: "Practice", types: PRACTICE_TYPES },
                  { label: "Completions", types: COMPLETION_TYPES },
                  { label: "Practice Style", types: QUIZ_TYPES },
                ] : [
                  { label: "Full Exam", types: EXAM_TYPES_LIST },
                ]).map(col => (
                  <div key={col.label}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7a6258]">{col.label}</p>
                    <div className="flex flex-col gap-2">
                      {col.types.map(t => (
                        <button key={t.id} onClick={() => {
                          if (creationMode === "practice" && !practiceExamType) return;
                          setEpisodeType(t.id as EpisodeType);
                          if (creationMode === "practice" && practiceExamType === "ielts" && t.id === "ielts-section") {
                            const section = examSection || 1;
                            setExamSection(section);
                            setSectionNumber(section);
                          }
                          if (creationMode === "exam") setExamSection(null);
                        }}
                          className={`rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition ${episodeType === t.id ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"} ${creationMode === "practice" && !practiceExamType ? "cursor-not-allowed opacity-60" : ""}`}>
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {creationMode === "exam" && (
                <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 text-sm text-[#7a6258]">
                  <p>Full exam mode selected. Choose a full exam type from the exam selector above.</p>
                </div>
              )}
              <div className="mt-6 grid gap-4">
              

                {/* IELTS Section */}
             {isPractice && (
  <div>
    <label className="mb-2 block text-sm font-semibold">IELTS Section <span className="font-normal text-xs text-[#7a6258]">(optional)</span></label>
    <select value={examSection || ""} onChange={e => setExamSection(e.target.value ? Number(e.target.value) : null)} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4">
      <option value="">General — no section tag</option>
      {IELTS_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  </div>
)}

                {/* Auto info */}
               {isPractice && (
  <div className="rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm text-[#7a6258]">
    <p>📋 <strong>Level:</strong> {examSection === 1 ? "Beginner" : examSection === 4 ? "Advanced" : "Intermediate"}</p>
    <p className="mt-1">🏷️ <strong>Section:</strong> {examSection ? `IELTS Section ${examSection}` : "General (no section tag)"}</p>
  </div>
)}

                {/* Audio */}
               {!isExam && !isIELTSSection && (
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
                  <pre className="rounded-2xl bg-[#f7eee8] p-3 text-xs leading-6 text-[#7a6258] whitespace-pre-wrap">{`Single answer (A/B/C):\nQ) Soru metni\nA) Şık A\nB) Şık B\nC) Şık C\nCorrect) B\nExplanation) Açıklama\n\nChoose TWO (A–E):\nQ) Soru metni\nA) Şık A\nB) Şık B\nC) Şık C\nD) Şık D\nE) Şık E\nCorrect) B,D\nExplanation) Açıklama\n\nChoose THREE (A–G):\nQ) Soru metni\nA) ... G) ...\nCorrect) A,C,F\nExplanation) Açıklama`}</pre>
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
                   {/* Option count selector */}
                        <div className="mt-3 flex items-center gap-3">
                          <label className="text-xs font-semibold text-[#7a6258]">Type:</label>
                          {[
                            { label: "Single (A–C)", keys: ["A","B","C"] },
                            { label: "Choose TWO (A–E)", keys: ["A","B","C","D","E"] },
                            { label: "Choose THREE (A–G)", keys: ["A","B","C","D","E","F","G"] },
                          ].map(opt => {
                            const currentKeys = Object.keys(item.options).filter(k => item.options[k as keyof typeof item.options] !== undefined);
                            const isActive = currentKeys.length === opt.keys.length;
                            return (
                              <button key={opt.label} onClick={() => {
                                const u = [...mcqQuestions];
                                const newOpts: any = {};
                                opt.keys.forEach(k => { newOpts[k] = (item.options as any)[k] || ""; });
                                u[index].options = newOpts;
                                u[index].correctAnswer = Array.isArray(u[index].correctAnswer)
                                  ? (u[index].correctAnswer as string[]).filter(a => opt.keys.includes(a))
                                  : opt.keys.includes(u[index].correctAnswer as string) ? u[index].correctAnswer : opt.keys[0];
                                setMcqQuestions(u);
                              }} className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${isActive ? "bg-[#3b2f2f] text-white" : "border border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          {Object.entries(item.options).filter(([,v]) => v !== undefined).map(([letter]) => {
                            const isCorrect = Array.isArray(item.correctAnswer)
                              ? item.correctAnswer.includes(letter)
                              : item.correctAnswer === letter;
                            return (
                              <div key={letter} className="flex items-center gap-3 rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                                <button onClick={() => {
                                  const u = [...mcqQuestions];
                                  if (Array.isArray(u[index].correctAnswer)) {
                                    const arr = u[index].correctAnswer as string[];
                                    u[index].correctAnswer = arr.includes(letter)
                                      ? arr.filter(a => a !== letter)
                                      : [...arr, letter].sort();
                                  } else {
                                    const optCount = Object.keys(u[index].options).filter(k => (u[index].options as any)[k] !== undefined).length;
                                    if (optCount > 3) {
                                      u[index].correctAnswer = [letter];
                                    } else {
                                      u[index].correctAnswer = letter;
                                    }
                                  }
                                  setMcqQuestions(u);
                                }} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${isCorrect ? "bg-green-200 text-green-800 ring-2 ring-green-400" : "bg-[#ead7cc] hover:bg-[#d4b89a]"}`}>
                                  {letter}
                                </button>
                                <input type="text" value={(item.options as any)[letter]} onChange={e => { const u = [...mcqQuestions]; (u[index].options as any)[letter] = e.target.value; setMcqQuestions(u); }} placeholder={`Option ${letter}`} className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-sm" />
                              </div>
                            );
                          })}
                        </div>
                        {Array.isArray(item.correctAnswer) && (
                          <p className="mt-1 text-xs text-[#7a6258]">
                            Correct: {(item.correctAnswer as string[]).join(", ") || "none selected"} — click letters above to toggle
                          </p>
                        )}
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
                  <h2 className="text-2xl font-bold">🔗 Matching</h2>
                  <button onClick={() => setCompletionBulkMode(!completionBulkMode)} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${completionBulkMode ? "bg-[#ead7cc]" : "border border-[#e0c7bb] bg-white"}`}>{completionBulkMode ? "Manual" : "Bulk Paste"}</button>
                </div>
                {completionBulkMode && (
                  <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-white p-5">
                    <pre className="rounded-2xl bg-[#f7eee8] p-3 text-xs leading-6 text-[#7a6258] whitespace-pre-wrap">{`Q1) Pinewood Cottage\nQ2) Hillside Lodge\nQ3) Riverside Retreat\nQ4) Oak House\nQ5) Valley View\nA) close to the beach\nB) provides free bicycles\nC) has a private garden\nD) recently renovated\nE) cheapest option\nF) has a swimming pool\nG) near a train station\nANS1) A\nANS2) B\nANS3) C\nANS4) D\nANS5) E`}</pre>
                    <textarea value={completionBulkText} onChange={e => setCompletionBulkText(e.target.value)} placeholder="Yapıştır..." className="mt-3 min-h-[250px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 font-mono text-sm" />
                    <button onClick={() => {
                      const lines = completionBulkText.trim().split("\n").map(l => l.trim()).filter(Boolean);
                      const items: string[] = [];
                      const options: { key: string; label: string }[] = [];
                      const answers: Record<string, string> = {};
                      for (const line of lines) {
                        if (/^Q\d+\)/i.test(line)) {
                          const match = line.match(/^Q(\d+)\)\s*(.*)/i);
                          if (match) items.push(match[2].trim());
                        } else if (/^[A-G]\)/i.test(line)) {
                          const key = line[0].toUpperCase();
                          const label = line.replace(/^[A-G]\)\s*/i, "").trim();
                          options.push({ key, label });
                        } else if (/^ANS\d+\)/i.test(line)) {
                          const match = line.match(/^ANS(\d+)\)\s*([A-G])/i);
                          if (match) answers[String(parseInt(match[1]) - 1)] = match[2].toUpperCase();
                        }
                      }
                      setMatchingQuestions([{ items, options, answers } as any]);
                      setCompletionBulkMode(false); setCompletionBulkText("");
                    }} className="mt-3 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Apply</button>
                  </div>
                )}
                {!completionBulkMode && (
                  <div className="mt-6">
                    {/* Items (Questions) */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold">Questions (left side) — 5 items</label>
                      </div>
                      {(matchingQuestions[0] as any)?.items?.map((item: string, i: number) => (
                        <div key={i} className="mt-2 flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3b2f2f] text-xs font-bold text-white">{i + 1}</span>
                          <input type="text" value={item} onChange={e => {
                            const mq = matchingQuestions[0] as any;
                            const newItems = [...mq.items];
                            newItems[i] = e.target.value;
                            setMatchingQuestions([{ ...mq, items: newItems }]);
                          }} placeholder={`Item ${i + 1} (e.g. Pinewood Cottage)`} className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm" />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[#7a6258]">→</span>
                            <select value={(matchingQuestions[0] as any)?.answers?.[String(i)] || ""} onChange={e => {
                              const mq = matchingQuestions[0] as any;
                              setMatchingQuestions([{ ...mq, answers: { ...mq.answers, [String(i)]: e.target.value } }]);
                            }} className="rounded-xl border border-[#e0c7bb] bg-white p-1.5 text-xs">
                              <option value="">Answer?</option>
                              {(matchingQuestions[0] as any)?.options?.map((opt: any) => (
                                <option key={opt.key} value={opt.key}>{opt.key}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Options (right side) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold">Options (right side) — A to G</label>
                        <div className="flex gap-2">
                          <button onClick={() => {
                            const mq = matchingQuestions[0] as any;
                            const keys = ["A","B","C","D","E","F","G"];
                            const next = keys[mq.options.length];
                            if (next) setMatchingQuestions([{ ...mq, options: [...mq.options, { key: next, label: "" }] }]);
                          }} disabled={(matchingQuestions[0] as any)?.options?.length >= 7} className="rounded-xl bg-[#3b2f2f] px-2 py-0.5 text-xs text-white disabled:opacity-40">+</button>
                          <button onClick={() => {
                            const mq = matchingQuestions[0] as any;
                            if (mq.options.length > 5) setMatchingQuestions([{ ...mq, options: mq.options.slice(0, -1) }]);
                          }} disabled={(matchingQuestions[0] as any)?.options?.length <= 5} className="rounded-xl border border-[#e0c7bb] px-2 py-0.5 text-xs disabled:opacity-40">-</button>
                        </div>
                      </div>
                      {(matchingQuestions[0] as any)?.options?.map((opt: any, i: number) => (
                        <div key={opt.key} className="mt-2 flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ead7cc] text-xs font-bold text-[#3b2f2f]">{opt.key}</span>
                          <input type="text" value={opt.label} onChange={e => {
                            const mq = matchingQuestions[0] as any;
                            const newOpts = [...mq.options];
                            newOpts[i] = { ...newOpts[i], label: e.target.value };
                            setMatchingQuestions([{ ...mq, options: newOpts }]);
                          }} placeholder={`Option ${opt.key} label`} className="flex-1 rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                      <div
                        role="img"
                        aria-label="Map"
                        className="absolute inset-0 bg-white"
                        style={{
                          backgroundImage: `url(${mapImagePreview})`,
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "contain",
                        }}
                      />
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
                    <p className="text-sm text-[#7a6258]">Use Bulk Paste for tables — it is much easier.</p>
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
{/* IELTS Section */}
            {episodeType === "ielts-section" && (
              <div className="mt-6 flex flex-col gap-6">
                <div className="rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
                  <h2 className="text-2xl font-bold">🎧 IELTS Section Practice</h2>
                  <p className="mt-2 text-sm text-[#7a6258]">Section 1-3 için Part 1 + Part 2 audio, her part için soru tipi seçimi ve bulk paste. Section 4 seçildiğinde tek audio + tek soru tipi/bulk paste alanı gösterilir.</p>

                  {/* Section Number */}
                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold">Section Number</label>
                    <select value={sectionNumber} onChange={e => setSectionNumber(Number(e.target.value))}
                      className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <option value={1}>Section 1 — Form/Note/Table Completion (A2–B1)</option>
                      <option value={2}>Section 2 — MCQ Single + Map Labelling (B1–B2)</option>
                      <option value={3}>Section 3 — MCQ Single + Matching (B2–C1)</option>
                      <option value={4}>Section 4 — Note/Sentence Completion only, NO pause (C1–C2)</option>
                    </select>
                  </div>
                </div>

                {/* Part 1 */}
                <div className="rounded-3xl border-2 border-[#3b2f2f] bg-[#fffaf7] p-6">
                  <h3 className="text-xl font-bold mb-1">
                    {sectionNumber === 4 ? "🔊 Audio (full, no pause)" : "🔊 Part 1 Audio"}
                  </h3>
                  <p className="text-xs text-[#7a6258] mb-4">
                    {sectionNumber === 1 && "Q1–5 konuşması"}
                    {sectionNumber === 2 && "Q11–16 konuşması (MCQ single kısmı)"}
                    {sectionNumber === 3 && "Q21–26 konuşması (MCQ single kısmı)"}
                    {sectionNumber === 4 && "Q31–40 konuşmasının tamamı (ara yok)"}
                  </p>
                  {sectionParts[0].audioUrl && !sectionParts[0].audioFile && (
                    <p className="mb-2 text-xs text-green-600">✓ Audio uploaded</p>
                  )}
                  <input type="file" accept="audio/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setSectionParts(prev => [{ ...prev[0], audioFile: f, audioUrl: "" }, prev[1]]);
                    }}
                    className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />

                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-semibold">🗣️ {sectionNumber === 4 ? "Intro Audio" : "Part 1 Intro Audio"} <span className="font-normal text-xs text-[#7a6258]">(opsiyonel — başta otomatik çalar)</span></label>
                    {sectionParts[0].introAudioUrl && !sectionParts[0].introAudioFile && (
                      <p className="mb-2 text-xs text-green-600">✓ Intro audio uploaded</p>
                    )}
                    <input type="file" accept="audio/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setSectionParts(prev => [{ ...prev[0], introAudioFile: f, introAudioUrl: "" }, prev[1]]);
                      }}
                      className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-[#c9a99a] bg-[#f7eee8] p-4">
                    <p className="mb-2 text-sm font-semibold text-[#7a6258]">
                      {sectionNumber === 4 ? "Question type + bulk paste" : "Part 1 question type + bulk paste"}
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <select value={partBulkType1} onChange={e => setPartBulkType1(e.target.value as QuestionGroupType)} className="rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm">
                        <option value="">Select question type...</option>
                        {QUESTION_GROUP_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
                      </select>
                      <button onClick={() => { setPartBulkText1(""); setPartBulkError1(""); setPartBulkType1(""); setSectionParts(prev => [{ ...prev[0], mapImageFile: null, mapImageUrl: "", mapImagePreview: "" }, prev[1]]); }} className="rounded-2xl border border-[#e0c7eb] bg-white p-2 text-sm">Reset</button>
                    </div>
                    {partBulkType1 && (
                      <p className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm text-[#7a6258]">
                        {getQuestionTypeDescription(partBulkType1)}
                      </p>
                    )}
                    {partBulkType1 === "map" && (
                      <div className="mt-4 rounded-2xl border border-[#e0c7eb] bg-white p-4">
                        <label className="mb-2 block text-sm font-semibold">Map Image</label>
                        <input type="file" accept="image/png,image/jpeg,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleIeltsMapImageSelect(0, f); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />
                        {sectionParts[0].mapImageFile && (
                          <div className="mt-3 text-sm text-[#3b2f2f]">
                            {sectionParts[0].mapImageFile.type.startsWith("image/") && sectionParts[0].mapImagePreview ? (
                              <img src={sectionParts[0].mapImagePreview} alt="Map preview" className="mt-2 max-h-40 w-full rounded-2xl object-contain" />
                            ) : (
                              <p>Selected file: {sectionParts[0].mapImageFile.name}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <textarea value={partBulkText1} onChange={e => setPartBulkText1(e.target.value)} placeholder={getQuestionTypePlaceholder(partBulkType1 as QuestionGroupType, sectionNumber === 4 ? "Section" : "Part 1")} className="mt-3 min-h-[160px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 font-mono text-sm" />
                    {partBulkError1 && <p className="mt-2 text-sm text-red-600">{partBulkError1}</p>}
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => {
                        setPartBulkError1("");
                        if (!partBulkType1) { setPartBulkError1("Select a type"); return; }
                        if (partBulkType1 === "map" && !sectionParts[0].mapImageFile && !sectionParts[0].mapImageUrl) { setPartBulkError1("Upload a map image for Map Labelling."); return; }
                        const parsed = applyBulkToPart(0, partBulkType1, partBulkText1);
                        if (!parsed) { setPartBulkError1("No data parsed"); return; }
                        const groupData = typeof parsed === "object" && partBulkType1 === "map"
                          ? { ...parsed, _imageFile: sectionParts[0].mapImageFile || undefined, imageUrl: sectionParts[0].mapImageUrl || undefined }
                          : parsed;
                        const group: QuestionGroup = { id: `group-${Date.now()}`, type: partBulkType1 as QuestionGroupType, label: `Bulk ${partBulkType1}`, wordLimit: "", data: groupData };
                        setSectionParts(prev => [{ ...prev[0], questionGroups: [...prev[0].questionGroups, group] }, prev[1]]);
                        setPartBulkText1(""); setPartBulkType1("");
                      }} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">{sectionNumber === 4 ? "Apply" : "Apply to Part 1"}</button>
                    </div>
                  </div>
                  {sectionParts[0].questionGroups.length > 0 && (
                    <div className="mt-5 space-y-3">
                      <p className="text-sm font-semibold text-[#3b2f2f]">Added groups</p>
                      {sectionParts[0].questionGroups.map((group, gi) => (
                        <div key={group.id} className="flex flex-col gap-2 rounded-2xl border border-[#e0c7bb] bg-white p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">{getGroupTypeLabel(group.type)}</p>
                              <p className="text-xs text-[#7a6258]">{getQuestionGroupItemCount(group)} item(s)</p>
                            </div>
                            <button onClick={() => setSectionParts(prev => [{ ...prev[0], questionGroups: prev[0].questionGroups.filter((_, i) => i !== gi) }, prev[1]])} className="rounded-2xl border border-[#e0c7eb] bg-white px-3 py-1 text-xs font-semibold">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Part 2 — Section 4'te gösterme */}
                {sectionNumber !== 4 && (
                  <div className="rounded-3xl border-2 border-[#c9a99a] bg-[#fffaf7] p-6">
                    <h3 className="text-xl font-bold mb-1">🔊 Part 2 Audio</h3>
                    <p className="text-xs text-[#7a6258] mb-4">
                      {sectionNumber === 1 && "Q6–10 konuşması"}
                      {sectionNumber === 2 && "Q17–20 konuşması (Map labelling kısmı)"}
                      {sectionNumber === 3 && "Q27–30 konuşması (Matching kısmı)"}
                    </p>
                    {sectionParts[1].audioUrl && !sectionParts[1].audioFile && (
                      <p className="mb-2 text-xs text-green-600">✓ Audio uploaded</p>
                    )}
                    <input type="file" accept="audio/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setSectionParts(prev => [prev[0], { ...prev[1], audioFile: f, audioUrl: "" }]);
                      }}
                      className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />

                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-semibold">🗣️ Part 2 Intro Audio <span className="font-normal text-xs text-[#7a6258]">(opsiyonel — başta otomatik çalar)</span></label>
                      {sectionParts[1].introAudioUrl && !sectionParts[1].introAudioFile && (
                        <p className="mb-2 text-xs text-green-600">✓ Intro audio uploaded</p>
                      )}
                      <input type="file" accept="audio/*"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) setSectionParts(prev => [prev[0], { ...prev[1], introAudioFile: f, introAudioUrl: "" }]);
                        }}
                        className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                    </div>

                    {/* Part 2 Bulk Paste (add question group from text) */}
                    <div className="mt-4 rounded-2xl border border-dashed border-[#c9a99a] bg-[#f7eee8] p-4">
                      <p className="mb-2 text-sm font-semibold text-[#7a6258]">Part 2 question type + bulk paste</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <select value={partBulkType2} onChange={e => setPartBulkType2(e.target.value as QuestionGroupType)} className="rounded-2xl border border-[#e0c7bb] bg-white p-2 text-sm">
                          <option value="">Select question type...</option>
                          {QUESTION_GROUP_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
                        </select>
                        <button onClick={() => { setPartBulkText2(""); setPartBulkError2(""); setPartBulkType2(""); setSectionParts(prev => [prev[0], { ...prev[1], mapImageFile: null, mapImageUrl: "", mapImagePreview: "" }]); }} className="rounded-2xl border border-[#e0c7eb] bg-white p-2 text-sm">Reset</button>
                      </div>
                      {partBulkType2 && (
                        <p className="mt-3 rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm text-[#7a6258]">
                          {getQuestionTypeDescription(partBulkType2)}
                        </p>
                      )}
                      {partBulkType2 === "map" && (
                        <div className="mt-4 rounded-2xl border border-[#e0c7eb] bg-white p-4">
                          <label className="mb-2 block text-sm font-semibold">Map Image</label>
                          <input type="file" accept="image/png,image/jpeg,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleIeltsMapImageSelect(1, f); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />
                          {sectionParts[1].mapImageFile && (
                            <div className="mt-3 text-sm text-[#3b2f2f]">
                              {sectionParts[1].mapImageFile.type.startsWith("image/") && sectionParts[1].mapImagePreview ? (
                                <img src={sectionParts[1].mapImagePreview} alt="Map preview" className="mt-2 max-h-40 w-full rounded-2xl object-contain" />
                              ) : (
                                <p>Selected file: {sectionParts[1].mapImageFile.name}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <textarea value={partBulkText2} onChange={e => setPartBulkText2(e.target.value)} placeholder={getQuestionTypePlaceholder(partBulkType2 as QuestionGroupType, "Part 2")} className="mt-3 min-h-[160px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 font-mono text-sm" />
                      {partBulkError2 && <p className="mt-2 text-sm text-red-600">{partBulkError2}</p>}
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => {
                          setPartBulkError2("");
                          if (!partBulkType2) { setPartBulkError2("Select a type"); return; }
                          if (partBulkType2 === "map" && !sectionParts[1].mapImageFile && !sectionParts[1].mapImageUrl) { setPartBulkError2("Upload a map image for Map Labelling."); return; }
                          const parsed = applyBulkToPart(1, partBulkType2, partBulkText2);
                          if (!parsed) { setPartBulkError2("No data parsed"); return; }
                          const groupData = typeof parsed === "object" && partBulkType2 === "map"
                            ? { ...parsed, _imageFile: sectionParts[1].mapImageFile || undefined, imageUrl: sectionParts[1].mapImageUrl || undefined }
                            : parsed;
                          const group: QuestionGroup = { id: `group-${Date.now()}`, type: partBulkType2 as QuestionGroupType, label: `Bulk ${partBulkType2}`, wordLimit: "", data: groupData };
                          setSectionParts(prev => [prev[0], { ...prev[1], questionGroups: [...prev[1].questionGroups, group] }]);
                          setPartBulkText2(""); setPartBulkType2("");
                        }} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Apply to Part 2</button>
                      </div>
                    </div>
                    {sectionParts[1].questionGroups.length > 0 && (
                      <div className="mt-5 space-y-3">
                        <p className="text-sm font-semibold text-[#3b2f2f]">Added groups</p>
                        {sectionParts[1].questionGroups.map((group, gi) => (
                          <div key={group.id} className="flex flex-col gap-2 rounded-2xl border border-[#e0c7bb] bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold">{getGroupTypeLabel(group.type)}</p>
                                <p className="text-xs text-[#7a6258]">{getQuestionGroupItemCount(group)} item(s)</p>
                              </div>
                              <button onClick={() => setSectionParts(prev => [prev[0], { ...prev[1], questionGroups: prev[1].questionGroups.filter((_, i) => i !== gi) }])} className="rounded-2xl border border-[#e0c7eb] bg-white px-3 py-1 text-xs font-semibold">Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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