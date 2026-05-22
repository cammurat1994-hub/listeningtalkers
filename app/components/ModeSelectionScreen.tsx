type Props = {
  onSelectMCQ: () => void;
  onSelectFillBlank: () => void;
  onSelectDictation: () => void;
  onBack: () => void;
};

export default function ModeSelectionScreen({
  onSelectMCQ,
  onSelectFillBlank,
  onSelectDictation,
  onBack,
}: Props) {
  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold md:text-6xl">Choose Question Type</h1>

        <p className="mt-4 max-w-2xl text-lg text-[#7a6258]">
          Select the type of practice you want to do.
        </p>

        <div className="mt-12 grid w-full max-w-4xl gap-6 md:grid-cols-3">
          <button
            onClick={onSelectMCQ}
            className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
          >
            <div className="text-5xl">🔤</div>
            <h2 className="mt-5 text-2xl font-bold">Multiple Choice</h2>
            <p className="mt-3 text-sm text-[#7a6258]">
              Choose the correct answer from options A to E.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["IELTS", "TOEFL", "TOEIC"].map((exam) => (
                <span
                  key={exam}
                  className="rounded-full bg-[#ead7cc] px-3 py-1 text-xs font-bold text-[#3b2f2f]"
                >
                  {exam}
                </span>
              ))}
            </div>
          </button>

          <button
            onClick={onSelectFillBlank}
            className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
          >
            <div className="text-5xl">✏️</div>
            <h2 className="mt-5 text-2xl font-bold">Fill in the Blank</h2>
            <p className="mt-3 text-sm text-[#7a6258]">
              Listen and fill in the missing words in the text.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["IELTS", "PTE", "CELPIP"].map((exam) => (
                <span
                  key={exam}
                  className="rounded-full bg-[#ead7cc] px-3 py-1 text-xs font-bold text-[#3b2f2f]"
                >
                  {exam}
                </span>
              ))}
            </div>
          </button>

          <button
            onClick={onSelectDictation}
            className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
          >
            <div className="text-5xl">🎙️</div>
            <h2 className="mt-5 text-2xl font-bold">Dictation</h2>
            <p className="mt-3 text-sm text-[#7a6258]">
              Listen carefully and type exactly what you hear.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["PTE", "Cambridge", "IELTS"].map((exam) => (
                <span
                  key={exam}
                  className="rounded-full bg-[#ead7cc] px-3 py-1 text-xs font-bold text-[#3b2f2f]"
                >
                  {exam}
                </span>
              ))}
            </div>
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