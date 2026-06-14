"use client";

// Adapts the existing (callback-driven) PracticeScreen to file-based routing:
// every navigation callback becomes a next/navigation route push.

import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import PracticeScreen from "./PracticeScreen";

type Props = {
  episodeId: string;
  // Where "Back" goes (section listing for IELTS, exam landing otherwise).
  backHref: string;
};

export default function PracticeRouteClient({ episodeId, backHref }: Props) {
  const router = useRouter();

  // Resolve a practice's canonical URL from its id, then navigate.
  async function goToEpisode(id: string) {
    const { data } = await supabase
      .from("episodes")
      .select("exam_type, exam_section, slug, episode_type")
      .eq("id", id)
      .maybeSingle();
    if (!data || !data.slug || !data.exam_type) {
      router.push(backHref);
      return;
    }
    if (data.exam_type === "ielts" && data.exam_section) {
      router.push(`/ielts/listening/section-${data.exam_section}/${data.slug}`);
    } else {
      router.push(`/${data.exam_type}/listening/${data.slug}`);
    }
  }

  return (
    <PracticeScreen
      episodeId={episodeId}
      practiceMode={null}
      isQuizMode={false}
      onBack={() => router.push(backHref)}
      onNextEpisode={(nextId) => goToEpisode(nextId)}
      onNavigateToSection={(section) => router.push(`/ielts/listening/section-${section}`)}
      onNavigateHome={() => router.push("/")}
    />
  );
}
