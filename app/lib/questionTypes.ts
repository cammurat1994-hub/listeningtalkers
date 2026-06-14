// Shared helpers for IELTS-section question groups (used by client screens and
// server route pages alike).

/* eslint-disable @typescript-eslint/no-explicit-any */

export const GROUP_TYPE_LABELS: Record<string, string> = {
  "mcq": "Multiple Choice",
  "note-completion": "Note Completion",
  "form-completion": "Form Completion",
  "table-completion": "Table Completion",
  "flow-completion": "Flow Chart",
  "sentence-completion": "Sentence Completion",
  "short-answer": "Short Answer",
  "matching": "Matching",
  "map": "Map Labelling",
};

// Distinct question-group types inside an ielts-section episode (parts → groups),
// e.g. "Form Completion · Table Completion".
export function getGroupTypeLine(questions: unknown): string {
  if (!Array.isArray(questions)) return "";
  const types: string[] = [];
  questions.forEach((p: any) =>
    (p?.groups || []).forEach((g: any) => {
      const lbl = GROUP_TYPE_LABELS[g?.type];
      if (lbl && !types.includes(lbl)) types.push(lbl);
    })
  );
  return types.join(" · ");
}
