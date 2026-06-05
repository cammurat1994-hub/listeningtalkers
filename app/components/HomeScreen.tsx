type Props = {
  onSelectPractice: () => void;
  onSelectQuiz: () => void;
};

const stats = [
  { value: "3,000+", label: "Practice exercises" },
  { value: "5", label: "Question types" },
  { value: "3", label: "Levels" },
  { value: "Free", label: "To get started" },
];

const features = [
  {
    emoji: "🎯",
    title: "Exam-focused content",
    desc: "Every exercise is designed around real IELTS, TOEFL, TOEIC and CELPIP listening formats.",
  },
  {
    emoji: "📊",
    title: "Track your progress",
    desc: "See your accuracy by question type and identify exactly where you need more practice.",
  },
  {
    emoji: "🔁",
    title: "5 question types",
    desc: "Multiple choice, fill in the blank, dictation, short answer and matching — all in one place.",
  },
  {
    emoji: "💬",
    title: "Community discussion",
    desc: "Ask questions and share tips with other learners on every episode.",
  },
];

export default function HomeScreen({ onSelectPractice, onSelectQuiz }: Props) {
  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#ead7cc] px-4 py-2 text-sm font-semibold text-[#3b2f2f]">
          🎧 The #1 platform for IELTS listening practice
        </div>

        <h1 className="mt-6 text-5xl font-bold leading-tight md:text-7xl">
          Master IELTS Listening.<br />
          <span className="text-[#c9a99a]">Score higher.</span>
        </h1>

        <p className="mt-6 mx-auto max-w-2xl text-xl text-[#7a6258]">
          Thousands of listening exercises across every IELTS question type.
          Track your progress, identify weak areas and improve fast.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={onSelectPractice}
            className="w-full sm:w-auto rounded-2xl bg-[#3b2f2f] px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#2f2424]"
          >
            Start Practicing Free →
          </button>
          <button
            onClick={onSelectQuiz}
            className="w-full sm:w-auto rounded-2xl border-2 border-[#3b2f2f] bg-transparent px-10 py-4 text-lg font-bold text-[#3b2f2f] transition hover:-translate-y-1 hover:bg-[#ead7cc]"
          >
            Take an Exam Quiz
          </button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-sm text-[#7a6258]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Practice vs Quiz */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-3xl font-bold">Choose your mode</h2>
        <p className="mt-3 text-center text-[#7a6258]">Practice at your own pace or simulate a real exam.</p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <button
            onClick={onSelectPractice}
            className="group rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#3b2f2f] hover:bg-white"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ead7cc] text-3xl">🎧</div>
              <div>
                <h3 className="text-2xl font-bold">Practice</h3>
                <p className="text-sm text-[#7a6258]">No time limit • All levels</p>
              </div>
            </div>
            <p className="mt-5 text-[#7a6258]">
              Choose your level and question type. Practice MCQ, Fill in the Blank, Dictation, Short Answer or Matching at your own pace.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Beginner", "Intermediate", "Advanced"].map(l => (
                <span key={l} className="rounded-full bg-[#f7eee8] border border-[#e0c7bb] px-3 py-1 text-xs font-semibold">{l}</span>
              ))}
            </div>
            <p className="mt-5 font-bold text-[#3b2f2f] group-hover:underline">Start practicing →</p>
          </button>

         <button
  onClick={onSelectQuiz}
  className="group rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#3b2f2f] hover:bg-white"
>
  <div className="flex items-center gap-4">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ead7cc] text-3xl">🎓</div>
    <div>
      <h3 className="text-2xl font-bold">Full Exam Simulation</h3>
      <p className="text-sm text-[#7a6258]">Real format • Timed • Band score</p>
    </div>
  </div>
  <p className="mt-5 text-[#7a6258]">
    Simulate a full IELTS, TOEFL, TOEIC or CELPIP listening exam. 4 sections, 40 questions, real timing — just like exam day.
  </p>
  <div className="mt-5 flex flex-wrap gap-2">
    {["IELTS", "TOEFL", "TOEIC", "CELPIP"].map(e => (
      <span key={e} className="rounded-full bg-[#3b2f2f] px-3 py-1 text-xs font-bold text-white">{e}</span>
    ))}
  </div>
  <div className="mt-5 flex items-center gap-2">
    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">⏱ 40 min</span>
    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">📊 Band score</span>
    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">📄 PDF download</span>
  </div>
  <p className="mt-5 font-bold text-[#3b2f2f] group-hover:underline">Start full exam →</p>
</button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-3xl font-bold">Why ListeningTalkers?</h2>
        <p className="mt-3 text-center text-[#7a6258]">Built specifically for listening — the section most test takers struggle with.</p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ead7cc] text-2xl">{f.emoji}</div>
                <div>
                  <h3 className="font-bold text-lg">{f.title}</h3>
                  <p className="mt-1 text-sm text-[#7a6258]">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Question types */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-3xl font-bold">All question types covered</h2>
        <p className="mt-3 text-center text-[#7a6258]">Practice every format you'll see on exam day.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-5">
          {[
            { emoji: "🔤", label: "Multiple Choice", desc: "IELTS, TOEFL, TOEIC" },
            { emoji: "✏️", label: "Fill in the Blank", desc: "IELTS, PTE, CELPIP" },
            { emoji: "🎙️", label: "Dictation", desc: "PTE, Cambridge" },
            { emoji: "✍️", label: "Short Answer", desc: "IELTS, TOEFL" },
            { emoji: "🔗", label: "Matching", desc: "IELTS, TOEIC" },
          ].map((t) => (
            <div key={t.label} className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-5 text-center shadow-sm">
              <div className="text-3xl">{t.emoji}</div>
              <p className="mt-3 font-bold text-sm">{t.label}</p>
              <p className="mt-1 text-xs text-[#7a6258]">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <div className="rounded-[2rem] bg-[#3b2f2f] p-12 text-white shadow-xl">
          <h2 className="text-4xl font-bold">Ready to improve your score?</h2>
          <p className="mt-4 text-lg text-[#c9a99a]">
            Join thousands of learners already practicing on ListeningTalkers.
          </p>
          <button
            onClick={onSelectPractice}
            className="mt-8 rounded-2xl bg-white px-10 py-4 text-lg font-bold text-[#3b2f2f] transition hover:bg-[#ead7cc]"
          >
            Start for Free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e0c7bb] py-8 text-center text-sm text-[#7a6258]">
        <p>© 2025 ListeningTalkers · Built for IELTS, TOEFL, TOEIC & CELPIP learners</p>
      </footer>

    </main>
  );
}