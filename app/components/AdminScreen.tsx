"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  onBack: () => void;
};

type EpisodeType = "practice-mcq" | "practice-fill" | "practice-dictation" | "quiz-ielts" | "quiz-toefl" | "quiz-toeic" | "quiz-celpip";

type MCQQuestion = {
  question: string;
  options: { A: string; B: string; C: string; D: string; E: string };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanations: { A: string; B: string; C: string; D: string; E: string };
};

type FillQuestion = {
  text: string;
  blanks: { index: number; answer: string }[];
};

type DictationQuestion = {
  sentence: string;
};

type PublishedEpisode = {
  id: string;
  title: string;
  level: string;
  episode_type: EpisodeType;
};

const PRACTICE_TYPES = [
  { id: "practice-mcq", label: "Multiple Choice", emoji: "🔤" },
  { id: "practice-fill", label: "Fill in the Blank", emoji: "✏️" },
  { id: "practice-dictation", label: "Dictation", emoji: "🎙️" },
];

const QUIZ_TYPES = [
  { id: "quiz-ielts", label: "IELTS Style", emoji: "📝" },
  { id: "quiz-toefl", label: "TOEFL Style", emoji: "📝" },
  { id: "quiz-toeic", label: "TOEIC Style", emoji: "📝" },
  { id: "quiz-celpip", label: "CELPIP Style", emoji: "📝" },
];

const createEmptyMCQ = (): MCQQuestion => ({
  question: "",
  options: { A: "", B: "", C: "", D: "", E: "" },
  correctAnswer: "A",
  explanations: { A: "", B: "", C: "", D: "", E: "" },
});

const createEmptyFill = (): FillQuestion => ({ text: "", blanks: [] });
const createEmptyDictation = (): DictationQuestion => ({ sentence: "" });

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
      else if (/^EA[):.\s]/i.test(line)) q.explanations.A = line.replace(/^EA[):.\s]+/i, "").trim();
      else if (/^EB[):.\s]/i.test(line)) q.explanations.B = line.replace(/^EB[):.\s]+/i, "").trim();
      else if (/^EC[):.\s]/i.test(line)) q.explanations.C = line.replace(/^EC[):.\s]+/i, "").trim();
      else if (/^ED[):.\s]/i.test(line)) q.explanations.D = line.replace(/^ED[):.\s]+/i, "").trim();
      else if (/^EE[):.\s]/i.test(line)) q.explanations.E = line.replace(/^EE[):.\s]+/i, "").trim();
    }
    if (q.question) parsed.push(q);
  }
  return parsed;
}

