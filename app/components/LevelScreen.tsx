type Props = {
  onSelectLevel: (level: string) => void;
  onBack: () => void;
};

const levels = [
  {
    id: "Beginner",
    label: "Beginner",
    cefr: "A1 – A2",
    emoji: "🌱",
    desc: "Simple conversations, everyday topics, slow speech.",
    exams: ["IELTS 4.0–5.0", "TOEFL 31–45"],
    color: "border-green-200 hover:border-green-400 hover:bg-green-50",
    badge: "bg-green-100 text-green-700",
  },
  {
    id: "Intermediate",
    label: "Intermediate",
    cefr: "B1 – B2",
    emoji: "📚",
    desc: "Academic topics, natural speed, varied accents.",
    exams: ["IELTS 5.5–6.5", "TOEFL 46–79"],
    color: "border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50",
    badge: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "Advanced",
    label: "Advanced",
    cefr: "C1 – C2",
    emoji: "🎯",
    desc: "Complex arguments, fast native speech, nuanced vocabulary.",
    exams: ["IELTS 7.0–9.0", "TOEFL 80+"],
    color: "border-red-200 hover:border-red-400 hover:bg-red-50",
    badge: "bg-red-100 text-red-700",
  },
];

export default function LevelScreen({ onSelectLevel, onBack }: Props) {
  return (
    <main className="min-h-screen bg-[#f0f2f5] text-[#1e2d4a]">
      <section className="mx-auto max-w-5xl px-6 py-16">

        {/* Header */}
        <div className="text-center">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 mx-auto text-sm font-semibold text-[#4a5568] hover:text-[#1e2d4a]">
            ← Back
          </button>
          <h1 className="text-4xl font-bold md:text-6xl">Choose your level</h1>
          <p className="mt-4 text-lg text-[#4a5568]">
            Select the level that matches your current English proficiency.
          </p>
        </div>

        {/* Level cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => onSelectLevel(level.id)}
              className={`group rounded-[2rem] border-2 bg-[#ffffff] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${level.color}`}
            >
              <div className="flex items-start justify-between">
                <div className="text-5xl">{level.emoji}</div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${level.badge}`}>
                  {level.cefr}
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-bold">{level.label}</h2>
              <p className="mt-2 text-sm text-[#4a5568]">{level.desc}</p>

              <div className="mt-5 flex flex-col gap-1">
                {level.exams.map((exam) => (
                  <p key={exam} className="text-xs font-semibold text-[#8ba3c4]">
                    📊 {exam}
                  </p>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-bold text-[#1e2d4a]">Select level</span>
                <span className="text-[#8ba3c4] transition group-hover:translate-x-1 group-hover:text-[#1e2d4a]">→</span>
              </div>
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="mt-10 rounded-[2rem] border border-[#c8d5e8] bg-[#ffffff] p-6 text-center shadow-sm">
          <p className="text-sm text-[#4a5568]">
            💡 <strong>Not sure which level?</strong> Start with Beginner and work your way up. 
            You can always switch levels from the home screen.
          </p>
        </div>

      </section>
    </main>
  );
}