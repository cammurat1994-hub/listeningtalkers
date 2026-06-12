"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  selectedLevel: string;
  practiceMode?: "mcq" | "fill-blank" | "dictation" | "short-answer" | "matching" | "map" | "completion-note" | "completion-form" | "completion-table" | "completion-flow" | "completion-sentence" | null;
  isQuizMode?: boolean;
  isExamMode?: boolean;
  ieltsSection?: number | null;
  onSelectEpisode: (episode: string) => void;
  onBack: () => void;
};

type Practice = {
  id: string;
  title: string;
  level: string;
  episode_type: string;
};

type CompletedPractice = {
  episode_id: string;
  score: number;
  total_questions: number;
};

const TYPE_LABELS: Record<string, string> = {
  "practice-mcq": "Multiple Choice",
  "practice-fill": "Fill in the Blank",
  "practice-dictation": "Dictation",
  "practice-short": "Short Answer",
  "practice-matching": "Matching",
  "practice-map": "Map Labelling",
  "practice-completion-note": "Note Completion",
  "practice-completion-form": "Form Completion",
  "practice-completion-table": "Table Completion",
  "practice-completion-flow": "Flow Chart",
  "practice-completion-sentence": "Sentence Completion",
  "exam-ielts": "IELTS Full Exam",
  "exam-toefl": "TOEFL Full Exam",
  "exam-toeic": "TOEIC Full Exam",
  "exam-celpip": "CELPIP Full Exam",
  "quiz-ielts": "IELTS Style",
  "quiz-toefl": "TOEFL Style",
  "quiz-toeic": "TOEIC Style",
  "quiz-celpip": "CELPIP Style",
};

const TYPE_EMOJI: Record<string, string> = {
  "practice-mcq": "🔤",
  "practice-fill": "✏️",
  "practice-dictation": "🎙️",
  "practice-short": "✍️",
  "practice-matching": "🔗",
  "practice-map": "🗺️",
  "practice-completion-note": "📝",
  "practice-completion-form": "📄",
  "practice-completion-table": "📊",
  "practice-completion-flow": "🔄",
  "practice-completion-sentence": "✏️",
  "exam-ielts": "🎓",
  "exam-toefl": "🎓",
  "exam-toeic": "🎓",
  "exam-celpip": "🎓",
  "quiz-ielts": "📝",
  "quiz-toefl": "📝",
  "quiz-toeic": "📝",
  "quiz-celpip": "📝",
};

const LEVEL_COLORS: Record<string, string> = {
  "Beginner": "bg-green-100 text-green-700",
  "Intermediate": "bg-yellow-100 text-yellow-700",
  "Advanced": "bg-red-100 text-red-700",
};

const IELTS_SECTION_LABELS: Record<number, string> = {
  1: "Section 1 — Everyday Conversation",
  2: "Section 2 — Social Monologue",
  3: "Section 3 — Academic Discussion",
  4: "Section 4 — Academic Lecture",
};

const PAGE_SIZE = 20;

