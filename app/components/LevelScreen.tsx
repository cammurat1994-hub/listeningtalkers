import Image from "next/image";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

type Props = {
  onSelectLevel: (level: string) => void;
  onBack: () => void;
};

export default function LevelScreen({ onSelectLevel, onBack }: Props) {
  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <img
          src="/cat-logo.svg"
          alt="ListeningTalkers Logo"
          width={180}
          height={180}
          className="mb-2"
        />

        <h1 className="text-4xl font-bold md:text-6xl">Choose your level</h1>

        <p className="mt-4 max-w-xl text-[#7a6258]">
          Select the level you want to practice.
        </p>

        <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-3">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => onSelectLevel(level)}
              className="rounded-3xl border border-[#e0c7bb] bg-[#fffaf7] p-8 text-4xl font-bold shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
            >
              {level}
            </button>
          ))}
        </div>

        <button
          onClick={onBack}
          className="mt-8 text-sm font-semibold text-[#7a6258] underline"
        >
          Back to login
        </button>
      </section>
    </main>
  );
}