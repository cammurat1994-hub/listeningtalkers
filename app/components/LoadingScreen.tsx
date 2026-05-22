"use client";

import { useEffect, useState } from "react";

type Props = {
  message?: string;
};

export default function LoadingScreen({ message = "Loading..." }: Props) {
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBounce((prev) => !prev);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f7eee8]">
      <div
        style={{
          transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: bounce ? "translateY(-18px)" : "translateY(0px)",
        }}
      >
        <img
          src="/cat-logo.svg"
          alt="Loading"
          width={140}
          height={140}
        />
      </div>

      <div className="mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-[#c9a99a]"
            style={{
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold text-[#7a6258]">{message}</p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </main>
  );
}