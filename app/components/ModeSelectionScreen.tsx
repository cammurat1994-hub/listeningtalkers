type Props = {
  onSelectMCQ: () => void;
  onSelectFillBlank: () => void;
  onSelectDictation: () => void;
  onBack: () => void;
};

const modes = [
  {
    id: "mcq",
    emoji: "🔤",
    title: "Multiple Choice",
    description: "Choose the correct answer from options. Used in IELTS, TOEFL and TOEIC.",
    warning: "⚠️ Take notes while listening — you will need them to answer the questions.",
    exams: ["IELTS", "TOEFL", "TOEIC"],
  },
  {
    id: "fill",
    emoji: "✏️",
    title: "Fill in the Blank",
    description: "Listen and fill in the missing words in the text.",
    warning: null,
    exams: ["IELTS", "PTE", "CELPIP"],
  },
  {
    id: "dictation",
    emoji: "🎙️",
    title: "Dictation",
    description: "Listen carefully and type exactly what you hear.",
    warning: null,
    exams: ["PTE", "Cambridge", "IELTS"],
  },
];

export default function ModeSelectionScreen({
  onSelectMCQ,
  onSelectFillBlank,
  onSelectDictation,
  onBack,
}: Props) {
  const handlers: Record<string, () => void> = {
    mcq: onSelectMCQ,
    fill: onSelectFillBlank,
    dictation: onSelectDictation,
  };

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Choose Practice Type</h1>
        <p className="mt-4 text-lg text-[#7a6258]">
          Select how you want to practice your listening skills.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={handlers[mode.id]}
              className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
            >
              <div className="text-5xl">{mode.emoji}</div>
              <h2 className="mt-5 text-2xl font-bold">{mode.title}</h2>
              <p className="mt-3 text-sm text-[#7a6258]">{mode.description}</p>

              {mode.warning && (
                <p className="mt-3 rounded-2xl bg-[#ead7cc] px-4 py-2 text-xs font-semibold text-[#3b2f2f]">
                  {mode.warning}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {mode.exams.map((exam) => (
                  <span
                    key={exam}
                    className="rounded-full bg-[#3b2f2f] px-3 py-1 text-xs font-bold text-white"
                  >
                    {exam}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onBack}
          className="mt-10 text-sm font-semibold text-[#7a6258] underline"
        >
          Back
        </button>
      </section>
    </main>
  );
}