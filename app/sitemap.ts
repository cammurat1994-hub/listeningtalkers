import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://listeningtalkers.vercel.app";

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1.0 },
  ];

  const practiceTypes = [
    "multiple-choice",
    "fill-in-the-blank",
    "dictation",
    "short-answer",
    "matching",
    "map-labelling",
    "note-completion",
    "form-completion",
    "table-completion",
    "flow-chart-completion",
    "sentence-completion",
  ];

  const levels = ["beginner", "intermediate", "advanced"];

  const practicePages = practiceTypes.flatMap(type =>
    levels.map(level => ({
      url: `${baseUrl}/ielts-listening-practice/${type}/${level}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))
  );

  const examPages = [
    "ielts", "toefl", "toeic", "celpip"
  ].map(exam => ({
    url: `${baseUrl}/ielts-listening-exam/${exam}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...practicePages, ...examPages];
}