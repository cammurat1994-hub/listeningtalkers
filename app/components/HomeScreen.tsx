"use client";

type Props = {
  onSelectPractice: () => void;
  onSelectQuiz: () => void;
};

const stats = [
  { value: "3,000+", label: "Practice exercises" },
  { value: "12", label: "Question types" },
  { value: "4", label: "Exams covered" },
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
    emoji: "🗺️",
    title: "12 question types",
    desc: "MCQ, Fill in the Blank, Dictation, Short Answer, Matching, Map Labelling, and 5 Completion types — all in one place.",
  },
  {
    emoji: "💬",
    title: "Community discussion",
    desc: "Ask questions and share tips with other learners on every practice.",
  },
];

const questionTypes = [
  { emoji: "🔤", label: "Multiple Choice", desc: "IELTS, TOEFL, TOEIC" },
  { emoji: "✏️", label: "Fill in the Blank", desc: "IELTS, PTE, CELPIP" },
  { emoji: "🎙️", label: "Dictation", desc: "PTE, Cambridge" },
  { emoji: "✍️", label: "Short Answer", desc: "IELTS, TOEFL" },
  { emoji: "🔗", label: "Matching", desc: "IELTS, TOEIC" },
  { emoji: "🗺️", label: "Map Labelling", desc: "IELTS Section 2" },
  { emoji: "📝", label: "Note Completion", desc: "IELTS, TOEFL" },
  { emoji: "📄", label: "Form Completion", desc: "IELTS, CELPIP" },
  { emoji: "📊", label: "Table Completion", desc: "IELTS, PTE" },
  { emoji: "🔄", label: "Flow Chart", desc: "IELTS, TOEFL" },
  { emoji: "✏️", label: "Sentence Completion", desc: "IELTS, PTE" },
];

const exams = [
  { name: "IELTS", emoji: "🎧", available: true, desc: "4 sections · 40 questions · 30 min" },
  { name: "TOEFL", emoji: "🎓", available: false, desc: "Coming soon" },
  { name: "TOEIC", emoji: "💼", available: false, desc: "Coming soon" },
  { name: "CELPIP", emoji: "🍁", available: false, desc: "Coming soon" },
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
          Thousands of listening exercises across every IELTS question type. Track your progress, identify weak areas and improve fast.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button onClick={onSelectPractice} className="w-full sm:w-auto rounded-2xl bg-[#3b2f2f] px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#2f2424]">
            Start Practicing Free →
          </button>
          <button onClick={onSelectQuiz} className="w-full sm:w-auto rounded-2xl border-2 border-[#3b2f2f] bg-transparent px-10 py-4 text-lg font-bold text-[#3b2f2f] transition hover:-translate-y-1 hover:bg-[#ead7cc]">
            Take a Full Exam
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

      {/* Exams */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-3xl font-bold">Supported Exams</h2>
        <p className="mt-3 text-center text-[#7a6258]">IELTS is fully available. More exams are under development.</p>
        <div className="mt-10 grid gap-5 grid-cols-2 md:grid-cols-4">
          {exams.map(e => (
            <div key={e.name} className={`rounded-[2rem] border-2 p-6 text-center shadow-sm transition ${e.available ? "border-blue-200 bg-blue-50 hover:-translate-y-1 cursor-pointer" : "border-[#e0c7bb] bg-[#fffaf7] opacity-60"}`}
              onClick={() => e.available && onSelectPractice()}>
              <div className="text-4xl">{e.emoji}</div>
              <p className="mt-3 font-bold text-lg">{e.name}</p>
              <p className="mt-1 text-xs text-[#7a6258]">{e.desc}</p>
              {e.available && <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-700">Available</span>}
              {!e.available && <span className="mt-3 inline-block rounded-full bg-[#ead7cc] px-3 py-0.5 text-xs font-semibold text-[#7a6258]">Coming Soon</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Practice vs Exam */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-3xl font-bold">Choose your mode</h2>
        <p className="mt-3 text-center text-[#7a6258]">Practice at your own pace or simulate a real exam.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <button onClick={onSelectPractice} className="group rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#3b2f2f] hover:bg-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ead7cc] text-3xl">🎧</div>
              <div>
                <h3 className="text-2xl font-bold">Practice</h3>
                <p className="text-sm text-[#7a6258]">No time limit · Section by section</p>
              </div>
            </div>
            <p className="mt-5 text-[#7a6258]">Choose your exam and section. Practice across 12 different question types at your own pace with instant feedback.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Section 1", "Section 2", "Section 3", "Section 4"].map(l => (
                <span key={l} className="rounded-full bg-[#f7eee8] border border-[#e0c7bb] px-3 py-1 text-xs font-semibold">{l}</span>
              ))}
            </div>
            <p className="mt-5 font-bold text-[#3b2f2f] group-hover:underline">Start practicing →</p>
          </button>

          <button onClick={onSelectQuiz} className="group rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-8 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#3b2f2f] hover:bg-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ead7cc] text-3xl">🎓</div>
              <div>
                <h3 className="text-2xl font-bold">Full Exam Simulation</h3>
                <p className="text-sm text-[#7a6258]">Real format · Timed · Band score</p>
              </div>
            </div>
            <p className="mt-5 text-[#7a6258]">Simulate a full IELTS listening exam. 4 sections, 40 questions, real timing — just like exam day.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["IELTS", "TOEFL", "TOEIC", "CELPIP"].map(e => (
                <span key={e} className="rounded-full bg-[#3b2f2f] px-3 py-1 text-xs font-bold text-white">{e}</span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
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
        <p className="mt-3 text-center text-[#7a6258]">Practice every format you will see on exam day.</p>
        <div className="mt-10 grid gap-4 grid-cols-2 md:grid-cols-4">
          {questionTypes.map((t) => (
            <div key={t.label + t.desc} className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-5 text-center shadow-sm">
              <div className="text-3xl">{t.emoji}</div>
              <p className="mt-3 font-bold text-sm">{t.label}</p>
              <p className="mt-1 text-xs text-[#7a6258]">{t.desc}</p>
            </div>
          ))}
          <div className="rounded-[2rem] border-2 border-[#ead7cc] bg-[#fffaf7] p-5 text-center shadow-sm col-span-2 md:col-span-4">
            <div className="text-3xl">📋</div>
            <p className="mt-3 font-bold text-sm">Completions</p>
            <p className="mt-1 text-xs text-[#7a6258]">Note · Form · Table · Flow Chart · Sentence — IELTS, TOEFL, PTE</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <div className="rounded-[2rem] bg-[#3b2f2f] p-12 text-white shadow-xl">
          <h2 className="text-4xl font-bold">Ready to improve your score?</h2>
          <p className="mt-4 text-lg text-[#c9a99a]">Join thousands of learners already practicing on ListeningTalkers.</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button onClick={onSelectPractice} className="w-full sm:w-auto rounded-2xl bg-white px-10 py-4 text-lg font-bold text-[#3b2f2f] transition hover:bg-[#ead7cc]">
              Start for Free →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e0c7bb] py-8 text-center text-sm text-[#7a6258]">
        <p>© 2025 ListeningTalkers · Built for IELTS, TOEFL, TOEIC & CELPIP learners</p>
      </footer>
    </main>
  );
}