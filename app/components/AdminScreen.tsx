"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = { onBack: () => void; };

type EpisodeType = "practice-mcq" | "practice-fill" | "practice-dictation" | "practice-short" | "practice-matching" | "quiz-ielts" | "quiz-toefl" | "quiz-toeic" | "quiz-celpip";
type MCQQuestion = { question: string; options: { A: string; B: string; C: string; D: string; E: string }; correctAnswer: "A"|"B"|"C"|"D"|"E"; explanation?: string; };
type FillQuestion = { text: string; blanks: { index: number; answer: string }[]; };
type DictationQuestion = { sentence: string; };
type ShortAnswerQuestion = { question: string; answer: string; hint?: string; };
type MatchingQuestion = { pairs: { left: string; right: string }[]; };
type PublishedEpisode = { id: string; title: string; level: string; episode_type: EpisodeType; };
type AdminTab = "new" | "manage" | "users";

const PRACTICE_TYPES = [
  { id: "practice-mcq", label: "Multiple Choice", emoji: "🔤" },
  { id: "practice-fill", label: "Fill in the Blank", emoji: "✏️" },
  { id: "practice-dictation", label: "Dictation", emoji: "🎙️" },
  { id: "practice-short", label: "Short Answer", emoji: "✍️" },
  { id: "practice-matching", label: "Matching", emoji: "🔗" },
];
const QUIZ_TYPES = [
  { id: "quiz-ielts", label: "IELTS Style", emoji: "📝" },
  { id: "quiz-toefl", label: "TOEFL Style", emoji: "📝" },
  { id: "quiz-toeic", label: "TOEIC Style", emoji: "📝" },
  { id: "quiz-celpip", label: "CELPIP Style", emoji: "📝" },
];
const ALL_TYPES = [...PRACTICE_TYPES, ...QUIZ_TYPES];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const createEmptyMCQ = (): MCQQuestion => ({ question: "", options: { A: "", B: "", C: "", D: "", E: "" }, correctAnswer: "A", explanation: "" });
const createEmptyFill = (): FillQuestion => ({ text: "", blanks: [] });
const createEmptyDictation = (): DictationQuestion => ({ sentence: "" });
const createEmptyShort = (): ShortAnswerQuestion => ({ question: "", answer: "", hint: "" });
const createEmptyMatching = (): MatchingQuestion => ({ pairs: [{ left: "", right: "" }, { left: "", right: "" }, { left: "", right: "" }] });

function parseBulkMCQ(raw: string): MCQQuestion[] {
  const blocks = raw.trim().split(/\n{2,}/);
  const parsed: MCQQuestion[] = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const q = createEmptyMCQ();
    for (const line of lines) {
      if (/^Q[):.\s]/i.test(line)) q.question = line.replace(/^Q[):.\s]+/i, "").trim();
      else if (/^A[):.\s]/i.test(line)) q.options.A = line.replace(/^A[):.\s]+/i, "").trim();
      else if (/^B[):.\s]/i.test(line)) q.options.B = line.replace(/^B[):.\s]+/i, "").trim();
      else if (/^C[):.\s]/i.test(line)) q.options.C = line.replace(/^C[):.\s]+/i, "").trim();
      else if (/^D[):.\s]/i.test(line)) q.options.D = line.replace(/^D[):.\s]+/i, "").trim();
      else if (/^E[):.\s]/i.test(line)) q.options.E = line.replace(/^E[):.\s]+/i, "").trim();
      else if (/^correct[):.\s]/i.test(line)) {
        const ans = line.replace(/^correct[):.\s]+/i, "").trim().toUpperCase();
        if (["A","B","C","D","E"].includes(ans)) q.correctAnswer = ans as "A"|"B"|"C"|"D"|"E";
      }
      else if (/^explanation[):.\s]/i.test(line)) q.explanation = line.replace(/^explanation[):.\s]+/i, "").trim();
    }
    if (q.question) parsed.push(q);
  }
  return parsed;
}

