import Image from "next/image";

type Props = {
  onSelectPractice: () => void;
  onSelectQuiz: () => void;
};

export default function HomeScreen({ onSelectPractice, onSelectQuiz }: Props) {
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

        <h1 className="text-4xl font-bold md:text-6xl">What would you like to do?</h1>

        <p className="mt-4 max-w-xl text-lg text-[#7a6258]">
          Practice your listening skills or take an exam-style quiz.
        </p>

        <div className="mt-12 grid w-full max-w-3xl gap-6 md:grid-cols-2">
          <button
            onClick={onSelectPractice}
            className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-10 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
          >
            <div className="text-5xl">🎧</div>
            <h2 className="mt-6 text-3xl font-bold">Practice</h2>
            <p className="mt-4 text-[#7a6258]">
              Choose your level, pick a question type and practice at your own pace. No time limit.
            </p>
          </button>

          <button
            onClick={onSelectQuiz}
            className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-10 text-left shadow-sm transition hover:-translate-y-1 hover:bg-[#f1ded5]"
          >
            <div className="text-5xl">📝</div>
            <h2 className="mt-6 text-3xl font-bold">Exam Quiz</h2>
            <p className="mt-4 text-[#7a6258]">
              Simulate a real exam. Timed, scored and matched to IELTS, TOEFL or TOEIC format.
            </p>
          </button>
        </div>
      </section>
    </main>
  );
}