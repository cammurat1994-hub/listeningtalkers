"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import LoginScreen from "./components/LoginScreen";
import LevelScreen from "./components/LevelScreen";
import EpisodeScreen from "./components/EpisodeScreen";
import QuizScreen from "./components/QuizScreen";
import AdminScreen from "./components/AdminScreen";
import ModeSelectionScreen from "./components/ModeSelectionScreen";
import VocabularyScreen from "./components/VocabularyScreen";
import MyProgressScreen from "./components/MyProgressScreen";
import LoadingScreen from "./components/LoadingScreen";

type Screen =
  | "login"
  | "levels"
  | "episodes"
  | "mode-selection"
  | "vocabulary"
  | "quiz"
  | "progress"
  | "admin";

const ADMIN_EMAIL = "cammurat1994@gmail.com";

function UserPanel({
  userEmail,
  onNavigate,
  onLogout,
}: {
  userEmail: string;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!userEmail) return null;

  const isAdmin = userEmail === ADMIN_EMAIL;

  return (
    <div className="fixed right-5 top-5 z-50">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-3 rounded-full bg-[#3b2f2f] px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-[#2f2424]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#3b2f2f]">
          {isAdmin ? "A" : userEmail.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">Account</span>
        <span>▾</span>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-[1.5rem] border border-[#e0c7bb] bg-white shadow-2xl">
          <div className="border-b border-[#e0c7bb] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7a6258]">
              {isAdmin ? "Administrator" : "Signed in"}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-[#3b2f2f]">{userEmail}</p>
          </div>

          {isAdmin && (
            <button
              onClick={() => { onNavigate("admin"); setIsMenuOpen(false); }}
              className="flex w-full items-center gap-3 border-b border-[#e0c7bb] px-5 py-4 text-left font-semibold text-[#3b2f2f] transition hover:bg-[#f7eee8]"
            >
              🛡️ Admin
            </button>
          )}

          <button
            onClick={() => { onNavigate("progress"); setIsMenuOpen(false); }}
            className="flex w-full items-center gap-3 border-b border-[#e0c7bb] px-5 py-4 text-left font-semibold text-[#3b2f2f] transition hover:bg-[#f7eee8]"
          >
            📊 My Progress
          </button>

          <button
            onClick={() => { onLogout(); setIsMenuOpen(false); }}
            className="flex w-full items-center gap-3 px-5 py-4 text-left font-semibold text-[#3b2f2f] transition hover:bg-[#f7eee8]"
          >
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function getUser() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setScreen("levels");
      }
      setLoading(false);
    }
    getUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUserEmail("");
    setScreen("login");
  }

  function navigateTo(s: Screen) {
    setLoading(true);
    setTimeout(() => {
      setScreen(s);
      setLoading(false);
    }, 600);
  }

  function goTo(s: Screen) {
    setLoading(true);
    setTimeout(() => {
      setScreen(s);
      setLoading(false);
    }, 500);
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (screen === "admin" && userEmail !== ADMIN_EMAIL) {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <main className="flex min-h-screen items-center justify-center bg-[#f7eee8]">
          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-10 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
            <p className="mt-4 text-[#7a6258]">You are not authorized to access admin panel.</p>
          </div>
        </main>
      </>
    );
  }

  if (screen === "progress") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <MyProgressScreen
          onBack={() => goTo("levels")}
          onSelectEpisode={(episodeId) => {
            setSelectedEpisodeId(episodeId);
            goTo("mode-selection");
          }}
        />
      </>
    );
  }

  if (screen === "admin") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <AdminScreen onBack={() => goTo("levels")} />
      </>
    );
  }

  if (screen === "vocabulary") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <VocabularyScreen
          episodeId={selectedEpisodeId}
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
          onSelectVocabulary={() => goTo("vocabulary")}
          onSelectListening={() => goTo("quiz")}
          onBack={() => goTo("episodes")}
        />
      </>
    );
  }

  if (screen === "quiz") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <QuizScreen
          episodeId={selectedEpisodeId}
          onBack={() => goTo("mode-selection")}
          onNextEpisode={(nextId) => {
            setSelectedEpisodeId(nextId);
            goTo("mode-selection");
          }}
          onStudyVocabulary={() => goTo("vocabulary")}
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
          onSelectEpisode={(episodeId) => {
            setSelectedEpisodeId(episodeId);
            goTo("mode-selection");
          }}
          onBack={() => goTo("levels")}
        />
      </>
    );
  }

  if (screen === "levels") {
    return (
      <>
        <UserPanel userEmail={userEmail} onNavigate={navigateTo} onLogout={logout} />
        <LevelScreen
          onSelectLevel={(level) => {
            setSelectedLevel(level);
            goTo("episodes");
          }}
          onBack={() => goTo("login")}
        />
      </>
    );
  }

  return <LoginScreen onGuestLogin={() => goTo("levels")} />;
}