export default function AdminScreen({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("new");
  const [episodeType, setEpisodeType] = useState<EpisodeType>("practice-mcq");
  const [level, setLevel] = useState("Beginner");
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([createEmptyMCQ()]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [fillQuestions, setFillQuestions] = useState<FillQuestion[]>([createEmptyFill()]);
  const [dictationQuestions, setDictationQuestions] = useState<DictationQuestion[]>([createEmptyDictation()]);
  const [shortQuestions, setShortQuestions] = useState<ShortAnswerQuestion[]>([createEmptyShort()]);
  const [matchingQuestions, setMatchingQuestions] = useState<MatchingQuestion[]>([createEmptyMatching()]);
  const [publishedEpisodes, setPublishedEpisodes] = useState<PublishedEpisode[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<{ email: string; created_at: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPractice = episodeType.startsWith("practice-");

  useEffect(() => { fetchEpisodes(); }, []);

  async function fetchEpisodes() {
    const { data, error } = await supabase.from("episodes").select("id, title, level, episode_type").order("created_at", { ascending: false });
    if (!error && data) setPublishedEpisodes(data);
  }

  async function fetchUsers() {
    setLoadingUsers(true);
    const { data, error } = await supabase.from("user_results").select("user_email, created_at").order("created_at", { ascending: false });
    if (!error && data) {
      const unique = Array.from(new Map(data.map(u => [u.user_email, u])).values()).map(u => ({ email: u.user_email, created_at: u.created_at }));
      setUsers(unique);
    }
    setLoadingUsers(false);
  }

  async function uploadAudioFile(file: File, folder: string) {
    const ext = file.name.split(".").pop();
    const name = `${folder}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("audio-files").upload(name, file, { cacheControl: "3600", upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("audio-files").getPublicUrl(name);
    return data.publicUrl;
  }

  async function publishEpisode() {
    if (!title) { alert("Please enter episode title."); return; }
    if (!audioFile && !existingAudioUrl) { alert("Please upload main audio."); return; }
    setUploading(true);
    try {
      const audioUrl = audioFile ? await uploadAudioFile(audioFile, "episode") : existingAudioUrl;
      let questions: unknown = null;

      if (episodeType === "practice-mcq" || episodeType.startsWith("quiz-")) {
        if (bulkMode && bulkText.trim()) {
          const parsed = parseBulkMCQ(bulkText);
          if (!parsed.length) { alert("No questions found."); setUploading(false); return; }
          questions = parsed;
        } else {
          questions = mcqQuestions.filter(q => q.question.trim());
          if (!(questions as MCQQuestion[]).length) { alert("Please add at least one question."); setUploading(false); return; }
        }
      } else if (episodeType === "practice-fill") {
        questions = fillQuestions.filter(q => q.text.trim());
      } else if (episodeType === "practice-dictation") {
        questions = dictationQuestions.filter(q => q.sentence.trim());
      } else if (episodeType === "practice-short") {
        questions = shortQuestions.filter(q => q.question.trim() && q.answer.trim());
      } else if (episodeType === "practice-matching") {
        questions = matchingQuestions;
      }

      const payload = {
        level: isPractice ? level : null,
        title, audio_url: audioUrl, episode_type: episodeType,
        show_notes: episodeType === "practice-fill" ? showNotes : false,
        questions, vocabulary: [],
      };

      let dbError = null;
      if (editingEpisodeId) {
        const { error } = await supabase.from("episodes").update(payload).eq("id", editingEpisodeId);
        dbError = error;
      } else {
        const { error } = await supabase.from("episodes").insert([payload]);
        dbError = error;
      }
      if (dbError) throw new Error(dbError.message);
      resetForm();
      await fetchEpisodes();
      alert(editingEpisodeId ? "Episode updated!" : "Episode published!");
    } catch (err) {
      alert("Failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setTitle(""); setEditingEpisodeId(null); setAudioFile(null); setExistingAudioUrl("");
    setShowNotes(false);
    setMcqQuestions([createEmptyMCQ()]); setFillQuestions([createEmptyFill()]);
    setDictationQuestions([createEmptyDictation()]); setShortQuestions([createEmptyShort()]);
    setMatchingQuestions([createEmptyMatching()]);
    setBulkMode(false); setBulkText(""); setBulkError("");
  }

  async function handleEdit(epId: string) {
    const { data, error } = await supabase.from("episodes").select("*").eq("id", epId).single();
    if (error || !data) return;
    setEditingEpisodeId(data.id);
    setEpisodeType(data.episode_type || "practice-mcq");
    setLevel(data.level || "Beginner");
    setTitle(data.title);
    setExistingAudioUrl(data.audio_url || "");
    setShowNotes(data.show_notes || false);
    setAudioFile(null);
    setBulkMode(false); setBulkText(""); setBulkError("");
    if (data.questions) {
      if (data.episode_type === "practice-fill") setFillQuestions(data.questions);
      else if (data.episode_type === "practice-dictation") setDictationQuestions(data.questions);
      else if (data.episode_type === "practice-short") setShortQuestions(data.questions);
      else if (data.episode_type === "practice-matching") setMatchingQuestions(data.questions);
      else setMcqQuestions(data.questions.map((q: MCQQuestion) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      })));
    }
    setActiveTab("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filteredEpisodes = publishedEpisodes.filter(ep => {
    const matchType = filterType === "all" || ep.episode_type === filterType;
    const matchLevel = filterLevel === "all" || ep.level === filterLevel;
    const matchSearch = ep.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchLevel && matchSearch;
  });

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto max-w-5xl px-6 py-12">

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">Admin Panel</h1>
            <p className="mt-2 text-[#7a6258]">Create and manage episodes.</p>
          </div>
          <button onClick={onBack} className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold shadow-sm">Back</button>
        </div>

        <div className="mt-8 flex gap-3">
          {[
            { id: "new", label: editingEpisodeId ? "✏️ Edit Episode" : "➕ New Episode" },
            { id: "manage", label: `📋 Manage (${publishedEpisodes.length})` },
            { id: "users", label: "👥 Users" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as AdminTab); if (tab.id === "users") fetchUsers(); }}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${activeTab === tab.id ? "bg-[#3b2f2f] text-white" : "border border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "new" && (
          <div className="mt-8">
            <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-bold">{editingEpisodeId ? "Edit Episode" : "New Episode"}</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7a6258]">Practice</p>
                  <div className="flex flex-col gap-2">
                    {PRACTICE_TYPES.map((t) => (
                      <button key={t.id} onClick={() => setEpisodeType(t.id as EpisodeType)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${episodeType === t.id ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7a6258]">Quiz</p>
                  <div className="flex flex-col gap-2">
                    {QUIZ_TYPES.map((t) => (
                      <button key={t.id} onClick={() => setEpisodeType(t.id as EpisodeType)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${episodeType === t.id ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                {isPractice && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Level</label>
                    <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-2 block text-sm font-semibold">Episode Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episode 1 — The Job Interview" className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Main Audio</label>
                  {existingAudioUrl && !audioFile && <p className="mb-2 text-sm text-[#7a6258]">Current audio kept. Upload new to replace.</p>}
                  <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4" />
                </div>
              </div>
            </div>

            {/* MCQ */}
            {(episodeType === "practice-mcq" || episodeType.startsWith("quiz-")) && (
              <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold">Questions</h2>
                  <div className="flex gap-3">
                    <button onClick={() => { setBulkMode(!bulkMode); setBulkError(""); }}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${bulkMode ? "bg-[#ead7cc]" : "border border-[#e0c7bb] bg-white"}`}>
                      {bulkMode ? "Manual" : "Bulk Paste"}
                    </button>
                    {!bulkMode && <button onClick={() => setMcqQuestions([...mcqQuestions, createEmptyMCQ()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Question</button>}
                  </div>
                </div>

                {bulkMode && (
                  <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-white p-5">
                    <p className="text-sm font-semibold">Format:</p>
                    <pre className="mt-2 rounded-2xl bg-[#f7eee8] p-3 text-xs leading-6 text-[#7a6258]">{`Q) Soru metni\nA) Şık A\nB) Şık B\nC) Şık C\nD) Şık D\nE) Şık E\nCorrect) C\nExplanation) Doğru cevap neden doğru...\n\nQ) Sonraki soru...`}</pre>
                    <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Soruları yapıştır..." className="mt-3 min-h-[280px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 font-mono text-sm" />
                    {bulkError && <p className="mt-2 text-sm text-red-600">{bulkError}</p>}
                    <button onClick={() => {
                      setBulkError("");
                      const parsed = parseBulkMCQ(bulkText);
                      if (!parsed.length) { setBulkError("No questions found."); return; }
                      setMcqQuestions(parsed); setBulkMode(false); setBulkText("");
                    }} className="mt-3 w-full rounded-2xl bg-[#3b2f2f] px-6 py-3 font-semibold text-white">Apply</button>
                  </div>
                )}

                {!bulkMode && (
                  <div className="mt-6 flex flex-col gap-6">
                    {mcqQuestions.map((item, index) => (
                      <div key={index} className="rounded-2xl border border-[#e0c7bb] bg-white p-5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Question {index + 1}</span>
                          <button onClick={() => setMcqQuestions(mcqQuestions.filter((_, i) => i !== index))} className="text-sm text-red-600">Remove</button>
                        </div>
                        <textarea value={item.question} onChange={(e) => { const u = [...mcqQuestions]; u[index].question = e.target.value; setMcqQuestions(u); }} placeholder="Write your question..." className="mt-3 min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3" />
                        <div className="mt-4 flex flex-col gap-2">
                          {(["A","B","C","D","E"] as const).map((letter) => (
                            <div key={letter} className="flex items-center gap-3 rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${item.correctAnswer === letter ? "bg-green-200 text-green-800" : "bg-[#ead7cc]"}`}>{letter}</span>
                              <input type="text" value={item.options[letter]} onChange={(e) => { const u = [...mcqQuestions]; u[index].options[letter] = e.target.value; setMcqQuestions(u); }} placeholder={`Option ${letter}`} className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-sm" />
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-sm font-semibold">Correct Answer</label>
                          <select value={item.correctAnswer} onChange={(e) => { const u = [...mcqQuestions]; u[index].correctAnswer = e.target.value as "A"|"B"|"C"|"D"|"E"; setMcqQuestions(u); }} className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                            {["A","B","C","D","E"].map(l => <option key={l}>{l}</option>)}
                          </select>
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-sm font-semibold">Explanation <span className="text-[#7a6258] font-normal">(doğru cevap neden doğru?)</span></label>
                          <textarea value={item.explanation || ""} onChange={(e) => { const u = [...mcqQuestions]; u[index].explanation = e.target.value; setMcqQuestions(u); }} placeholder="The speaker said '...' which means the correct answer is C because..." className="min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fill in the Blank */}
            {episodeType === "practice-fill" && (
              <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Fill in the Blank</h2>
                    <p className="mt-1 text-sm text-[#7a6258]">Boşlukları ___ ile işaretle.</p>
                  </div>
                  <button onClick={() => setFillQuestions([...fillQuestions, createEmptyFill()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Paragraph</button>
                </div>
                <label className="mt-5 flex items-center gap-3 text-sm font-semibold">
                  <input type="checkbox" checked={showNotes} onChange={(e) => setShowNotes(e.target.checked)} className="h-4 w-4" />
                  Show notes field (Advanced episodes için önerilir)
                </label>
                <div className="mt-5 rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm text-[#7a6258]">
                  <p className="font-semibold mb-1">Bulk Paste Formatı:</p>
                  <pre className="text-xs leading-6">{`TEXT) The meeting was ___ at 3pm in the ___ room.\nANS1) scheduled\nANS2) conference room|boardroom`}</pre>
                </div>
                <div className="mt-4">
                  <textarea placeholder={`TEXT) The meeting was ___ at 3pm.\nANS1) scheduled|planned`}
                    className="min-h-[200px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 font-mono text-sm"
                    onChange={(e) => {
                      const raw = e.target.value;
                      const blocks = raw.trim().split(/\n{2,}/);
                      const parsed: FillQuestion[] = [];
                      for (const block of blocks) {
                        const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
                        const textLine = lines.find(l => /^TEXT\)/i.test(l));
                        if (!textLine) continue;
                        const text = textLine.replace(/^TEXT\)\s*/i, "");
                        const answerLines = lines.filter(l => /^ANS\d+\)/i.test(l));
                        const blanks = answerLines.map((l, idx) => ({ index: idx, answer: l.replace(/^ANS\d+\)\s*/i, "").trim() }));
                        parsed.push({ text, blanks });
                      }
                      if (parsed.length) setFillQuestions(parsed);
                    }}
                  />
                </div>
                <div className="mt-6 flex flex-col gap-4">
                  {fillQuestions.map((item, i) => (
                    <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Paragraph {i + 1}</span>
                        <button onClick={() => fillQuestions.length > 1 && setFillQuestions(fillQuestions.filter((_, j) => j !== i))} disabled={fillQuestions.length <= 1} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                      </div>
                      <p className="mt-2 text-sm text-[#7a6258]">{item.text || "—"}</p>
                      {item.blanks.map((b, bi) => <p key={bi} className="mt-1 text-xs text-[#7a6258]">Boşluk {bi + 1}: <strong>{b.answer}</strong></p>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dictation */}
            {episodeType === "practice-dictation" && (
              <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <h2 className="text-2xl font-bold">Dictation</h2>
                <p className="mt-1 text-sm text-[#7a6258]">Kullanıcının duyup yazacağı cümle.</p>
                <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm text-[#7a6258]">
                  <p className="font-semibold mb-1">Bulk Paste Formatı:</p>
                  <pre className="text-xs leading-6">{`S) The conference will be held next Monday.\nS) The colour|color of the sky is blue.`}</pre>
                </div>
                <div className="mt-4">
                  <textarea placeholder={`S) The conference will be held next Monday.`}
                    className="min-h-[150px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 font-mono text-sm"
                    onChange={(e) => {
                      const lines = e.target.value.split("\n").map(l => l.trim()).filter(l => /^S\)/i.test(l));
                      const parsed = lines.map(l => ({ sentence: l.replace(/^S\)\s*/i, "").trim() }));
                      if (parsed.length) setDictationQuestions(parsed);
                    }}
                  />
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {dictationQuestions.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <p className="text-sm">{item.sentence || "—"}</p>
                      <button onClick={() => dictationQuestions.length > 1 && setDictationQuestions(dictationQuestions.filter((_, j) => j !== i))} disabled={dictationQuestions.length <= 1} className="ml-4 shrink-0 text-sm text-red-600 disabled:opacity-30">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Short Answer */}
            {episodeType === "practice-short" && (
              <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Short Answer</h2>
                    <p className="mt-1 text-sm text-[#7a6258]">Kullanıcı 1-3 kelimeyle yanıtlar.</p>
                  </div>
                  <button onClick={() => setShortQuestions([...shortQuestions, createEmptyShort()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Question</button>
                </div>
                <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm text-[#7a6258]">
                  <p className="font-semibold mb-1">Bulk Paste Formatı:</p>
                  <pre className="text-xs leading-6">{`Q) What time does the library close on Fridays?\nA) 9pm|nine o'clock\nH) Think about closing times\n\nQ) Where does the meeting take place?\nA) conference room`}</pre>
                  <p className="mt-2 text-xs">H) opsiyonel ipucu. A) için | ile alternatif cevap ekle.</p>
                </div>
                <div className="mt-4">
                  <textarea placeholder={`Q) What time does the library close?\nA) 9pm|nine\nH) Think about closing times`}
                    className="min-h-[150px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 font-mono text-sm"
                    onChange={(e) => {
                      const blocks = e.target.value.trim().split(/\n{2,}/);
                      const parsed: ShortAnswerQuestion[] = [];
                      for (const block of blocks) {
                        const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
                        const qLine = lines.find(l => /^Q\)/i.test(l));
                        const aLine = lines.find(l => /^A\)/i.test(l));
                        const hLine = lines.find(l => /^H\)/i.test(l));
                        if (!qLine || !aLine) continue;
                        parsed.push({
                          question: qLine.replace(/^Q\)\s*/i, "").trim(),
                          answer: aLine.replace(/^A\)\s*/i, "").trim(),
                          hint: hLine ? hLine.replace(/^H\)\s*/i, "").trim() : "",
                        });
                      }
                      if (parsed.length) setShortQuestions(parsed);
                    }}
                  />
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  {shortQuestions.map((item, i) => (
                    <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Question {i + 1}</span>
                        <button onClick={() => shortQuestions.length > 1 && setShortQuestions(shortQuestions.filter((_, j) => j !== i))} disabled={shortQuestions.length <= 1} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                      </div>
                      <input type="text" value={item.question} onChange={(e) => { const u = [...shortQuestions]; u[i].question = e.target.value; setShortQuestions(u); }} placeholder="What time does the library close on Fridays?" className="mt-3 w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                      <input type="text" value={item.answer} onChange={(e) => { const u = [...shortQuestions]; u[i].answer = e.target.value; setShortQuestions(u); }} placeholder="Doğru cevap — | ile alternatif: 9pm|nine" className="mt-2 w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                      <input type="text" value={item.hint || ""} onChange={(e) => { const u = [...shortQuestions]; u[i].hint = e.target.value; setShortQuestions(u); }} placeholder="İpucu (opsiyonel)" className="mt-2 w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matching */}
            {episodeType === "practice-matching" && (
              <div className="mt-6 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Matching</h2>
                    <p className="mt-1 text-sm text-[#7a6258]">Sol listeyi sağ listeyle eşleştir.</p>
                  </div>
                  <button onClick={() => setMatchingQuestions([...matchingQuestions, createEmptyMatching()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Set</button>
                </div>
                <div className="mt-4 rounded-2xl border border-[#e0c7bb] bg-white p-4 text-sm text-[#7a6258]">
                  <p className="font-semibold mb-1">Bulk Paste Formatı:</p>
                  <pre className="text-xs leading-6">{`L) Monday\nR) The first day of the week\n\nL) Tuesday\nR) The second day of the week`}</pre>
                  <p className="mt-2 text-xs">L) sol taraf, R) sağ taraf. Her çift arasına boş satır bırak.</p>
                </div>
                <div className="mt-4">
                  <textarea placeholder={`L) Monday\nR) The first day of the week\n\nL) Tuesday\nR) The second day of the week`}
                    className="min-h-[200px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-4 font-mono text-sm"
                    onChange={(e) => {
                      const blocks = e.target.value.trim().split(/\n{2,}/);
                      const pairs: { left: string; right: string }[] = [];
                      for (const block of blocks) {
                        const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
                        const lLine = lines.find(l => /^L\)/i.test(l));
                        const rLine = lines.find(l => /^R\)/i.test(l));
                        if (!lLine || !rLine) continue;
                        pairs.push({
                          left: lLine.replace(/^L\)\s*/i, "").trim(),
                          right: rLine.replace(/^R\)\s*/i, "").trim(),
                        });
                      }
                      if (pairs.length) setMatchingQuestions([{ pairs }]);
                    }}
                  />
                </div>
                <div className="mt-4 flex flex-col gap-6">
                  {matchingQuestions.map((mq, mi) => (
                    <div key={mi} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold">Set {mi + 1}</span>
                        <div className="flex gap-3">
                          <button onClick={() => { const u = [...matchingQuestions]; u[mi].pairs.push({ left: "", right: "" }); setMatchingQuestions(u); }} className="text-sm font-semibold text-[#3b2f2f]">+ Add Pair</button>
                          {matchingQuestions.length > 1 && <button onClick={() => setMatchingQuestions(matchingQuestions.filter((_, j) => j !== mi))} className="text-sm text-red-600">Remove Set</button>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <span className="text-xs font-bold text-[#7a6258]">SOL</span>
                        <span className="text-xs font-bold text-[#7a6258]">SAĞ</span>
                      </div>
                      {mq.pairs.map((pair, pi) => (
                        <div key={pi} className="mt-2 grid grid-cols-2 gap-2">
                          <input type="text" value={pair.left} onChange={(e) => { const u = [...matchingQuestions]; u[mi].pairs[pi].left = e.target.value; setMatchingQuestions(u); }} placeholder={`Item ${pi + 1}`} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                          <input type="text" value={pair.right} onChange={(e) => { const u = [...matchingQuestions]; u[mi].pairs[pi].right = e.target.value; setMatchingQuestions(u); }} placeholder={`Match ${pi + 1}`} className="rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={publishEpisode} disabled={uploading} className="mt-8 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424] disabled:opacity-40">
              {uploading ? "Publishing..." : editingEpisodeId ? "Update Episode" : "Publish Episode"}
            </button>
            {editingEpisodeId && (
              <button onClick={resetForm} className="mt-3 w-full rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f]">Cancel Edit</button>
            )}
          </div>
        )}

        {/* MANAGE TAB */}
        {activeTab === "manage" && (
          <div className="mt-8">
            <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Episodes</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 Search by title..." className="rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm" />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm">
                  <option value="all">All Types</option>
                  {ALL_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
                </select>
                <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm">
                  <option value="all">All Levels</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <p className="mt-3 text-sm text-[#7a6258]">{filteredEpisodes.length} episode found</p>
              <div className="mt-4 flex flex-col gap-3">
                {filteredEpisodes.map((ep) => (
                  <div key={ep.id} className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white p-4">
                    <div>
                      <p className="text-xs text-[#7a6258]">{ep.level ? `${ep.level} — ` : ""}{ALL_TYPES.find(t => t.id === ep.episode_type)?.label || ep.episode_type}</p>
                      <p className="font-bold">{ep.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(ep.id)} className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold">Edit</button>
                      <button onClick={async () => { if (!confirm("Delete this episode?")) return; await supabase.from("episodes").delete().eq("id", ep.id); fetchEpisodes(); }} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
                    </div>
                  </div>
                ))}
                {filteredEpisodes.length === 0 && <p className="py-8 text-center text-[#7a6258]">No episodes found.</p>}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="mt-8">
            <div className="rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Users</h2>
                  <p className="mt-1 text-sm text-[#7a6258]">{users.length} registered users</p>
                </div>
                <button onClick={() => { const emails = users.map(u => u.email).join("\n"); navigator.clipboard.writeText(emails); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">
                  {copied ? "Copied ✓" : "Copy All Emails"}
                </button>
              </div>
              {loadingUsers ? <p className="mt-6 text-center text-[#7a6258]">Loading...</p> : (
                <div className="mt-6 flex flex-col gap-2">
                  {users.map((user, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white px-4 py-3">
                      <p className="text-sm font-semibold">{user.email}</p>
                      <p className="text-xs text-[#7a6258]">{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {users.length === 0 && <p className="py-8 text-center text-[#7a6258]">No users yet.</p>}
                </div>
              )}
            </div>
          </div>
        )}

      </section>
    </main>
  );
}