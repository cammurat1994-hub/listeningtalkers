"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  onBack: () => void;
};

type Question = {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanations: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
};

type PublishedEpisode = {
  id: string;
  title: string;
  level: string;
};

type VocabularyItem = {
  word: string;
  type: string;
  meaning: string;
  audioFile: File | null;
};

const ADMIN_EMAIL = "cammurat1994@gmail.com";

const createEmptyQuestion = (): Question => ({
  question: "",
  options: { A: "", B: "", C: "", D: "", E: "" },
  correctAnswer: "A",
  explanations: { A: "", B: "", C: "", D: "", E: "" },
});

const createEmptyVocabularyItem = (): VocabularyItem => ({
  word: "",
  type: "",
  meaning: "",
  audioFile: null,
});

export default function AdminScreen({ onBack }: Props) {
  const [level, setLevel] = useState("A1");
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [publishedEpisodes, setPublishedEpisodes] = useState<PublishedEpisode[]>([]);
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([
    createEmptyVocabularyItem(),
  ]);
  const [questions, setQuestions] = useState<Question[]>([
    createEmptyQuestion(),
    createEmptyQuestion(),
    createEmptyQuestion(),
    createEmptyQuestion(),
  ]);

  useEffect(() => {
    fetchEpisodes();
  }, []);

  async function fetchEpisodes() {
    const { data, error } = await supabase
      .from("episodes")
      .select("id, title, level")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPublishedEpisodes(data);
    }
  }

  function addVocabularyItem() {
    setVocabularyItems([...vocabularyItems, createEmptyVocabularyItem()]);
  }

  function removeVocabularyItem(index: number) {
    if (vocabularyItems.length <= 1) return;
    setVocabularyItems(vocabularyItems.filter((_, i) => i !== index));
  }

  function updateVocabularyItem(
    index: number,
    field: keyof VocabularyItem,
    value: string | File | null
  ) {
    const updatedItems = [...vocabularyItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setVocabularyItems(updatedItems);
  }

  function addQuestion() {
    if (questions.length >= 8) return;
    setQuestions([...questions, createEmptyQuestion()]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 4) return;
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, value: string) {
    const updatedQuestions = [...questions];
    updatedQuestions[index].question = value;
    setQuestions(updatedQuestions);
  }

  function updateOption(index: number, letter: "A" | "B" | "C" | "D" | "E", value: string) {
    const updatedQuestions = [...questions];
    updatedQuestions[index].options[letter] = value;
    setQuestions(updatedQuestions);
  }

  function updateExplanation(index: number, letter: "A" | "B" | "C" | "D" | "E", value: string) {
    const updatedQuestions = [...questions];
    updatedQuestions[index].explanations[letter] = value;
    setQuestions(updatedQuestions);
  }

  function updateCorrectAnswer(index: number, value: "A" | "B" | "C" | "D" | "E") {
    const updatedQuestions = [...questions];
    updatedQuestions[index].correctAnswer = value;
    setQuestions(updatedQuestions);
  }

  async function uploadAudioFile(file: File, folder: string) {
    const fileExtension = file.name.split(".").pop();
    const safeFileName = `${folder}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`;

    const { error } = await supabase.storage
      .from("audio-files")
      .upload(safeFileName, file, { cacheControl: "3600", upsert: false });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("audio-files").getPublicUrl(safeFileName);
    return data.publicUrl;
  }

  async function publishEpisode() {
    if (!title) {
      alert("Please enter episode title.");
      return;
    }

    if (!audioFile && !existingAudioUrl) {
      alert("Please upload main audio.");
      return;
    }

    setUploading(true);

    try {
      const audioUrl = audioFile
        ? await uploadAudioFile(audioFile, "episode")
        : existingAudioUrl;

      const formattedVocabulary = [];

      for (const item of vocabularyItems) {
        if (!item.word.trim()) continue;

        let vocabularyAudioUrl = "";
        if (item.audioFile) {
          vocabularyAudioUrl = await uploadAudioFile(item.audioFile, "vocab");
        }

        formattedVocabulary.push({
          word: item.word.trim(),
          type: item.type.trim(),
          meaning: item.meaning.trim(),
          audio_url: vocabularyAudioUrl,
        });
      }

      const formattedQuestions = questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanations: q.explanations,
      }));

      let dbError = null;

      if (editingEpisodeId) {
        const { error } = await supabase
          .from("episodes")
          .update({
            level,
            title,
            audio_url: audioUrl,
            questions: formattedQuestions,
            vocabulary: formattedVocabulary,
          })
          .eq("id", editingEpisodeId);

        dbError = error;
      } else {
        const { error } = await supabase.from("episodes").insert([
          {
            level,
            title,
            audio_url: audioUrl,
            questions: formattedQuestions,
            vocabulary: formattedVocabulary,
          },
        ]);

        dbError = error;
      }

      if (dbError) throw new Error(dbError.message);

      setTitle("");
      setEditingEpisodeId(null);
      setAudioFile(null);
      setExistingAudioUrl("");
      setVocabularyItems([createEmptyVocabularyItem()]);
      setQuestions([
        createEmptyQuestion(),
        createEmptyQuestion(),
        createEmptyQuestion(),
        createEmptyQuestion(),
      ]);

      await fetchEpisodes();
      alert("Episode published successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      alert("Publish failed: " + message);
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
            <p className="mt-2 text-[#7a6258]">
              Create episodes, upload audio, vocabulary and quiz questions.
            </p>
          </div>
          <button
            onClick={onBack}
            className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold shadow-sm"
          >
            Back
          </button>
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
          <h2 className="text-3xl font-bold">
            {editingEpisodeId ? "Edit Episode" : "Create New Episode"}
          </h2>

          <div className="mt-8 grid gap-6">
            <div>
              <label className="mb-2 block text-sm font-semibold">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4"
              >
                <option>A1</option>
                <option>A2</option>
                <option>B1</option>
                <option>B2</option>
                <option>C1</option>
                <option>C2</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Episode Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Episode 1 — The Lost Dog"
                className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Main Listening Audio</label>
              {existingAudioUrl && !audioFile && (
                <p className="mb-2 text-sm text-[#7a6258]">
                  Current audio will be kept. Upload a new file to replace it.
                </p>
              )}
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">Vocabulary Items</h2>
              <p className="mt-2 text-sm text-[#7a6258]">
                Add words, meanings and optional pronunciation audio.
              </p>
            </div>
            <button
              onClick={addVocabularyItem}
              className="rounded-2xl bg-[#3b2f2f] px-5 py-3 font-semibold text-white"
            >
              Add Vocabulary
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-6">
            {vocabularyItems.map((item, index) => (
              <div key={index} className="rounded-[1.5rem] border border-[#e0c7bb] bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-bold">Vocabulary {index + 1}</h3>
                  <button
                    onClick={() => removeVocabularyItem(index)}
                    disabled={vocabularyItems.length <= 1}
                    className="text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Word</label>
                    <input
                      type="text"
                      value={item.word}
                      onChange={(e) => updateVocabularyItem(index, "word", e.target.value)}
                      placeholder="acknowledge"
                      className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Type</label>
                    <input
                      type="text"
                      value={item.type}
                      onChange={(e) => updateVocabularyItem(index, "type", e.target.value)}
                      placeholder="verb"
                      className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Meaning</label>
                    <input
                      type="text"
                      value={item.meaning}
                      onChange={(e) => updateVocabularyItem(index, "meaning", e.target.value)}
                      placeholder="kabul etmek"
                      className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold">Pronunciation Audio</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      updateVocabularyItem(index, "audioFile", e.target.files?.[0] ?? null)
                    }
                    className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">Quiz Questions</h2>
              <p className="mt-2 text-sm text-[#7a6258]">
                Minimum 4 questions, maximum 8 questions.
              </p>
            </div>
            <button
              onClick={addQuestion}
              disabled={questions.length >= 8}
              className="rounded-2xl bg-[#3b2f2f] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Question
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-6">
            {questions.map((item, index) => (
              <div key={index} className="rounded-[1.5rem] border border-[#e0c7bb] bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-bold">Question {index + 1}</h3>
                  <button
                    onClick={() => removeQuestion(index)}
                    disabled={questions.length <= 4}
                    className="text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>

                <textarea
                  value={item.question}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder="Write your question..."
                  className="mt-4 min-h-[100px] w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4"
                />

                <div className="mt-4 flex flex-col gap-4">
                  {(["A", "B", "C", "D", "E"] as const).map((letter) => (
                    <div key={letter} className="rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ead7cc] font-bold">
                          {letter}
                        </div>
                        <input
                          type="text"
                          value={item.options[letter]}
                          onChange={(e) => updateOption(index, letter, e.target.value)}
                          placeholder={`Option ${letter}`}
                          className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-3"
                        />
                      </div>
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-semibold text-[#7a6258]">
                          Why is {letter} {item.correctAnswer === letter ? "correct" : "wrong"}?
                        </label>
                        <textarea
                          value={item.explanations[letter]}
                          onChange={(e) => updateExplanation(index, letter, e.target.value)}
                          placeholder={
                            item.correctAnswer === letter
                              ? `Explain why ${letter} is the correct answer...`
                              : `Explain why ${letter} is wrong...`
                          }
                          className="min-h-[80px] w-full rounded-2xl border border-[#e0c7bb] bg-white p-3 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold">Correct Answer</label>
                  <select
                    value={item.correctAnswer}
                    onChange={(e) =>
                      updateCorrectAnswer(index, e.target.value as "A" | "B" | "C" | "D" | "E")
                    }
                    className="w-full rounded-2xl border border-[#e0c7bb] bg-[#fffaf7] p-4"
                  >
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>D</option>
                    <option>E</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={publishEpisode}
            disabled={uploading}
            className="mt-8 w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? "Publishing..." : editingEpisodeId ? "Update Episode" : "Publish Episode"}
          </button>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm md:p-8">
          <h2 className="text-3xl font-bold">Published Episodes</h2>

          <div className="mt-6 flex flex-col gap-4">
            {publishedEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="flex items-center justify-between rounded-2xl border border-[#e0c7bb] bg-white p-5"
              >
                <div>
                  <p className="text-sm text-[#7a6258]">{episode.level}</p>
                  <h3 className="text-xl font-bold">{episode.title}</h3>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      const { data, error } = await supabase
                        .from("episodes")
                        .select("*")
                        .eq("id", episode.id)
                        .single();

                      if (error || !data) return;

                      setEditingEpisodeId(data.id);
                      setLevel(data.level);
                      setTitle(data.title);
                      setExistingAudioUrl(data.audio_url || "");
                      setAudioFile(null);

                      if (data.questions) {
                        const questionsWithExplanations = data.questions.map((q: Question) => ({
                          ...q,
                          explanations: q.explanations || { A: "", B: "", C: "", D: "", E: "" },
                        }));
                        setQuestions(questionsWithExplanations);
                      }

                      if (data.vocabulary) {
                        setVocabularyItems(
                          data.vocabulary.map((v: VocabularyItem) => ({
                            ...v,
                            audioFile: null,
                          }))
                        );
                      }

                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-2xl border border-[#e0c7bb] bg-white px-5 py-3 font-semibold"
                  >
                    Edit
                  </button>

                  <button
                    onClick={async () => {
                      const confirmed = confirm("Delete this episode?");
                      if (!confirmed) return;
                      await supabase.from("episodes").delete().eq("id", episode.id);
                      fetchEpisodes();
                    }}
                    className="rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}