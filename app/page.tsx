"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import LoginScreen from "./components/LoginScreen";
import HomeScreen from "./components/HomeScreen";
import EpisodeScreen from "./components/EpisodeScreen";
import PracticeScreen from "./components/PracticeScreen";
import AdminScreen from "./components/AdminScreen";
import ModeSelectionScreen from "./components/ModeSelectionScreen";
import CompletionTypeScreen from "./components/CompletionTypeScreen";
import MyProgressScreen from "./components/MyProgressScreen";
import LoadingScreen from "./components/LoadingScreen";
import IELTSSectionScreen from "./components/IELTSSectionScreen";
import ExamSelectionScreen from "./components/ExamSelectionScreen";
import ExamIntro from "./Exam/ExamIntro";
import IELTSExam from "./Exam/IELTSExam";
import ExamResults from "./Exam/ExamResults";

type Screen =
  | "login" | "home" | "episodes"
  | "mode-selection" | "completion-type" | "practice" | "quiz"
  | "progress" | "admin"
  | "exam-selection" | "exam-list" | "exam-intro" | "exam-running" | "exam-results"
  | "ielts-sections";

type PracticeMode =
  | "mcq" | "fill-blank" | "dictation" | "short-answer" | "matching" | "map"
  | "completion-note" | "completion-form" | "completion-table" | "completion-flow" | "completion-sentence"
  | null;

type ExamSection = {
  number: number;
  audioUrl: string;
  questionGroups: { type: string; label: string; data: unknown }[];
};

type ExamEpisode = {
  id: string;
  title: string;
  episode_type: string;
  sections: ExamSection[];
  pdf_url?: string;
};

const ADMIN_EMAIL = "cammurat1994@gmail.com";

