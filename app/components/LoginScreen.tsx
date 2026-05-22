"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  onGuestLogin: () => void;
};

export default function LoginScreen({ onGuestLogin }: Props) {
  const [showSignInOptions, setShowSignInOptions] = useState(false);
  const [allowEmails, setAllowEmails] = useState(false);
  const [email, setEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }

  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#3b2f2f]">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <img
          src="/cat-logo.svg"
          alt="ListeningTalkers Logo"
          width={200}
          height={200}
          className="mb-4"
        />

        <h1 className="text-4xl font-bold tracking-tight md:text-7xl">
          ListeningTalkers
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-8 text-[#7a6258]">
          Practice English listening with calm stories and level-based quizzes.
        </p>

        <div className="mt-10 w-full max-w-md rounded-[2rem] border border-[#e0c7bb] bg-[#fffaf7] p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Start your practice</h2>
          <p className="mt-2 text-sm text-[#7a6258]">
            Sign in to save your progress or continue as a guest.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {!showSignInOptions ? (
              <>
                <button
                  onClick={() => setShowSignInOptions(true)}
                  className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-[#2f2424]"
                >
                  Sign In
                </button>
                <button
                  onClick={onGuestLogin}
                  className="w-full rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f] transition hover:bg-[#f1ded5]"
                >
                  Continue as Guest
                </button>
              </>
            ) : (
              <div className="rounded-[2rem] border border-[#e0c7bb] bg-white p-5 text-left">
                <h3 className="text-center text-xl font-bold">
                  Sign in to continue
                </h3>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={signInWithGoogle}
                    className="w-full rounded-2xl bg-[#3b2f2f] px-6 py-4 font-semibold text-white transition hover:bg-[#2f2424]"
                  >
                    Continue with Google
                  </button>

                  <div className="rounded-2xl border border-[#e0c7bb] bg-[#f7eee8] p-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-2xl border border-[#e0c7bb] bg-white p-4"
                    />
                    <button
                      onClick={async () => {
                        if (!email) {
                          alert("Please enter email.");
                          return;
                        }
                        setLoadingEmail(true);
                        const { error } = await supabase.auth.signInWithOtp({ email });
                        setLoadingEmail(false);
                        if (error) {
                          alert(error.message);
                          return;
                        }
                        alert("Magic link sent to your email 😄");
                      }}
                      disabled={loadingEmail}
                      className="mt-3 w-full rounded-2xl border border-[#e0c7bb] bg-white px-6 py-4 font-semibold text-[#3b2f2f]"
                    >
                      {loadingEmail ? "Sending..." : "Continue with Email"}
                    </button>
                  </div>
                </div>

                <label className="mt-5 flex items-start gap-3 text-sm text-[#7a6258]">
                  <input
                    type="checkbox"
                    checked={allowEmails}
                    onChange={(e) => setAllowEmails(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I want to receive learning reminders and product updates by email.
                  </span>
                </label>

                <button
                  onClick={() => setShowSignInOptions(false)}
                  className="mt-5 w-full text-sm font-semibold underline"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}