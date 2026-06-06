type Props = {
  level: string;
  onSelectMCQ: () => void;
  onSelectFillBlank: () => void;
  onSelectDictation: () => void;
  onSelectShortAnswer: () => void;
  onSelectMatching: () => void;
  onSelectMap: () => void;
  onSelectCompletions: () => void;
  onBack: () => void;
};

const modes = [
  {
    id: "mcq",
    emoji: "🔤",
    title: "Multiple Choice",
    description: "Choose the correct answer from options A to E.",
    tip: "Take notes while listening — you'll need them for questions.",
    exams: ["IELTS", "TOEFL", "TOEIC"],
    beginnerOnly: false,
  },
  {
    id: "fill",
    emoji: "✏️",
    title: "Fill in the Blank",
    description: "Listen and fill in the missing words in the text as you hear them.",
    tip: null,
    exams: ["IELTS", "PTE", "CELPIP"],
    beginnerOnly: false,
  },
  {
    id: "dictation",
    emoji: "🎙️",
    title: "Dictation",
    description: "Listen carefully and type exactly what you hear, word for word.",
    tip: null,
    exams: ["PTE", "Cambridge", "IELTS"],
    beginnerOnly: false,
  },
  {
    id: "short",
    emoji: "✍️",
    title: "Short Answer",
    description: "Answer each question in 1–3 words based on what you hear.",
    tip: "Take notes while listening — you'll need them for questions.",
    exams: ["IELTS", "TOEFL"],
    beginnerOnly: false,
  },
  {
    id: "matching",
    emoji: "🔗",
    title: "Matching",
    description: "Match each item on the left with the correct description on the right.",
    tip: "Take notes while listening — you'll need them for questions.",
    exams: ["IELTS", "TOEIC"],
    beginnerOnly: false,
  },
  {
    id: "map",
    emoji: "🗺️",
    title: "Map Labelling",
    description: "Listen to directions and label the correct locations on a map.",
    tip: "Study the map before listening — identify key reference points first.",
    exams: ["IELTS", "TOEFL"],
    beginnerOnly: true,
  },
  {
    id: "completions",
    emoji: "📋",
    title: "Completions",
    description: "Complete notes, forms, tables, flow charts or sentences based on what you hear.",
    tip: "Read the incomplete text carefully before listening.",
    exams: ["IELTS", "TOEFL", "PTE"],
    beginnerOnly: true,
  },
];

export default function ModeSelectionScreen({
  level,
  onSelectMCQ,
  onSelectFillBlank,
  onSelectDictation,
  onSelectShortAnswer,
  onSelectMatching,
  onSelectMap,
  onSelectCompletions,
  onBack,
}: Props) {
  const handlers: Record<string, () => void> = {
    mcq: onSelectMCQ,
    fill: onSelectFillBlank,
    dictation: onSelectDictation,
    short: onSelectShortAnswer,
    matching: onSelectMatching,
    map: onSelectMap,
    completions: onSelectCompletions,
  };

  const isBeginnerLocked = level === "Beginner";
  const visibleModes = modes.filter(m => !(isBeginnerLocked && m.beginnerOnly));

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl px-6 py-16">

        <div className="text-center">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 mx-auto text-sm font-semibold text-[#7a6258] hover:text-[#3b2f2f]">
            ← Back
          </button>
          <h1 className="text-4xl font-bold md:text-5xl">Choose Practice Type</h1>
          <p className="mt-4 text-lg text-[#7a6258]">
            Each type trains a different listening skill. Master them all.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleModes.map((mode) => (
            <button
              key={mode.id}
              onClick={handlers[mode.id]}
              className="group rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-7 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#3b2f2f] hover:bg-white hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ead7cc] text-3xl">
                {mode.emoji}
              </div>

              <h2 className="mt-4 text-xl font-bold">{mode.title}</h2>
              <p className="mt-2 text-sm text-[#7a6258]">{mode.description}</p>

              {mode.tip && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#ead7cc] px-3 py-2">
                  <span className="text-xs">💡</span>
                  <p className="text-xs font-semibold text-[#3b2f2f]">{mode.tip}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {mode.exams.map((exam) => (
                  <span key={exam} className="rounded-full bg-[#3b2f2f] px-3 py-1 text-xs font-bold text-white">
                    {exam}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#e0c7bb] pt-4">
                <span className="text-sm font-bold">Start practicing</span>
                <span className="text-[#c9a99a] transition group-hover:translate-x-1 group-hover:text-[#3b2f2f]">→</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-5 text-center shadow-sm">
          <p className="text-sm text-[#7a6258]">
            🎯 <strong>Pro tip:</strong> IELTS Listening tests all question types.
            Practice each one to maximize your score.
          </p>
        </div>

      </section>
    </main>
  );
}