export default function EpisodeScreen({ selectedLevel, practiceMode, isQuizMode, isExamMode, ieltsSection, onSelectEpisode, onBack }: Props) {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [completed, setCompleted] = useState<CompletedPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const buildQuery = useCallback(async (from: number, to: number) => {
    let query = supabase
      .from("episodes")
      .select("id, title, level, episode_type", { count: "exact" })
      .order("created_at", { ascending: true })
      .range(from, to);

    if (isExamMode) {
      query = query.in("episode_type", ["exam-ielts", "exam-toefl", "exam-toeic", "exam-celpip"]);
    } else if (isQuizMode) {
      query = query.in("episode_type", ["quiz-ielts", "quiz-toefl", "quiz-toeic", "quiz-celpip"]);
    } else if (ieltsSection) {
      query = query.eq("exam_type", "ielts").eq("exam_section", ieltsSection);
    } else {
      query = query.eq("level", selectedLevel);
      if (practiceMode === "mcq") query = query.eq("episode_type", "practice-mcq");
      else if (practiceMode === "fill-blank") query = query.eq("episode_type", "practice-fill");
      else if (practiceMode === "dictation") query = query.eq("episode_type", "practice-dictation");
      else if (practiceMode === "short-answer") query = query.eq("episode_type", "practice-short");
      else if (practiceMode === "matching") query = query.eq("episode_type", "practice-matching");
      else if (practiceMode === "map") query = query.eq("episode_type", "practice-map");
      else if (practiceMode === "completion-note") query = query.eq("episode_type", "practice-completion-note");
      else if (practiceMode === "completion-form") query = query.eq("episode_type", "practice-completion-form");
      else if (practiceMode === "completion-table") query = query.eq("episode_type", "practice-completion-table");
      else if (practiceMode === "completion-flow") query = query.eq("episode_type", "practice-completion-flow");
      else if (practiceMode === "completion-sentence") query = query.eq("episode_type", "practice-completion-sentence");
    }
    return query;
  }, [selectedLevel, practiceMode, isQuizMode, isExamMode, ieltsSection]);

  const fetchPractices = useCallback(async (pageNum: number, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const query = await buildQuery(from, to);
    const { data, error, count } = await query;
    if (!error && data) {
      setPractices(prev => reset ? data : [...prev, ...data]);
      if (count !== null) setTotalCount(count);
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    }
    if (reset) setLoading(false); else setLoadingMore(false);
  }, [buildQuery]);

  const fetchCompleted = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { data } = await supabase
        .from("user_results")
        .select("episode_id, score, total_questions")
        .eq("user_email", user.email);
      if (data) setCompleted(data);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { fetchPractices(0, true); fetchCompleted(); });
    return () => clearTimeout(timer);
  }, [fetchPractices, fetchCompleted]);

  function getTitle() {
    if (isExamMode) return "Full Exam Tests";
    if (isQuizMode) return "Exam Quiz";
    if (ieltsSection) return IELTS_SECTION_LABELS[ieltsSection] || `IELTS Section ${ieltsSection}`;
    const labels: Record<string, string> = {
      "mcq": "Multiple Choice", "fill-blank": "Fill in the Blank", "dictation": "Dictation",
      "short-answer": "Short Answer", "matching": "Matching", "map": "Map Labelling",
      "completion-note": "Note Completion", "completion-form": "Form Completion",
      "completion-table": "Table Completion", "completion-flow": "Flow Chart", "completion-sentence": "Sentence Completion",
    };
    return `${selectedLevel} — ${labels[practiceMode || ""] || "Practice"}`;
  }

  function getCompletionData(practiceId: string) {
    const result = completed.find(c => c.episode_id === practiceId);
    if (!result) return null;
    const pct = result.total_questions > 0 ? Math.round((result.score / result.total_questions) * 100) : 0;
    return { score: result.score, total: result.total_questions, pct };
  }

  const filtered = searchQuery.trim()
    ? practices.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : practices;

  const completedCount = practices.filter(p => completed.some(c => c.episode_id === p.id)).length;

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-4xl px-6 py-12">

        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={onBack} className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#7a6258] hover:text-[#3b2f2f]">
              ← Back
            </button>
            <h1 className="text-4xl font-bold">{getTitle()}</h1>
            {ieltsSection && (
              <p className="mt-2 text-sm text-[#7a6258]">
                🎧 IELTS Listening Practice
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <p className="text-[#7a6258]">{totalCount} {isExamMode ? "exams" : "practices"}</p>
              {completedCount > 0 && (
                <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                  ✓ {completedCount} completed
                </span>
              )}
              {completedCount > 0 && totalCount > 0 && (
                <span className="rounded-full bg-[#ead7cc] px-3 py-0.5 text-xs font-semibold text-[#3b2f2f]">
                  {Math.round((completedCount / totalCount) * 100)}% done
                </span>
              )}
            </div>
          </div>

          {totalCount > 0 && completedCount > 0 && (
            <div className="shrink-0 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] px-5 py-4 text-center shadow-sm">
              <p className="text-2xl font-bold">{completedCount}<span className="text-base text-[#7a6258]">/{totalCount}</span></p>
              <p className="text-xs text-[#7a6258]">completed</p>
              <div className="mt-2 h-1.5 w-20 rounded-full bg-[#ead7cc]">
                <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="🔍 Search practices..."
            className="w-full rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 text-sm shadow-sm focus:border-[#3b2f2f] focus:outline-none" />
        </div>

        {loading ? (
          <div className="mt-6 flex flex-col gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 w-full animate-pulse rounded-[2rem] bg-[#ead7cc]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-5xl">🎧</p>
            <p className="mt-4 text-lg font-semibold">
              {searchQuery ? "No results match your search" : "No content yet — check back soon!"}
            </p>
            <p className="mt-2 text-sm text-[#7a6258]">
              {searchQuery ? "Try a different keyword." : "New content is being added regularly."}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="mt-4 text-sm font-semibold text-[#7a6258] underline">Clear search</button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-3">
              {filtered.map((practice, index) => {
                const completion = getCompletionData(practice.id);
                const isCompleted = !!completion;
                return (
                  <button key={practice.id} onClick={() => onSelectEpisode(practice.id)}
                    className={`group flex items-center gap-4 rounded-[2rem] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isCompleted ? "border-green-200 bg-green-50 hover:bg-green-100" : "border-[#e0c7bb] bg-[#fffaf7] hover:bg-white"
                    }`}>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                      isCompleted ? "bg-green-500 text-white" : "bg-[#ead7cc] text-[#3b2f2f]"
                    }`}>
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-[#7a6258]">
                          {TYPE_EMOJI[practice.episode_type] || "🎧"} {TYPE_LABELS[practice.episode_type] || practice.episode_type}
                        </span>
                        {practice.level && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_COLORS[practice.level] || "bg-[#ead7cc] text-[#3b2f2f]"}`}>
                            {practice.level}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-bold truncate">{practice.title}</p>
                      {completion && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-green-200">
                            <div className={`h-1.5 rounded-full transition-all ${
                              completion.pct >= 80 ? "bg-green-500" :
                              completion.pct >= 60 ? "bg-yellow-400" : "bg-red-400"
                            }`} style={{ width: `${completion.pct}%` }} />
                          </div>
                          <span className={`text-xs font-semibold ${
                            completion.pct >= 80 ? "text-green-600" :
                            completion.pct >= 60 ? "text-yellow-600" : "text-red-600"
                          }`}>{completion.pct}%</span>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-[#c9a99a] transition group-hover:translate-x-1 group-hover:text-[#3b2f2f]">→</div>
                  </button>
                );
              })}
            </div>

            {!searchQuery && hasMore && (
              <button onClick={() => fetchPractices(page + 1)} disabled={loadingMore}
                className="mt-6 w-full rounded-2xl border border-[#e0c7bb] bg-white py-4 font-semibold text-[#3b2f2f] transition hover:bg-[#f1ded5] disabled:opacity-50">
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}

            {!searchQuery && !hasMore && practices.length > PAGE_SIZE && (
              <p className="mt-6 text-center text-sm text-[#7a6258]">All {totalCount} loaded ✓</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}