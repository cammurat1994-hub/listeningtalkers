"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  onBack: () => void;
};

type EpisodeType = "practice-mcq" | "practice-fill" | "practice-dictation" | "quiz-ielts" | "quiz-toefl" | "quiz-toeic";

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

type VocabularyItem = {
  word: string;
  type: string;
  meaning: string;
  audioFile: File | null;
};

const EPISODE_TYPES = [
  { id: "practice-mcq", label: "Practice — Multiple Choice", emoji: "🔤", group: "practice" },
  { id: "practice-fill", label: "Practice — Fill in the Blank", emoji: "✏️", group: "practice" },
  { id: "practice-dictation", label: "Practice — Dictation", emoji: "🎙️", group: "practice" },
  { id: "quiz-ielts", label: "Quiz — IELTS Style", emoji: "📝", group: "quiz" },
  { id: "quiz-toefl", label: "Quiz — TOEFL Style", emoji: "📝", group: "quiz" },
  { id: "quiz-toeic", label: "Quiz — TOEIC Style", emoji: "📝", group: "quiz" },
];

const createEmptyMCQ = (): MCQQuestion => ({
  question: "",
  options: { A: "", B: "", C: "", D: "", E: "" },
  correctAnswer: "A",
  explanations: { A: "", B: "", C: "", D: "", E: "" },
});

const createEmptyFill = (): FillQuestion => ({
  text: "",
  blanks: [],
});

const createEmptyDictation = (): DictationQuestion => ({
  sentence: "",
});

