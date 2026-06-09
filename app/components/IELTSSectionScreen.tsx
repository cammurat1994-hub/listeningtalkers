"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import IELTSInfoModal from "./IELTSInfoModal";

type Props = {
  onSelectSection: (section: number) => void;
  onBack: () => void;
  userEmail: string;
};

const sections = [
  {
    number: 1,
    title: "Section 1",
    subtitle: "Everyday Conversation",
    level: "A2–B1",
    color: "border-green-200 hover:border-green-400",
    badge: "bg-green-100 text-green-700",
    emoji: "💬",
    types: ["Form Completion", "Note Completion", "Table Completion", "Matching", "Short Answer"],
    desc: "Two people in a social context — hotel booking, course registration, travel arrangements.",
  },
  {
    number: 2,
    title: "Section 2",
    subtitle: "Social Monologue",
    level: "B1–B2",
    color: "border-yellow-200 hover:border-yellow-400",
    badge: "bg-yellow-100 text-yellow-700",
    emoji: "🗣️",
    types: ["Map Labelling", "Multiple Choice", "Matching", "Form Completion", "Sentence Completion"],
    desc: "One person speaking about a local topic — museum, park, campus.",
  },
  {
    number: 3,
    title: "Section 3",
    subtitle: "Academic Discussion",
    level: "B2–C1",
    color: "border-orange-200 hover:border-orange-400",
    badge: "bg-orange-100 text-orange-700",
    emoji: "🎓",
    types: ["Multiple Choice", "Matching", "Note Completion", "Sentence Completion"],
    desc: "2–4 people in an academic context — student project, research discussion.",
  },
  {
    number: 4,
    title: "Section 4",
    subtitle: "Academic Lecture",
    level: "C1–C2",
    color: "border-red-200 hover:border-red-400",
    badge: "bg-red-100 text-red-700",
    emoji: "📚",
    types: ["Note Completion", "Flow Chart", "Table Completion", "Sentence Completion", "Summary Completion"],
    desc: "One speaker giving an academic lecture. No pauses — the hardest section.",
  },
];

export default function IELTSSectionScreen({ onSelectSection, onBack, userEmail }: Props) {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!userEmail) {
      setShowModal(true);
    } else {
      const key = `ielts_info_seen_${userEmail}`;
      if (!localStorage.getItem(key)) setShowModal(true);
    }

    async function fetchCounts() {
      const { data } = await supabase
        .from("episodes")
        .select("exam_section")
        .eq("exam_type", "ielts")
        .not("exam_section", "is", null);
      if (data) {
        const c: Record<number, number> = {};
        data.forEach(ep => {
          const s = ep.exam_section as number;
          c[s] = (c[s] || 0) + 1;
        });
        setCounts(c);
      }
    }
    fetchCounts();
  }, [userEmail]);

  function handleModalClose() {
    setShowModal(false);
    if (userEmail) localStorage.setItem(`ielts_info_seen_${userEmail}`, "1");
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      {showModal && <IELTSInfoModal onClose={handleModalClose} />}

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <button onClick={onBack} className="mb-6 flex items-center gap-2 mx-auto text-sm font-semibold text-[#7a6258] hover:text-[#3b2f2f]">
            ← Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ead7cc] px-4 py-2 text-sm font-semibold text-[#3b2f2f] mb-4">
            🎧 IELTS Listening Practice
          </div>
          <h1 className="text-4xl font-bold md:text-5xl">Choose a Section</h1>
          <p className="mt-4 text-lg text-[#7a6258]">
            Each section trains different question types. Practice them all to maximize your score.
          </p>
          <button onClick={() => setShowModal(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold text-[#7a6258] hover:bg-[#f1ded5] transition">
            📖 How IELTS Listening Works
          </button>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {sections.map(s => (
            <button key={s.number} onClick={() => onSelectSection(s.number)}
              className={`group rounded-[2rem] border-2 bg-[#fffaf7] p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${s.color}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ead7cc] text-3xl">{s.emoji}</div>
                  <div>
                    <p className="font-bold text-xl">{s.title}</p>
                    <p className="text-sm text-[#7a6258]">{s.subtitle}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold shrink-0 ${s.badge}`}>{s.level}</span>
              </div>
              <p className="text-sm text-[#7a6258] mb-4">{s.desc}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {s.types.map(t => (
                  <span key={t} className="rounded-full border border-[#e0c7bb] bg-white px-3 py-1 text-xs font-semibold text-[#3b2f2f]">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-[#e0c7bb] pt-4">
                <span className="text-sm text-[#7a6258]">
                  {counts[s.number] ? `${counts[s.number]} practices available` : "Practices coming soon"}
                </span>
                <span className="text-[#c9a99a] transition group-hover:translate-x-1 group-hover:text-[#3b2f2f]">→</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-5 text-center shadow-sm">
          <p className="text-sm text-[#7a6258]">
            🎯 <strong>Pro tip:</strong> Start with Section 1 and work your way up. Each section introduces new question types.
          </p>
        </div>
      </section>
    </main>
  );
}