type Props = {
  onSelectNote: () => void;
  onSelectForm: () => void;
  onSelectTable: () => void;
  onSelectFlow: () => void;
  onSelectSentence: () => void;
  onBack: () => void;
};

const types = [
  {
    id: "note",
    emoji: "📝",
    title: "Note Completion",
    description: "Complete a set of notes taken from a lecture or talk.",
    exams: ["IELTS", "TOEFL"],
    difficulty: "Medium",
    diffColor: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "form",
    emoji: "📄",
    title: "Form Completion",
    description: "Fill in a registration form, application or similar document.",
    exams: ["IELTS", "TOEIC"],
    difficulty: "Easy",
    diffColor: "bg-green-100 text-green-700",
  },
  {
    id: "table",
    emoji: "📊",
    title: "Table Completion",
    description: "Complete a table with information from what you hear.",
    exams: ["IELTS", "TOEFL"],
    difficulty: "Medium",
    diffColor: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "flow",
    emoji: "🔄",
    title: "Flow Chart Completion",
    description: "Complete a flow chart showing a process or sequence of events.",
    exams: ["IELTS", "PTE"],
    difficulty: "Hard",
    diffColor: "bg-red-100 text-red-700",
  },
  {
    id: "sentence",
    emoji: "✏️",
    title: "Sentence Completion",
    description: "Complete sentences using words from what you hear.",
    exams: ["IELTS", "TOEFL", "PTE"],
    difficulty: "Medium",
    diffColor: "bg-yellow-100 text-yellow-700",
  },
];

export default function CompletionTypeScreen({
  onSelectNote,
  onSelectForm,
  onSelectTable,
  onSelectFlow,
  onSelectSentence,
  onBack,
}: Props) {
  const handlers: Record<string, () => void> = {
    note: onSelectNote,
    form: onSelectForm,
    table: onSelectTable,
    flow: onSelectFlow,
    sentence: onSelectSentence,
  };

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl px-6 py-16">

        <div className="text-center">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 mx-auto text-sm font-semibold text-[#7a6258] hover:text-[#3b2f2f]">
            ← Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ead7cc] px-4 py-2 text-sm font-semibold">
            📋 Completions
          </div>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">Choose Completion Type</h1>
          <p className="mt-4 text-lg text-[#7a6258]">
            All completion types appear in IELTS Listening Section 1–4.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={handlers[type.id]}
              className="group rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-7 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#3b2f2f] hover:bg-white hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ead7cc] text-3xl">
                  {type.emoji}
                </div>
                <p className={`rounded-full px-3 py-1 text-xs font-bold ${type.diffColor}`}>
  {type.difficulty}
</p>
              </div>

              <h2 className="mt-4 text-xl font-bold">{type.title}</h2>
              <p className="mt-2 text-sm text-[#7a6258]">{type.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {type.exams.map((exam) => (
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

      </section>
    </main>
  );
}