const createEmptyVocab = (): VocabularyItem => ({
  word: "", type: "", meaning: "", audioFile: null,
});

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

  const [vocabItems, setVocabItems] = useState<VocabularyItem[]>([createEmptyVocab()]);
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([createEmptyMCQ(), createEmptyMCQ(), createEmptyMCQ(), createEmptyMCQ()]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");

  const [fillQuestions, setFillQuestions] = useState<FillQuestion[]>([createEmptyFill()]);
  const [dictationQuestions, setDictationQuestions] = useState<DictationQuestion[]>([createEmptyDictation()]);

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

      const formattedVocab = [];
      for (const item of vocabItems) {
        if (!item.word.trim()) continue;
        let vocabAudio = "";
        if (item.audioFile) vocabAudio = await uploadAudioFile(item.audioFile, "vocab");
        formattedVocab.push({ word: item.word.trim(), type: item.type.trim(), meaning: item.meaning.trim(), audio_url: vocabAudio });
      }

      let questions = null;
      if (episodeType === "practice-mcq" || episodeType.startsWith("quiz-")) {
        questions = mcqQuestions.map((q) => ({ ...q }));
      } else if (episodeType === "practice-fill") {
        questions = fillQuestions.map((q) => ({ ...q }));
      } else if (episodeType === "practice-dictation") {
        questions = dictationQuestions.map((q) => ({ ...q }));
      }

      const payload = { level, title, audio_url: audioUrl, episode_type: episodeType, questions, vocabulary: formattedVocab };

      let dbError = null;
      if (editingEpisodeId) {
        const { error } = await supabase.from("episodes").update(payload).eq("id", editingEpisodeId);
        dbError = error;
      } else {
        const { error } = await supabase.from("episodes").insert([payload]);
        dbError = error;
      }
      if (dbError) throw new Error(dbError.message);

      setTitle(""); setEditingEpisodeId(null); setAudioFile(null); setExistingAudioUrl("");
      setVocabItems([createEmptyVocab()]);
      setMcqQuestions([createEmptyMCQ(), createEmptyMCQ(), createEmptyMCQ(), createEmptyMCQ()]);
      setFillQuestions([createEmptyFill()]);
      setDictationQuestions([createEmptyDictation()]);
      await fetchEpisodes();
      alert("Episode published successfully.");
    } catch (err) {
      alert("Publish failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setUploading(false);
    }
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

        {/* Episode Type */}
        <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold">{editingEpisodeId ? "Edit Episode" : "Create New Episode"}</h2>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold">Episode Type</label>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7a6258]">Practice</p>
                <div className="flex flex-col gap-2">
                  {EPISODE_TYPES.filter(t => t.group === "practice").map((t) => (
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
                  {EPISODE_TYPES.filter(t => t.group === "quiz").map((t) => (
                    <button key={t.id} onClick={() => setEpisodeType(t.id as EpisodeType)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${episodeType === t.id ? "border-[#3b2f2f] bg-[#ead7cc]" : "border-[#e0c7bb] bg-white hover:bg-[#f1ded5]"}`}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
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

        {/* Vocabulary */}
        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Vocabulary</h2>
            <button onClick={() => setVocabItems([...vocabItems, createEmptyVocab()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add Word</button>
          </div>
          <div className="mt-6 flex flex-col gap-4">
            {vocabItems.map((item, i) => (
              <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Word {i + 1}</span>
                  <button onClick={() => vocabItems.length > 1 && setVocabItems(vocabItems.filter((_, j) => j !== i))} disabled={vocabItems.length <= 1} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {(["word", "type", "meaning"] as const).map((field) => (
                    <input key={field} type="text" value={item[field]} onChange={(e) => { const u = [...vocabItems]; u[i] = { ...u[i], [field]: e.target.value }; setVocabItems(u); }}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)} className="rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3" />
                  ))}
                </div>
                <input type="file" accept="audio/*" onChange={(e) => { const u = [...vocabItems]; u[i] = { ...u[i], audioFile: e.target.files?.[0] ?? null }; setVocabItems(u); }}
                  className="mt-3 w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3" />
              </div>
            ))}
          </div>
        </div>

        {/* MCQ Questions */}
        {(episodeType === "practice-mcq" || episodeType.startsWith("quiz-")) && (
          <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Questions</h2>
                <p className="mt-1 text-sm text-[#7a6258]">Min 4, max 8 questions.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setBulkMode(!bulkMode); setBulkError(""); }}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${bulkMode ? "bg-[#ead7cc]" : "border border-[#e0c7bb] bg-white"}`}>
                  {bulkMode ? "Manual" : "Bulk Paste"}
                </button>
                {!bulkMode && (
                  <button onClick={() => mcqQuestions.length < 8 && setMcqQuestions([...mcqQuestions, createEmptyMCQ()])}
                    disabled={mcqQuestions.length >= 8} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                    Add Question
                  </button>
                )}
              </div>
            </div>

            {bulkMode && (
              <div className="mt-6 rounded-2xl border border-[#e0c7bb] bg-white p-5">
                <p className="text-sm font-semibold">Format:</p>
                <pre className="mt-2 rounded-2xl bg-[#f7eee8] p-3 text-xs leading-6 text-[#7a6258]">{`Q) Soru\nA) Şık A\nB) Şık B\nC) Şık C\nD) Şık D\nE) Şık E\nCorrect) A\nEA) Neden A yanlış\nEB) Neden B yanlış\n\nQ) Sonraki soru...`}</pre>
                <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Soruları yapıştır..." className="mt-3 min-h-[280px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4 font-mono text-sm" />
                {bulkError && <p className="mt-2 text-sm text-red-600">{bulkError}</p>}
                <button onClick={() => {
                  setBulkError("");
                  const parsed = parseBulkMCQ(bulkText);
                  if (!parsed.length) { setBulkError("No questions found."); return; }
                  if (parsed.length < 4) { setBulkError(`Only ${parsed.length} question(s). Min is 4.`); return; }
                  if (parsed.length > 8) { setBulkError(`${parsed.length} questions. Max is 8.`); return; }
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
                      <button onClick={() => mcqQuestions.length > 4 && setMcqQuestions(mcqQuestions.filter((_, i) => i !== index))}
                        disabled={mcqQuestions.length <= 4} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                    </div>
                    <textarea value={item.question} onChange={(e) => { const u = [...mcqQuestions]; u[index].question = e.target.value; setMcqQuestions(u); }}
                      placeholder="Write your question..." className="mt-3 min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3" />
                    <div className="mt-4 flex flex-col gap-3">
                      {(["A","B","C","D","E"] as const).map((letter) => (
                        <div key={letter} className="rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ead7cc] text-sm font-bold">{letter}</span>
                            <input type="text" value={item.options[letter]} onChange={(e) => { const u = [...mcqQuestions]; u[index].options[letter] = e.target.value; setMcqQuestions(u); }}
                              placeholder={`Option ${letter}`} className="w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-sm" />
                          </div>
                          {item.correctAnswer !== letter && (
                            <textarea value={item.explanations[letter]} onChange={(e) => { const u = [...mcqQuestions]; u[index].explanations[letter] = e.target.value; setMcqQuestions(u); }}
                              placeholder={`Why is ${letter} wrong?`} className="mt-2 min-h-[60px] w-full rounded-xl border border-[#e0c7bb] bg-white p-2 text-xs" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-semibold">Correct Answer</label>
                      <select value={item.correctAnswer} onChange={(e) => { const u = [...mcqQuestions]; u[index].correctAnswer = e.target.value as "A"|"B"|"C"|"D"|"E"; setMcqQuestions(u); }}
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
                <p className="mt-1 text-sm text-[#7a6258]">Boşlukları ___ ile işaretle. Her ___ bir boşluktur.</p>
              </div>
              <button onClick={() => setFillQuestions([...fillQuestions, createEmptyFill()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add</button>
            </div>
            <div className="mt-6 flex flex-col gap-6">
              {fillQuestions.map((item, i) => (
                <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Paragraph {i + 1}</span>
                    <button onClick={() => fillQuestions.length > 1 && setFillQuestions(fillQuestions.filter((_, j) => j !== i))} disabled={fillQuestions.length <= 1} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                  </div>
                  <p className="mt-2 text-xs text-[#7a6258]">Boşluk bırakmak istediğin yere ___ yaz. Örn: "The weather was ___ and ___."</p>
                  <textarea value={item.text} onChange={(e) => {
                    const u = [...fillQuestions];
                    const text = e.target.value;
                    const blanks = (text.match(/___/g) || []).map((_, idx) => ({ index: idx, answer: u[i].blanks[idx]?.answer || "" }));
                    u[i] = { text, blanks };
                    setFillQuestions(u);
                  }} placeholder="The meeting was ___ at 3pm in the ___ room." className="mt-3 min-h-[100px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3" />
                  {item.blanks.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold">Doğru cevaplar:</p>
                      <div className="flex flex-col gap-2">
                        {item.blanks.map((blank, bi) => (
                          <div key={bi} className="flex items-center gap-3">
                            <span className="text-sm text-[#7a6258]">Boşluk {bi + 1}:</span>
                            <input type="text" value={blank.answer} onChange={(e) => {
                              const u = [...fillQuestions];
                              u[i].blanks[bi].answer = e.target.value;
                              setFillQuestions(u);
                            }} placeholder="Doğru cevap" className="flex-1 rounded-xl border border-[#e0c7bb] bg-[#fffaf7] p-2 text-sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                <p className="mt-1 text-sm text-[#7a6258]">Kullanıcının duyup yazacağı cümleleri gir.</p>
              </div>
              <button onClick={() => setDictationQuestions([...dictationQuestions, createEmptyDictation()])} className="rounded-2xl bg-[#3b2f2f] px-4 py-2 text-sm font-semibold text-white">Add</button>
            </div>
            <div className="mt-6 flex flex-col gap-4">
              {dictationQuestions.map((item, i) => (
                <div key={i} className="rounded-2xl border border-[#e0c7bb] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Sentence {i + 1}</span>
                    <button onClick={() => dictationQuestions.length > 1 && setDictationQuestions(dictationQuestions.filter((_, j) => j !== i))} disabled={dictationQuestions.length <= 1} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
                  </div>
                  <textarea value={item.sentence} onChange={(e) => { const u = [...dictationQuestions]; u[i].sentence = e.target.value; setDictationQuestions(u); }}
                    placeholder="The conference will be held next Monday at the downtown hotel." className="mt-3 min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-3" />
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
                  <p className="text-xs text-[#7a6258]">{ep.level} — {ep.episode_type}</p>
                  <p className="font-bold">{ep.title}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    const { data, error } = await supabase.from("episodes").select("*").eq("id", ep.id).single();
                    if (error || !data) return;
                    setEditingEpisodeId(data.id);
                    setEpisodeType(data.episode_type || "practice-mcq");
                    setLevel(data.level);
                    setTitle(data.title);
                    setExistingAudioUrl(data.audio_url || "");
                    setAudioFile(null);
                    if (data.questions) {
                      if (data.episode_type === "practice-fill") setFillQuestions(data.questions);
                      else if (data.episode_type === "practice-dictation") setDictationQuestions(data.questions);
                      else setMcqQuestions(data.questions.map((q: MCQQuestion) => ({ ...q, explanations: q.explanations || { A: "", B: "", C: "", D: "", E: "" } })));
                    }
                    if (data.vocabulary) setVocabItems(data.vocabulary.map((v: VocabularyItem) => ({ ...v, audioFile: null })));
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