type Props = {
  onSelectLevel: (level: string) => void;
  onBack: () => void;
};

const levels = [
  {
    id: "Beginner",
    label: "Beginner",
    description: "A1 – A2",
    emoji: "🌱",
  },
  {
    id: "Intermediate",
    label: "Intermediate",
    description: "B1 – B2",
    emoji: "📚",
  },
  {
    id: "Advanced",
    label: "Advanced",
    description: "C1 – C2",
    emoji: "🎯",
  },
];

export default function LevelScreen({ onSelectLevel, onBack }: Props) {
  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <img
          src="/cat-logo.svg"
          alt="ListeningTalkers Logo"
          width={280}
          height={360}
          className="mb-2"
        />

        <h1 className="text-4xl font-bold md:text-6xl">Choose your level</h1>

        <p className="mt-4 max-w-xl text-[#7a6258]">
          Select the level that matches your English proficiency.
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-6 md:grid-cols-3">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => onSelectLevel(level.id)}
              className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
            >
              <div className="text-5xl">{level.emoji}</div>
              <h2 className="mt-5 text-2xl font-bold">{level.label}</h2>
              <p className="mt-2 text-sm font-semibold text-[#c9a99a]">
                {level.description}
              </p>
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