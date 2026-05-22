"use client";

import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((prev) => !prev);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f7eee8]">
      <img
        src="/cat-logo.svg"
        alt="Loading"
        width={160}
        height={160}
        style={{
          transition: "opacity 0.5s ease",
          opacity: visible ? 1 : 0.15,
        }}
      />
    </main>
  );
}