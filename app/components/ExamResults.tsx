type Section = {
  number: number;
  audioUrl: string;
  questionGroups: { type: string; label: string; data: unknown }[];
};

type Props = {
  title: string;
  examType: string;
  sections: Section[];
  answers: Record<string, string>;
  onBack: () => void;
  onRetry: () => void;
};

function normalize(str: string) {
  return str.toLowerCase().trim().replace(/[.,!?;:'"]/g, "");
}

function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalize(userAnswer);
  const variants = correctAnswer.split("|").map(normalize);
  return variants.some((v) => v === normalizedUser);
}

function bandScore(correct: number): string {
  if (correct >= 39) return "9.0";
  if (correct >= 37) return "8.5";
  if (correct >= 35) return "8.0";
  if (correct >= 33) return "7.5";
  if (correct >= 30) return "7.0";
  if (correct >= 27) return "6.5";
  if (correct >= 23) return "6.0";
  if (correct >= 20) return "5.5";
  if (correct >= 16) return "5.0";
  if (correct >= 13) return "4.5";
  if (correct >= 10) return "4.0";
  return "3.5";
}

function bandColor(band: string): string {
  const b = parseFloat(band);
  if (b >= 7) return "text-green-600";
  if (b >= 5.5) return "text-yellow-600";
  return "text-red-600";
}

export default function ExamResults({ title, examType, sections, answers, onBack, onRetry }: Props) {
  // Calculate results
  const results: { sectionNum: number; groupLabel: string; questionKey: string; correct: boolean; userAnswer: string; correctAnswer: string }[] = [];

  sections.forEach((section) => {
    section.questionGroups.forEach((group) => {
      const data = group.data as Record<string, unknown>;

      if (group.type === "mcq") {
        const qs = data as { question: string; correctAnswer: string }[];
        qs.forEach((q, i) => {
          const key = `${section.number}-${group.label}-mcq-${i}`;
          const userAns = answers[key] || "";
          results.push({ sectionNum: section.number, groupLabel: group.label, questionKey: key, correct: userAns === q.correctAnswer, userAnswer: userAns, correctAnswer: q.correctAnswer });
        });
      } else if (group.type === "note-completion" || group.type === "form-completion") {
        const items = (data as { items?: { answer: string }[]; fields?: { answer: string }[] }).items || (data as { fields?: { answer: string }[] }).fields || [];
        items.forEach((item, i) => {
          const key = `${section.number}-${group.label}-item-${i}`;
          const userAns = answers[key] || "";
          results.push({ sectionNum: section.number, groupLabel: group.label, questionKey: key, correct: checkAnswer(userAns, item.answer), userAnswer: userAns, correctAnswer: item.answer.split("|")[0] });
        });
      } else if (group.type === "sentence-completion") {
        const items = (data as { items: { text: string; answer: string }[] }).items || [];
        items.forEach((item, i) => {
          const key = `${section.number}-${group.label}-sent-${i}`;
          const userAns = answers[key] || "";
          results.push({ sectionNum: section.number, groupLabel: group.label, questionKey: key, correct: checkAnswer(userAns, item.answer), userAnswer: userAns, correctAnswer: item.answer.split("|")[0] });
        });
      } else if (group.type === "flow-completion") {
        const steps = (data as { steps: { text: string; answer: string; hasBlank: boolean }[] }).steps || [];
        steps.filter(s => s.hasBlank).forEach((step, i) => {
          const key = `${section.number}-${group.label}-flow-${i}`;
          const userAns = answers[key] || "";
          results.push({ sectionNum: section.number, groupLabel: group.label, questionKey: key, correct: checkAnswer(userAns, step.answer), userAnswer: userAns, correctAnswer: step.answer.split("|")[0] });
        });
      } else if (group.type === "short-answer") {
        const qs = data as { question: string; answer: string }[];
        qs.forEach((q, i) => {
          const key = `${section.number}-${group.label}-short-${i}`;
          const userAns = answers[key] || "";
          results.push({ sectionNum: section.number, groupLabel: group.label, questionKey: key, correct: checkAnswer(userAns, q.answer), userAnswer: userAns, correctAnswer: q.answer.split("|")[0] });
        });
      } else if (group.type === "matching") {
        const pairs = (data as { pairs: { left: string; right: string }[] }).pairs || [];
        pairs.forEach((pair, i) => {
          const key = `${section.number}-${group.label}-match-${i}`;
          const userAns = answers[key] || "";
          results.push({ sectionNum: section.number, groupLabel: group.label, questionKey: key, correct: checkAnswer(userAns, pair.right), userAnswer: userAns, correctAnswer: pair.right });
        });
      } else if (group.type === "map") {
        const points = (data as { points: { id: number; answer: string }[]; options: { key: string; label: string }[] }).points || [];
        const options = (data as { options: { key: string; label: string }[] }).options || [];
        points.forEach((point, i) => {
          const key = `${section.number}-${group.label}-map-${point.id}`;
          const userAns = answers[key] || "";
          const correctLabel = options.find(o => o.key === point.answer)?.label || point.answer;
          results.push({ sectionNum: section.number, groupLabel: group.label, questionKey: key, correct: userAns === point.answer, userAnswer: userAns, correctAnswer: correctLabel });
        });
      } else if (group.type === "table-completion") {
        const rows = (data as { rows: { cells: string[]; answerIndices: number[]; answers: string[] }[] }).rows || [];
        let ansIdx = 0;
        rows.forEach((row) => {
          row.answerIndices.forEach((_, i) => {
            const key = `${section.number}-${group.label}-table-${ansIdx}`;
            const userAns = answers[key] || "";
            results.push({ sectionNum: section.number, groupLabel: group.label, questionKey: key, correct: checkAnswer(userAns, row.answers[i] || ""), userAnswer: userAns, correctAnswer: (row.answers[i] || "").split("|")[0] });
            ansIdx++;
          });
        });
      }
    });
  });

  const totalCorrect = results.filter(r => r.correct).length;
  const total = results.length;
  const band = bandScore(totalCorrect);
  const pct = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

  const bySection = sections.map(s => ({
    number: s.number,
    results: results.filter(r => r.sectionNum === s.number),
  }));

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-3xl px-6 py-12">

        {/* Score card */}
        <div className="rounded-[2rem] bg-[#3b2f2f] p-8 text-white text-center shadow-xl">
          <p className="text-sm font-semibold text-[#c9a99a] uppercase tracking-wide">{examType} Listening Results</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <div className="mt-6 flex items-center justify-center gap-8">
            <div>
              <p className="text-6xl font-bold">{totalCorrect}</p>
              <p className="text-sm text-[#c9a99a]">out of {total}</p>
            </div>
            <div className="h-16 w-px bg-white/20" />
            <div>
              <p className={`text-6xl font-bold ${bandColor(band)}`}>{band}</p>
              <p className="text-sm text-[#c9a99a]">Band Score</p>
            </div>
            <div className="h-16 w-px bg-white/20" />
            <div>
              <p className="text-6xl font-bold">{pct}%</p>
              <p className="text-sm text-[#c9a99a]">accuracy</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-[#c9a99a]">
            {parseFloat(band) >= 7 ? "🎯 Excellent! Target band achieved." :
             parseFloat(band) >= 5.5 ? "📈 Good work! Keep practicing to reach band 7+." :
             "💪 Keep going! Consistent practice will improve your score."}
          </p>
        </div>

        {/* Section breakdown */}
        <div className="mt-6 flex flex-col gap-4">
          {bySection.map((s) => {
            const sCorrect = s.results.filter(r => r.correct).length;
            const sTotal = s.results.length;
            const sPct = sTotal > 0 ? Math.round((sCorrect / sTotal) * 100) : 0;
            return (
              <div key={s.number} className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Section {s.number}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{sCorrect}/{sTotal}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${sPct >= 80 ? "bg-green-100 text-green-700" : sPct >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{sPct}%</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-[#ead7cc] mb-4">
                  <div className={`h-2 rounded-full transition-all ${sPct >= 80 ? "bg-green-500" : sPct >= 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${sPct}%` }} />
                </div>
                <div className="flex flex-col gap-2">
                  {s.results.map((r, i) => (
                    <div key={i} className={`flex items-start gap-3 rounded-2xl border p-3 ${r.correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      <span className={`shrink-0 font-bold text-sm ${r.correct ? "text-green-600" : "text-red-600"}`}>
                        {r.correct ? "✓" : "✗"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#7a6258]">{r.groupLabel}</p>
                        {!r.correct && (
                          <p className="text-xs mt-0.5">
                            <span className="text-red-600">Your answer: {r.userAnswer || "(blank)"}</span>
                            <span className="text-green-600 ml-2">✓ {r.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={onRetry} className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white hover:bg-[#2f2424]">
            Retry This Test
          </button>
          <button onClick={onBack} className="w-full rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f] hover:bg-[#f1ded5]">
            Back to Exam List
          </button>
        </div>

      </section>
    </main>
  );
}