export default function AdminScreen({ onBack }: Props) {
  const [episodeType, setEpisodeType] = useState<EpisodeType>("practice-mcq");
  const [level, setLevel] = useState("Beginner");
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [publishedEpisodes, setPublishedEpisodes] = useState<PublishedEpisode[]>([]);

  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([createEmptyMCQ()]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");

  const [fillQuestions, setFillQuestions] = useState<FillQuestion[]>([createEmptyFill()]);
  const [dictationQuestions, setDictationQuestions] = useState<DictationQuestion[]>([createEmptyDictation()]);

  const isPractice = episodeType.startsWith("practice-");

  useEffect(() => { fetchEpisodes(); }, []);

  async function fetchEpisodes() {
    const { data, error } = await supabase
      .from("episodes")
      .select("id, title, level, episode_type")
      .order("created_at", { ascending: false });
    if (!error && data) setPublishedEpisodes(data);
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

      let questions = null;
      if (episodeType === "practice-mcq" || episodeType.startsWith("quiz-")) {
        questions = mcqQuestions.filter(q => q.question.trim());
      } else if (episodeType === "practice-fill") {
        questions = fillQuestions.filter(q => q.text.trim());
      } else if (episodeType === "practice-dictation") {
        questions = dictationQuestions.filter(q => q.sentence.trim());
      }

      const payload = {
        level: isPractice ? level : null,
        title,
        audio_url: audioUrl,
        episode_type: episodeType,
        questions,
        vocabulary: [],
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
      alert("Episode published successfully.");
    } catch (err) {
      alert("Publish failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setTitle(""); setEditingEpisodeId(null); setAudioFile(null); setExistingAudioUrl("");
    setMcqQuestions([createEmptyMCQ()]);
    setFillQuestions([createEmptyFill()]);
    setDictationQuestions([createEmptyDictation()]);
    setBulkMode(false); setBulkText(""); setBulkError("");
  }

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

        {/* Episode Type + Info */}
        <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
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
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
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
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Questions</h2>
              <div className="flex gap-3">
                <button onClick={() => { setBulkMode(!bulkMode); setBulkError(""); }}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${bulkMode ? "bg-[#ead7cc]" : "border border-[#e0c7bb] bg-white"}`}>
                  {bulkMode ? "Manual" : "Bulk Paste"}
                </button>
                {!bulkMode && (
                  <button onClick={() => setMcqQuestions([...mcqQuestions, createEmptyMCQ()])}
                    className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">
                    Add Question
                  </button>
                )}
              </div>
            </div>

            {bulkMode && (
              <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-white p-5">
                <p className="text-sm font-semibold">Format:</p>
                <pre className="mt-2 rounded-2xl bg-[#f7eee8] p-3 text-xs leading-6 text-[#7a6258]">{`Q) Soru metni\nA) Şık A\nB) Şık B\nC) Şık C\nD) Şık D\nE) Şık E\nCorrect) A\nEA) A neden yanlış\nEB) B neden yanlış\n\nQ) Sonraki soru...`}</pre>
                <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Soruları yapıştır..." className="mt-3 min-h-[280px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 font-mono text-sm" />
                {bulkError && <p className="mt-2 text-sm text-red-600">{bulkError}</p>}
                <button onClick={() => {
                  setBulkError("");
                  const parsed = parseBulkMCQ(bulkText);
                  if (!parsed.length) { setBulkError("No questions found. Check the format."); return; }
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
                      <button onClick={() => setMcqQuestions(mcqQuestions.filter((_, i) => i !== index))}
                        className="text-sm text-red-600">Remove</button>
                    </div>
                    <textarea value={item.question} onChange={(e) => { const u = [...mcqQuestions]; u[index].question = e.target.value; setMcqQuestions(u); }}
                      placeholder="Write your question..." className="mt-3 min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3" />
                    <div className="mt-4 flex flex-col gap-3">
                      {(["A","B","C","D","E"] as const).map((letter) => (
                        <div key={letter} className="rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ead7cc] text-sm font-bold">{letter}</span>
                            <input type="text" value={item.options[letter]}
                              onChange={(e) => { const u = [...mcqQuestions]; u[index].options[letter] = e.target.value; setMcqQuestions(u); }}
                              placeholder={`Option ${letter}`} className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-sm" />
                          </div>
                          {item.correctAnswer !== letter && (
                            <textarea value={item.explanations[letter]}
                              onChange={(e) => { const u = [...mcqQuestions]; u[index].explanations[letter] = e.target.value; setMcqQuestions(u); }}
                              placeholder={`Why is ${letter} wrong?`} className="mt-2 min-h-[60px] w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-semibold">Correct Answer</label>
                      <select value={item.correctAnswer}
                        onChange={(e) => { const u = [...mcqQuestions]; u[index].correctAnswer = e.target.value as "A"|"B"|"C"|"D"|"E"; setMcqQuestions(u); }}
                        className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                        {["A","B","C","D","E"].map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fill in the Blank */}
        {episodeType === "practice-fill" && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Fill in the Blank</h2>
                <p className="mt-1 text-sm text-[#7a6258]">Boşlukları ___ ile işaretle.</p>
              </div>
              <button onClick={() => setFillQuestions([...fillQuestions, createEmptyFill()])}
                className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Paragraph</button>
            </div>

            <div className="mt-4 rounded-2xl bg-[#fffaf7] border border-[#e0c7bb] p-4 text-sm text-[#7a6258]">
              <p className="font-semibold mb-1">Bulk Paste Formatı:</p>
              <pre className="text-xs leading-6">{`TEXT) The meeting was ___ at 3pm in the ___ room.
