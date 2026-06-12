"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  onClose: () => void;
};

const sections = [
  {
    number: 1,
    title: "Section 1 — Everyday Conversation",
    level: "A2–B1",
    color: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-700",
    desc: "Two people talking in a social context. Topics: hotel booking, course registration, travel arrangements.",
    types: ["Form Completion", "Note Completion", "Table Completion"],
    typeColor: "bg-green-100 text-green-700",
  },
  {
    number: 2,
    title: "Section 2 — Social Monologue",
    level: "B1–B2",
    color: "bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
    desc: "One person speaking about a local topic. Topics: museum tour, park facilities, campus introduction.",
    types: ["Map Labelling", "Matching", "Multiple Choice"],
    typeColor: "bg-yellow-100 text-yellow-700",
  },
  {
    number: 3,
    title: "Section 3 — Academic Discussion",
    level: "B2–C1",
    color: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-700",
    desc: "2–4 people in an academic context. Topics: student project, assignment discussion, research planning.",
    types: ["Multiple Choice", "Matching", "Sentence Completion"],
    typeColor: "bg-orange-100 text-orange-700",
  },
  {
    number: 4,
    title: "Section 4 — Academic Lecture",
    level: "C1–C2",
    color: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700",
    desc: "One speaker giving an academic lecture. No pauses. Topics: psychology, biology, history, environment.",
    types: ["Note Completion", "Flow Chart", "Table Completion", "Sentence Completion"],
    typeColor: "bg-red-100 text-red-700",
  },
];

export default function IELTSInfoModal({ onClose }: Props) {
  const [page, setPage] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-[2rem] bg-[#fffaf7] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#3b2f2f] px-8 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <Image src="/cat-logo.svg" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-bold">How IELTS Listening Works</h2>
              <p className="text-sm text-[#c9a99a]">4 sections · 40 questions · ~30 minutes</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
          {page === 0 ? (
            <div>
              <p className="text-sm text-[#7a6258] mb-6">
                The IELTS Listening test has 4 sections, each with 10 questions. Difficulty increases with each section. Audio plays <strong>once only</strong> — no replays.
              </p>
              <div className="flex flex-col gap-3">
                {sections.map(s => (
                  <div key={s.number} className={`rounded-2xl border p-4 ${s.color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm">{s.title}</p>
                      <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${s.badge}`}>{s.level}</span>
                    </div>
                    <p className="text-xs text-[#7a6258] mb-3">{s.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.types.map(t => (
                        <span key={t} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.typeColor}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-[#3b2f2f] mb-4">💡 Key Tips for IELTS Listening</p>
              <div className="flex flex-col gap-3">
                {[
                  { emoji: "👁️", tip: "Read the questions BEFORE the audio starts", detail: "You'll have 20–45 seconds. Use this time to identify keywords and predict answer types." },
                  { emoji: "✏️", tip: "Write as you listen", detail: "Don't wait until the audio ends. Answer questions in real time as you hear them." },
                  { emoji: "🔢", tip: "Follow word limits strictly", detail: "If the instruction says 'NO MORE THAN TWO WORDS', writing three words means zero marks." },
                  { emoji: "⚠️", tip: "Watch out for distractors", detail: "Speakers often say one thing then change their mind. The final answer is usually correct." },
                  { emoji: "🗺️", tip: "Section 4 has NO pauses", detail: "The hardest section. All 10 questions are shown upfront and audio runs without breaks." },
                  { emoji: "🔤", tip: "Spelling counts", detail: "Misspelled answers are marked wrong. Take care especially with names and numbers." },
                ].map((item, i) => (
                  <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <p className="text-sm font-bold">{item.tip}</p>
                        <p className="mt-0.5 text-xs text-[#7a6258]">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#e0c7bb] px-8 py-5 flex items-center justify-between bg-white">
          <div className="flex gap-2">
            <button onClick={() => setPage(0)} className={`h-2 w-6 rounded-full transition-all ${page === 0 ? "bg-[#3b2f2f]" : "bg-[#e0c7bb]"}`} />
            <button onClick={() => setPage(1)} className={`h-2 w-6 rounded-full transition-all ${page === 1 ? "bg-[#3b2f2f]" : "bg-[#e0c7bb]"}`} />
          </div>
          <div className="flex gap-3">
            {page === 0 ? (
              <>
                <button onClick={onClose} className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-2.5 text-sm font-semibold text-[#7a6258] hover:bg-[#f1ded5]">
                  Skip
                </button>
                <button onClick={() => setPage(1)} className="rounded-2xl bg-[#3b2f2f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f2424]">
                  Tips & Tricks →
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setPage(0)} className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-2.5 text-sm font-semibold text-[#7a6258] hover:bg-[#f1ded5]">
                  ← Back
                </button>
                <button onClick={onClose} className="rounded-2xl bg-[#3b2f2f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2f2424]">
                  Got it, let us practice! →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}