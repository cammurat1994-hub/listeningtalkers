type Section = {
  number: number;
  audioUrl: string;
  questionGroups: { type: string; label: string; data: unknown }[];
};

type Props = {
  title: string;
  examType: string;
  sections: Section[];
  pdfUrl?: string;
  onStart: () => void;
  onBack: () => void;
};

const SECTION_INFO = [
  { title: "Section 1", context: "Social context", speakers: "2 speakers", topic: "Everyday situation (e.g. booking, registration)", difficulty: "Easiest", color: "bg-green-100 text-green-700" },
  { title: "Section 2", context: "Social context", speakers: "1 speaker", topic: "Monologue about local facilities, tours, events", difficulty: "Easy", color: "bg-green-100 text-green-700" },
  { title: "Section 3", context: "Academic context", speakers: "2–4 speakers", topic: "Discussion about study or training", difficulty: "Moderate", color: "bg-yellow-100 text-yellow-700" },
  { title: "Section 4", context: "Academic context", speakers: "1 speaker", topic: "University lecture on academic subject", difficulty: "Hardest", color: "bg-red-100 text-red-700" },
];

export default function ExamIntro({ title, examType, sections, pdfUrl, onStart, onBack }: Props) {
  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-3xl px-6 py-12">

        {/* Header */}
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#7a6258] hover:text-[#3b2f2f]">
          ← Back
        </button>

        <div className="rounded-[2rem] bg-[#3b2f2f] p-8 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#c9a99a] uppercase tracking-wide">{examType} Listening</p>
              <h1 className="mt-2 text-3xl font-bold">{title}</h1>
            </div>
            <div className="text-right shrink-0">
              <p className="text-4xl font-bold">40</p>
              <p className="text-sm text-[#c9a99a]">questions</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <p className="text-2xl font-bold">30</p>
              <p className="text-xs text-[#c9a99a]">min listening</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <p className="text-2xl font-bold">10</p>
              <p className="text-xs text-[#c9a99a]">min review</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <p className="text-2xl font-bold">4</p>
              <p className="text-xs text-[#c9a99a]">sections</p>
            </div>
          </div>
        </div>

        {/* Important rules */}
        <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
          <h2 className="text-lg font-bold">⚠️ Before you start</h2>
          <div className="mt-4 flex flex-col gap-3">
            {[
              { icon: "🔊", text: "Each audio recording plays ONCE only. You cannot pause or rewind." },
              { icon: "⏱️", text: "You have 30 seconds to read each section questions before the audio starts." },
              { icon: "📝", text: "Write your answers while listening. You can review them at the end." },
              { icon: "🔡", text: "Answers can be 1–3 words. Spelling must be correct." },
              { icon: "🌍", text: "You may hear British, Australian, or North American accents." },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{rule.icon}</span>
                <p className="text-sm text-[#3b2f2f]">{rule.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section breakdown */}
        <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
          <h2 className="text-lg font-bold">📋 Test structure</h2>
          <div className="mt-4 flex flex-col gap-3">
            {SECTION_INFO.map((s, i) => {
              const section = sections[i];
              const questionCount = section?.questionGroups?.reduce((acc, g) => {
                const d = g.data as Record<string, unknown>;
                if (Array.isArray(d)) return acc + d.length;
                if (d?.items) return acc + (d.items as unknown[]).length;
                if (d?.fields) return acc + (d.fields as unknown[]).length;
                if (d?.steps) return acc + (d.steps as { hasBlank: boolean }[]).filter(st => st.hasBlank).length;
                if (d?.pairs) return acc + (d.pairs as unknown[]).length;
                if (d?.points) return acc + (d.points as unknown[]).length;
                return acc + 10;
              }, 0) || 10;

              return (
                <div key={i} className="flex items-start gap-4 rounded-2xl border border-[#e0c7bb] bg-white p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ead7cc] font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{s.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.color}`}>{s.difficulty}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#7a6258]">{s.speakers} · {s.topic}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {section?.questionGroups?.map((g, gi) => (
                        <span key={gi} className="rounded-full bg-[#f7eee8] border border-[#e0c7bb] px-2 py-0.5 text-xs font-semibold">
                          {g.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">{questionCount}</p>
                    <p className="text-xs text-[#7a6258]">questions</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timing breakdown */}
        <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
          <h2 className="text-lg font-bold">⏱️ How time works</h2>
          <div className="mt-4 flex flex-col gap-2">
            {[
              { phase: "Start of each section", time: "30 sec", desc: "Read the questions before audio starts" },
              { phase: "Audio plays", time: "~7 min", desc: "Listen and write answers simultaneously" },
              { phase: "Between sections", time: "30 sec", desc: "Read next section questions" },
              { phase: "Review time", time: "10 min", desc: "Check and edit all your answers" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{row.phase}</p>
                  <p className="text-xs text-[#7a6258]">{row.desc}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#ead7cc] px-3 py-1 text-xs font-bold text-[#3b2f2f]">{row.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Download */}
        {pdfUrl && (
          <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold">📄 Question Paper PDF</p>
                <p className="mt-1 text-sm text-[#7a6258]">Download and print the question paper to follow along, just like the real exam.</p>
              </div>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                className="shrink-0 rounded-2xl bg-[#3b2f2f] px-5 py-3 text-sm font-bold text-white hover:bg-[#2f2424]">
                Download PDF
              </a>
            </div>
          </div>
        )}

        {/* Start button */}
        <button onClick={onStart}
          className="mt-8 w-full rounded-2xl bg-[#3b2f2f] px-6 py-5 text-lg font-bold text-white shadow-lg transition hover:bg-[#2f2424]">
          I am ready — Start Test →
        </button>

        <p className="mt-4 text-center text-xs text-[#7a6258]">
          Once you start, the timer begins. Make sure you are in a quiet environment.
        </p>

      </section>
    </main>
  );
}