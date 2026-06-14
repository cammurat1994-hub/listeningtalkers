// Central exam configuration. Adding a new exam = adding one entry here.
// Drives the file-based routing under app/[exam]/listening/* and the sitemap.

export type ExamId = "ielts" | "toefl" | "toeic" | "celpip";

export type SectionMeta = {
  number: number;
  segment: string; // URL segment, e.g. "section-1"
  title: string; // "Section 1"
  subtitle: string;
  level: string; // CEFR band, e.g. "A2–B1"
  emoji: string;
  desc: string;
  types: string[];
  color: string; // tailwind border classes
  badge: string; // tailwind badge classes
};

export type ExamConfig = {
  id: ExamId;
  label: string; // "IELTS"
  emoji: string;
  available: boolean;
  hasSections: boolean;
  sections?: SectionMeta[];
  seo: {
    landingTitle: string;
    landingDescription: string;
  };
};

const IELTS_SECTIONS: SectionMeta[] = [
  {
    number: 1,
    segment: "section-1",
    title: "Section 1",
    subtitle: "Everyday Conversation",
    level: "A2–B1",
    emoji: "💬",
    desc: "Two people in a social context — hotel booking, course registration, travel arrangements.",
    types: ["Form Completion", "Note Completion", "Table Completion", "Matching", "Short Answer"],
    color: "border-green-200 hover:border-green-400",
    badge: "bg-green-100 text-green-700",
  },
  {
    number: 2,
    segment: "section-2",
    title: "Section 2",
    subtitle: "Social Monologue",
    level: "B1–B2",
    emoji: "🗣️",
    desc: "One person speaking about a local topic — museum, park, campus.",
    types: ["Map Labelling", "Multiple Choice", "Matching", "Form Completion", "Sentence Completion"],
    color: "border-yellow-200 hover:border-yellow-400",
    badge: "bg-yellow-100 text-yellow-700",
  },
  {
    number: 3,
    segment: "section-3",
    title: "Section 3",
    subtitle: "Academic Discussion",
    level: "B2–C1",
    emoji: "🎓",
    desc: "2–4 people in an academic context — student project, research discussion.",
    types: ["Multiple Choice", "Matching", "Note Completion", "Sentence Completion"],
    color: "border-orange-200 hover:border-orange-400",
    badge: "bg-orange-100 text-orange-700",
  },
  {
    number: 4,
    segment: "section-4",
    title: "Section 4",
    subtitle: "Academic Lecture",
    level: "C1–C2",
    emoji: "📚",
    desc: "One speaker giving an academic lecture. No pauses — the hardest section.",
    types: ["Note Completion", "Flow Chart", "Table Completion", "Sentence Completion", "Summary Completion"],
    color: "border-red-200 hover:border-red-400",
    badge: "bg-red-100 text-red-700",
  },
];

export const EXAMS: Record<ExamId, ExamConfig> = {
  ielts: {
    id: "ielts",
    label: "IELTS",
    emoji: "🎧",
    available: true,
    hasSections: true,
    sections: IELTS_SECTIONS,
    seo: {
      landingTitle: "Free IELTS Listening Practice Tests",
      landingDescription:
        "Practice every IELTS Listening section with free, exam-style listening tests. Sections 1–4 covering form completion, multiple choice, map labelling, matching and more.",
    },
  },
  toefl: {
    id: "toefl",
    label: "TOEFL",
    emoji: "🎓",
    available: false,
    hasSections: false,
    seo: {
      landingTitle: "Free TOEFL Listening Practice Tests",
      landingDescription:
        "Free TOEFL Listening practice tests with exam-style lectures and conversations. New practice material is being added.",
    },
  },
  toeic: {
    id: "toeic",
    label: "TOEIC",
    emoji: "💼",
    available: false,
    hasSections: false,
    seo: {
      landingTitle: "Free TOEIC Listening Practice Tests",
      landingDescription:
        "Free TOEIC Listening practice tests with exam-style audio and questions. New practice material is being added.",
    },
  },
  celpip: {
    id: "celpip",
    label: "CELPIP",
    emoji: "🍁",
    available: false,
    hasSections: false,
    seo: {
      landingTitle: "Free CELPIP Listening Practice Tests",
      landingDescription:
        "Free CELPIP Listening practice tests with exam-style audio and questions. New practice material is being added.",
    },
  },
};

export const EXAM_IDS: ExamId[] = ["ielts", "toefl", "toeic", "celpip"];

export function getExam(id: string): ExamConfig | null {
  return (EXAMS as Record<string, ExamConfig>)[id] ?? null;
}

// "section-1" → 1 ; anything else → null
export function parseSectionSegment(segment: string): number | null {
  const m = /^section-([1-9]\d*)$/.exec(segment);
  return m ? parseInt(m[1], 10) : null;
}

export function getSection(cfg: ExamConfig, n: number): SectionMeta | null {
  return cfg.sections?.find((s) => s.number === n) ?? null;
}
