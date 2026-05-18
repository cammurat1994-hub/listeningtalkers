type Props = {
  onSelectVocabulary: () => void;
  onSelectListening: () => void;
  onBack: () => void;
};

export default function ModeSelectionScreen({
  onSelectVocabulary,
  onSelectListening,
  onBack,
}: Props) {
  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold md:text-6xl">
          Choose Your Mode
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-[#7a6258]">
          Study vocabulary before the test or start the listening test directly.
        </p>

        <div className="mt-12 grid w-full max-w-3xl gap-6 md:grid-cols-2">
          <button
            onClick={onSelectVocabulary}
            className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-10 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
          >
            <div className="text-5xl">📘</div>

            <h2 className="mt-6 text-3xl font-bold">
              Vocabulary
            </h2>

            <p className="mt-4 text-[#7a6258]">
              Study important words, meanings, word types and pronunciation before starting the listening test.
            </p>
          </button>

          <button
            onClick={onSelectListening}
            className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-10 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
          >
            <div className="text-5xl">🎧</div>

            <h2 className="mt-6 text-3xl font-bold">
              Listening Test
            </h2>

            <p className="mt-4 text-[#7a6258]">
              Listen carefully, take notes and answer the questions step by step.
            </p>
          </button>
        </div>

        <button
          onClick={onBack}
          className="mt-10 text-sm font-semibold text-[#7a6258] underline"
        >
          Back to episodes
        </button>
      </section>
    </main>
  );
}