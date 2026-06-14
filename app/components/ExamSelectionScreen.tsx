"use client";

type Props = {
  mode: "practice" | "exam";
  onSelectIELTS: () => void;
  onBack: () => void;
};

const EXAMS = [
  {
    id: "ielts",
    name: "IELTS",
    full: "International English Language Testing System",
    emoji: "🎧",
    color: "border-blue-200 hover:border-blue-400 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    available: true,
    desc: "The world's most popular English proficiency test. Accepted by universities, employers, and immigration authorities in 140+ countries.",
    sections: "4 Sections · 40 Questions · 30 Minutes",
  },
  {
    id: "toefl",
    name: "TOEFL iBT",
    full: "Test of English as a Foreign Language",
    emoji: "🎓",
    color: "border-[#c8d5e8] bg-[#ffffff]",
    badge: "bg-[#dbe4f0] text-[#1e2d4a]",
    available: false,
    desc: "Primarily accepted by North American universities. Academic-focused with integrated skills tasks.",
    sections: "Coming Soon",
  },
  {
    id: "toeic",
    name: "TOEIC",
    full: "Test of English for International Communication",
    emoji: "💼",
    color: "border-[#c8d5e8] bg-[#ffffff]",
    badge: "bg-[#dbe4f0] text-[#1e2d4a]",
    available: false,
    desc: "Workplace English proficiency test. Used by businesses and corporations worldwide for hiring and promotion.",
    sections: "Coming Soon",
  },
  {
    id: "celpip",
    name: "CELPIP",
    full: "Canadian English Language Proficiency Index Program",
    emoji: "🍁",
    color: "border-[#c8d5e8] bg-[#ffffff]",
    badge: "bg-[#dbe4f0] text-[#1e2d4a]",
    available: false,
    desc: "Accepted for Canadian immigration and citizenship. Fully computer-delivered test.",
    sections: "Coming Soon",
  },
];

export default function ExamSelectionScreen({ mode, onSelectIELTS, onBack }: Props) {
  return (
    <main className="min-h-screen bg-[#f0f2f5] text-[#1e2d4a]">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 mx-auto text-sm font-semibold text-[#4a5568] hover:text-[#1e2d4a]">
            ← Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dbe4f0] px-4 py-2 text-sm font-semibold text-[#1e2d4a] mb-4">
            {mode === "practice" ? "🎧 Listening Practice" : "📝 Full Exam Tests"}
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">Choose Your Exam</h1>
          <p className="mt-4 text-lg text-[#4a5568]">
            {mode === "practice"
              ? "Select the exam you're preparing for. We'll show you the right question types and difficulty level."
              : "Select an exam to take a full timed listening test simulation."}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {EXAMS.map(exam => (
            <button
              key={exam.id}
              onClick={() => {
                if (!exam.available) return;
                if (exam.id === "ielts") onSelectIELTS();
              }}
              disabled={!exam.available}
              className={`group rounded-[2rem] border-2 p-7 text-left shadow-sm transition ${exam.available ? "hover:-translate-y-1 hover:shadow-md cursor-pointer" : "cursor-not-allowed opacity-70"} ${exam.color}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-3xl">
                    {exam.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-xl">{exam.name}</p>
                    <p className="text-xs text-[#4a5568]">{exam.full}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold shrink-0 ${exam.badge}`}>
                  {exam.available ? "Available" : "Coming Soon"}
                </span>
              </div>

              <p className="text-sm text-[#4a5568] mb-4">{exam.desc}</p>

              <div className="flex items-center justify-between border-t border-[#c8d5e8] pt-4">
                <span className="text-xs font-semibold text-[#4a5568]">{exam.sections}</span>
                {exam.available && (
                  <span className="text-[#8ba3c4] transition group-hover:translate-x-1 group-hover:text-[#1e2d4a]">→</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {mode === "practice" && (
          <div className="mt-8 rounded-[2rem] border border-[#c8d5e8] bg-[#ffffff] p-5 text-center shadow-sm">
            <p className="text-sm text-[#4a5568]">
              🌍 More exams are being added. TOEFL, TOEIC, and CELPIP practices are currently under development.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}