ANS1) scheduled
ANS2) conference

TEXT) She ___ to work every day by ___.
ANS1) commutes
ANS2) bus`}</pre>
            </div>

            <div className="mt-4">
              <textarea
                placeholder={`TEXT) The meeting was ___ at 3pm.\nANS1) scheduled\n\nTEXT) She ___ to work by ___.\nANS1) commutes\nANS2) bus`}
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
                    const blanks = answerLines.map((l, idx) => ({
                      index: idx,
                      answer: l.replace(/^ANS\d+\)\s*/i, "").trim()
                    }));
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
                    <button onClick={() => fillQuestions.length > 1 && setFillQuestions(fillQuestions.filter((_, j) => j !== i))}
                      disabled={fillQuestions.length <= 1} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                  </div>
                  <p className="mt-2 text-sm text-[#7a6258]">{item.text || "—"}</p>
                  {item.blanks.map((b, bi) => (
                    <p key={bi} className="mt-1 text-xs text-[#7a6258]">Boşluk {bi + 1}: <strong>{b.answer}</strong></p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dictation */}
        {episodeType === "practice-dictation" && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Dictation</h2>
                <p className="mt-1 text-sm text-[#7a6258]">Kullanıcının duyup yazacağı cümle.</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[#fffaf7] border border-[#e0c7bb] p-4 text-sm text-[#7a6258]">
              <p className="font-semibold mb-1">Bulk Paste Formatı:</p>
              <pre className="text-xs leading-6">{`S) The conference will be held next Monday.\nS) Please submit your report by Friday afternoon.`}</pre>
            </div>

            <div className="mt-4">
              <textarea
                placeholder={`S) The conference will be held next Monday.\nS) Please submit your report by Friday.`}
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
                  <button onClick={() => dictationQuestions.length > 1 && setDictationQuestions(dictationQuestions.filter((_, j) => j !== i))}
                    disabled={dictationQuestions.length <= 1} className="ml-4 shrink-0 text-sm text-red-600 disabled:opacity-30">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={publishEpisode} disabled={uploading}
          className="mt-8 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424] disabled:opacity-40">
          {uploading ? "Publishing..." : editingEpisodeId ? "Update Episode" : "Publish Episode"}
        </button>

        {/* Published Episodes */}
        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold">Published Episodes</h2>
          <div className="mt-6 flex flex-col gap-3">
            {publishedEpisodes.map((ep) => (
              <div key={ep.id} className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white p-4">
                <div>
                  <p className="text-xs text-[#7a6258]">{ep.level ? `${ep.level} — ` : ""}{ep.episode_type}</p>
                  <p className="font-bold">{ep.title}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    const { data, error } = await supabase.from("episodes").select("*").eq("id", ep.id).single();
                    if (error || !data) return;
                    setEditingEpisodeId(data.id);
                    setEpisodeType(data.episode_type || "practice-mcq");
                    setLevel(data.level || "Beginner");
                    setTitle(data.title);
                    setExistingAudioUrl(data.audio_url || "");
                    setAudioFile(null);
                    if (data.questions) {
                      if (data.episode_type === "practice-fill") setFillQuestions(data.questions);
                      else if (data.episode_type === "practice-dictation") setDictationQuestions(data.questions);
                      else setMcqQuestions(data.questions.map((q: MCQQuestion) => ({ ...q, explanations: q.explanations || { A: "", B: "", C: "", D: "", E: "" } })));
                    }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }} className="rounded-2xl border border-[#e0c7bb] bg-white px-4 py-2 text-sm font-semibold">Edit</button>
                  <button onClick={async () => {
                    if (!confirm("Delete this episode?")) return;
                    await supabase.from("episodes").delete().eq("id", ep.id);
                    fetchEpisodes();
                  }} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}