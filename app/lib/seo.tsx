// SEO helpers: canonical metadata + JSON-LD structured data.

export const SITE_URL = "https://listeningtalkers.com";

type LearningResourceOpts = {
  name: string;
  description: string;
  url: string;
  educationalLevel?: string;
};

export function learningResourceJsonLd(opts: LearningResourceOpts) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    learningResourceType: "Listening practice test",
    educationalUse: "Exam preparation",
    inLanguage: "en",
    isAccessibleForFree: true,
    ...(opts.educationalLevel ? { educationalLevel: opts.educationalLevel } : {}),
    provider: {
      "@type": "Organization",
      name: "ListeningTalkers",
      url: SITE_URL,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

// Renders one or more JSON-LD objects as <script> tags (server component).
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}