function UserPanel({ userEmail, onNavigate, onLogout }: {
  userEmail: string;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  if (!userEmail) return null;
  const isAdmin = userEmail === ADMIN_EMAIL;

  return (
    <div className="fixed right-5 top-5 z-50">
      <button onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-3 rounded-full bg-[#1e2d4a] px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-[#162038]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1e2d4a]">
          {isAdmin ? "A" : userEmail.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">Account</span>
        <span>▾</span>
      </button>
      {isMenuOpen && (
        <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-[#c8d5e8] bg-white shadow-2xl">
          <div className="border-b border-[#c8d5e8] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4a5568]">{isAdmin ? "Administrator" : "Signed in"}</p>
            <p className="mt-1 truncate text-sm font-bold text-[#1e2d4a]">{userEmail}</p>
          </div>
          {isAdmin && (
            <button onClick={() => { onNavigate("admin"); setIsMenuOpen(false); }}
              className="flex w-full items-center gap-3 border-b border-[#c8d5e8] px-5 py-4 text-left font-semibold text-[#1e2d4a] transition hover:bg-[#f0f2f5]">
              🛡️ Admin
            </button>
          )}
          <button onClick={() => { onNavigate("progress"); setIsMenuOpen(false); }}
            className="flex w-full items-center gap-3 border-b border-[#c8d5e8] px-5 py-4 text-left font-semibold text-[#1e2d4a] transition hover:bg-[#f0f2f5]">
            📊 My Progress
          </button>
          <button onClick={() => { onLogout(); setIsMenuOpen(false); }}
            className="flex w-full items-center gap-3 px-5 py-4 text-left font-semibold text-[#1e2d4a] transition hover:bg-[#f0f2f5]">
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedLevel] = useState("Intermediate");
  const [selectedPracticeId, setSelectedPracticeId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(null);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [selectedIELTSSection, setSelectedIELTSSection] = useState<number | null>(null);
  const [currentExam, setCurrentExam] = useState<ExamEpisode | null>(null);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) { setUserEmail(user.email); setScreen("home"); }
      setLoading(false);
    }
    getUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUserEmail(""); setScreen("login");
  }

  function goTo(s: Screen) { setScreen(s); }
  function navigateTo(s: Screen) { setScreen(s); }

  function handleNavigateToSection(section: number) {
    setSelectedIELTSSection(section);
    goTo("episodes");
  }

  function handleNavigateHome() {
    setSelectedIELTSSection(null);
    goTo("home");
  }

  async function loadExam(practiceId: string) {
    const { data, error } = await supabase.from("episodes").select("*").eq("id", practiceId).single();
    if (!error && data) {
      setCurrentExam({ id: data.id, title: data.title, episode_type: data.episode_type, sections: data.sections || [], pdf_url: data.pdf_url || undefined });
      setExamAnswers({});
      goTo("exam-intro");
    }
  }

  if (loading) return <LoadingScreen />;

  if (screen === "exam-intro" && currentExam) {
    const examTypeLabel = currentExam.episode_type.replace("exam-", "").toUpperCase();
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <ExamIntro title={currentExam.title} examType={examTypeLabel} sections={currentExam.sections} pdfUrl={currentExam.pdf_url} onStart={() => goTo("exam-running")} onBack={() => goTo("exam-list")} />
      </>
    );
  }

  if (screen === "exam-running" && currentExam) {
    const examTypeLabel = currentExam.episode_type.replace("exam-", "").toUpperCase();
    return (
      <IELTSExam title={currentExam.title} examType={examTypeLabel} sections={currentExam.sections} answers={examAnswers} onUpdateAnswers={setExamAnswers} onFinish={() => goTo("exam-results")} onBack={() => goTo("exam-intro")} />
    );
  }

  if (screen === "exam-results" && currentExam) {
    const examTypeLabel = currentExam.episode_type.replace("exam-", "").toUpperCase();
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <ExamResults title={currentExam.title} examType={examTypeLabel} sections={currentExam.sections} answers={examAnswers} onBack={() => goTo("exam-list")} onRetry={() => { setExamAnswers({}); goTo("exam-intro"); }} />
      </>
    );
  }

  if (screen === "exam-list") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <EpisodeScreen selectedLevel="" practiceMode={null} isQuizMode={false} isExamMode={true} onSelectEpisode={(id) => loadExam(id)} onBack={() => goTo("exam-selection")} />
      </>
    );
  }

  if (screen === "exam-selection") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <ExamSelectionScreen
          mode={isQuizMode ? "exam" : "practice"}
          onSelectIELTS={() => isQuizMode ? goTo("exam-list") : goTo("ielts-sections")}
          onBack={() => goTo("home")}
        />
      </>
    );
  }

  if (screen === "ielts-sections") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <IELTSSectionScreen
          userEmail={userEmail}
        onSelectSection={(section: number) => { setSelectedIELTSSection(section); goTo("episodes"); }}
          onBack={() => goTo("exam-selection")}
        />
      </>
    );
  }

  if (screen === "admin" && userEmail !== ADMIN_EMAIL) {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <main className="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
          <div className="rounded-3xl border border-[#c8d5e8] bg-white p-10 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
            <p className="mt-4 text-[#4a5568]">You are not authorized to access the admin panel.</p>
          </div>
        </main>
      </>
    );
  }

  if (screen === "admin") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <AdminScreen onBack={() => goTo("home")} />
      </>
    );
  }

  if (screen === "progress") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <MyProgressScreen onBack={() => goTo("home")} onSelectEpisode={(id) => { setSelectedPracticeId(id); goTo("practice"); }} />
      </>
    );
  }

  if (screen === "completion-type") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <CompletionTypeScreen
          onSelectNote={() => { setPracticeMode("completion-note"); goTo("episodes"); }}
          onSelectForm={() => { setPracticeMode("completion-form"); goTo("episodes"); }}
          onSelectTable={() => { setPracticeMode("completion-table"); goTo("episodes"); }}
          onSelectFlow={() => { setPracticeMode("completion-flow"); goTo("episodes"); }}
          onSelectSentence={() => { setPracticeMode("completion-sentence"); goTo("episodes"); }}
          onBack={() => goTo("mode-selection")}
        />
      </>
    );
  }

  if (screen === "mode-selection") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <ModeSelectionScreen
          level={selectedLevel}
          onSelectMCQ={() => { setPracticeMode("mcq"); goTo("episodes"); }}
          onSelectFillBlank={() => { setPracticeMode("fill-blank"); goTo("episodes"); }}
          onSelectDictation={() => { setPracticeMode("dictation"); goTo("episodes"); }}
          onSelectShortAnswer={() => { setPracticeMode("short-answer"); goTo("episodes"); }}
          onSelectMatching={() => { setPracticeMode("matching"); goTo("episodes"); }}
          onSelectMap={() => { setPracticeMode("map"); goTo("episodes"); }}
          onSelectCompletions={() => goTo("completion-type")}
          onBack={() => goTo("ielts-sections")}
        />
      </>
    );
  }

  if (screen === "practice") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <PracticeScreen
          episodeId={selectedPracticeId}
          practiceMode={practiceMode}
          isQuizMode={false}
          onBack={() => selectedIELTSSection ? goTo("ielts-sections") : goTo("episodes")}
          onNextEpisode={(nextId) => { setSelectedPracticeId(nextId); goTo("practice"); }}
          onNavigateToSection={handleNavigateToSection}
          onNavigateHome={handleNavigateHome}
        />
      </>
    );
  }

  if (screen === "quiz") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <PracticeScreen
          episodeId={selectedPracticeId}
          practiceMode={null}
          isQuizMode={true}
          onBack={() => goTo("episodes")}
          onNextEpisode={(nextId) => { setSelectedPracticeId(nextId); goTo("quiz"); }}
          onNavigateToSection={handleNavigateToSection}
          onNavigateHome={handleNavigateHome}
        />
      </>
    );
  }

  if (screen === "episodes") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <EpisodeScreen
          selectedLevel={selectedLevel}
          practiceMode={selectedIELTSSection ? null : practiceMode}
          isQuizMode={isQuizMode}
          ieltsSection={selectedIELTSSection}
          onSelectEpisode={(id) => { setSelectedPracticeId(id); if (isQuizMode) { goTo("quiz"); } else { goTo("practice"); } }}
          onBack={() => {
            if (selectedIELTSSection) return goTo("ielts-sections");
            if (isQuizMode) return goTo("exam-selection");
            if (practiceMode?.startsWith("completion-")) return goTo("completion-type");
            return goTo("mode-selection");
          }}
        />
      </>
    );
  }

  if (screen === "home") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <HomeScreen
          onSelectPractice={() => { setIsQuizMode(false); setSelectedIELTSSection(null); goTo("exam-selection"); }}
          onSelectQuiz={() => { setIsQuizMode(true); goTo("exam-selection"); }}
        />
      </>
    );
  }

  return <LoginScreen onGuestLogin={() => { setUserEmail(""); goTo("home"); }} />;
}