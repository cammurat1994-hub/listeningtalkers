"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  onGuestLogin: () => void;
};

const features = [
  { emoji: "🎯", text: "3,000+ IELTS & TOEFL listening exercises" },
  { emoji: "📊", text: "Track your accuracy and weak areas" },
  { emoji: "🔥", text: "Daily streak to keep you motivated" },
  { emoji: "💬", text: "Community discussion on every episode" },
];

export default function LoginScreen({ onGuestLogin }: Props) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }

  async function signInWithEmail() {
    if (!email) { alert("Please enter your email."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) { alert(error.message); return; }
    setEmailSent(true);
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">

          {/* Left — branding */}
          <div>
            <div className="flex items-center gap-3">
              <img src="/cat-logo.svg" alt="ListeningTalkers" className="h-14 w-14 object-contain" />
              <span className="text-xl font-bold">ListeningTalkers</span>
            </div>

            <h1 className="mt-8 text-5xl font-bold leading-tight md:text-6xl">
              Master IELTS<br />
              <span className="text-[#c9a99a]">Listening.</span>
            </h1>

            <p className="mt-5 text-lg text-[#7a6258]">
              The only platform focused entirely on listening practice.
              Every question type, every level, all in one place.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {features.map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ead7cc] text-sm">
                    {f.emoji}
                  </div>
                  <p className="text-sm font-semibold text-[#3b2f2f]">{f.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={onGuestLogin}
              className="mt-8 text-sm font-semibold text-[#7a6258] underline hover:text-[#3b2f2f]"
            >
              Continue as guest (no progress saved) →
            </button>
          </div>

          {/* Right — auth card */}
          <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-8 shadow-lg">
            {!showSignIn ? (
              <>
                <h2 className="text-2xl font-bold">Start for free</h2>
                <p className="mt-2 text-sm text-[#7a6258]">
                  Create an account to save your progress and track your improvement.
                </p>

                <div className="mt-8 flex flex-col gap-3">
                  <button
                    onClick={signInWithGoogle}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f] shadow-sm transition hover:bg-[#f7eee8]"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#e0c7bb]" />
                    <span className="text-xs text-[#7a6258]">or</span>
                    <div className="h-px flex-1 bg-[#e0c7bb]" />
                  </div>

                  <button
                    onClick={() => setShowSignIn(true)}
                    className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424]"
                  >
                    Continue with Email
                  </button>
                </div>

                <p className="mt-6 text-center text-xs text-[#7a6258]">
                  By signing in, you agree to our terms of service.
                </p>
              </>
            ) : emailSent ? (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                  📬
                </div>
                <h2 className="mt-4 text-2xl font-bold">Check your email</h2>
                <p className="mt-2 text-sm text-[#7a6258]">
                  We sent a magic link to <strong>{email}</strong>.<br />
                  Click the link to sign in.
                </p>
                <button
                  onClick={() => { setEmailSent(false); setShowSignIn(false); setEmail(""); }}
                  className="mt-6 text-sm font-semibold text-[#7a6258] underline"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Sign in with email</h2>
                <p className="mt-2 text-sm text-[#7a6258]">
                  We'll send you a magic link — no password needed.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") signInWithEmail(); }}
                    placeholder="your@email.com"
                    className="w-full rounded-2xl border border-[#e0c7bb] bg-[#f7eee8] px-5 py-4 text-sm focus:border-[#3b2f2f] focus:outline-none"
                  />
                  <button
                    onClick={signInWithEmail}
                    disabled={loading}
                    className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424] disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send Magic Link →"}
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#e0c7bb]" />
                  <span className="text-xs text-[#7a6258]">or</span>
                  <div className="h-px flex-1 bg-[#e0c7bb]" />
                </div>

                <button
                  onClick={signInWithGoogle}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f] transition hover:bg-[#f7eee8]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={() => setShowSignIn(false)}
                  className="mt-4 w-full text-center text-sm font-semibold text-[#7a6258] underline"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}