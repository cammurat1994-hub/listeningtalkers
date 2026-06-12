# ListeningTalkers — Project Bible

## What This Project Is
An IELTS/TOEFL English listening practice platform at **listeningtalkers.com**.  
Users listen to audio clips and answer questions across difficulty levels.  
Solo developer + content creator: Murat (cammurat1994@gmail.com = admin).

---

## Tech Stack
| Layer | Tool |
|---|---|
| Framework | Next.js (App Router) |
| Database | Supabase |
| Hosting | Vercel |
| Audio/File Storage | Cloudflare R2 (via `/api/upload`) |
| Audio Generation | ElevenLabs V3 |

---

## Folder Structure
```
app/
  page.tsx                  # Root — all screen routing lives here (state machine)
  layout.tsx
  globals.css
  components/
    AdminScreen.tsx
    CompletionTypeScreen.tsx
    EpisodeScreen.tsx
    ExamSelectionScreen.tsx
    HomeScreen.tsx
    IELTSInfoModal.tsx
    IELTSSectionScreen.tsx
    LevelScreen.tsx
    LoadingScreen.tsx
    LoginScreen.tsx
    ModeSelectionScreen.tsx
    MyProgressScreen.tsx
    QuizScreen.tsx
    VocabularyScreen.tsx    # ⚠️ DEPRECATED — to be deleted, vocabulary feature removed
  Exam/
    ExamIntro.tsx
    ExamResults.tsx
    IELTSExam.tsx
  api/
    upload/                 # File upload endpoint → Cloudflare R2
lib/
  supabase.ts               # Supabase client (env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
public/
  cat-logo.svg              # Brand mascot — dark brown/black cat with beige headphones
  audio/                    # (local audio if any)
```
Import paths: `"./components/..."` from page.tsx, `"../lib/supabase"` from components.  
No `pages/` directory — App Router only.

---

## Routing / Screen State Machine (page.tsx)

All navigation is a single React state machine in `page.tsx`. No Next.js file-based routing between screens.

```
Screen type:
"login" | "home" | "episodes" | "mode-selection" | "completion-type" 
| "practice" | "quiz" | "progress" | "admin"
| "exam-selection" | "exam-list" | "exam-intro" | "exam-running" | "exam-results"
| "ielts-sections"
```

**Key navigation flows:**
- Home → exam-selection → ielts-sections → mode-selection → episodes → practice
- Home → exam-selection → exam-list → exam-intro → exam-running → exam-results
- UserPanel (fixed top-right): Account menu → admin / progress / logout

**Admin access:** only `cammurat1994@gmail.com`

---

## Database (Supabase)

### `episodes` table
Every practice activity, exam, quiz is one row.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `title` | text | Auto-generated in admin |
| `level` | text | "Beginner" / "Intermediate" / "Advanced" |
| `episode_type` | text | See Episode Types below |
| `exam_type` | text | `"ielts"` or null |
| `exam_section` | int | 1–4 or null |
| `audio_url` | text | Main audio (R2 URL) |
| `audio_part1_url` | text | IELTS Section Part 1 audio |
| `audio_part2_url` | text | IELTS Section Part 2 audio |
| `questions` | jsonb | Questions array (see per-type structure) |
| `sections` | jsonb | Full exam sections (exam-* types only) |
| `show_notes` | bool | Fill-in-blank notes toggle |
| `vocabulary` | jsonb | DEPRECATED — was word list, now unused |
| `pdf_url` | text | Question paper PDF (exams only) |
| `created_at` | timestamp | |

### `user_results` table
| Column | Notes |
|---|---|
| `user_email` | |
| `episode_id` | |
| `episode_title` | |
| `level` | |
| `episode_type` | |
| `score` | correct count |
| `total_questions` | |
| `created_at` | |

### `comments` table
| Column | Notes |
|---|---|
| `episode_id` | |
| `user_email` | |
| `content` | |
| `parent_id` | null = top-level, set = reply |
| `created_at` | |

> ⚠️ There is NO `activities` table. Do not reference it.

---

## Episode Types

### Practice types (individual activities)
| `episode_type` | Label |
|---|---|
| `practice-mcq` | Multiple Choice |
| `practice-fill` | Fill in the Blank |
| `practice-dictation` | Dictation |
| `practice-short` | Short Answer |
| `practice-matching` | Matching |
| `practice-map` | Map Labelling |
| `practice-completion-note` | Note Completion |
| `practice-completion-form` | Form Completion |
| `practice-completion-table` | Table Completion |
| `practice-completion-flow` | Flow Chart |
| `practice-completion-sentence` | Sentence Completion |
| `ielts-section` | IELTS Section (mixed format, 2-part audio) |

### Exam / Quiz types
| `episode_type` | Label |
|---|---|
| `exam-ielts` | IELTS Full Exam |
| `exam-toefl` | TOEFL Full Exam |
| `exam-toeic` | TOEIC Full Exam |
| `exam-celpip` | CELPIP Full Exam |
| `quiz-ielts` | IELTS Style Quiz |
| `quiz-toefl` | TOEFL Style Quiz |
| `quiz-toeic` | TOEIC Style Quiz |
| `quiz-celpip` | CELPIP Style Quiz |

---

## Levels
| DB value | Display |
|---|---|
| `Beginner` | A1–A2 |
| `Intermediate` | B1–B2 |
| `Advanced` | C1–C2 |

Auto-level by IELTS section: S1=Beginner, S2/S3=Intermediate, S4=Advanced

---

## Question Data Structures (questions JSON)

### MCQ (practice-mcq, quiz-*)
```json
[{
  "question": "...",
  "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
  "correctAnswer": "B",          // string for single, string[] for Choose TWO/THREE
  "explanation": "..."
}]
```
- Single answer: 3 options (A-C), correctAnswer = "A"
- Choose TWO: 5 options (A-E), correctAnswer = ["A","C"]
- Choose THREE: 7 options (A-G), correctAnswer = ["A","C","F"]

### Fill in the Blank (practice-fill)
```json
[{
  "text": "The meeting was ___ at 3pm.",
  "blanks": [{ "index": 0, "answer": "scheduled|planned" }]
}]
```

### Dictation (practice-dictation)
```json
[{ "sentence": "The conference will be held next Monday." }]
```
Alternative answers with `|`: `"colour|color"`

### Short Answer (practice-short)
```json
[{ "question": "...", "answer": "9pm|nine", "hint": "optional" }]
```

### Matching (practice-matching)
```json
[{
  "items": ["Pinewood Cottage", ...],        // 5 left-side items
  "options": [{ "key": "A", "label": "..." }, ...],  // 5-7 right-side options
  "answers": { "0": "A", "1": "C", ... }    // index → option key
}]
```

### Map Labelling (practice-map)
```json
[{
  "imageUrl": "https://...",
  "points": [{ "id": 1, "x": 45.2, "y": 30.1, "answer": "A", "explanation": "..." }],
  "options": [{ "key": "A", "label": "Library" }, ...]
}]
```

### Completion types (note/form/table/flow/sentence)
Note: `{ "title": "...", "items": [{ "label": "Speaker: ___", "answer": "Dr. Johnson" }] }`  
Form: `{ "title": "...", "fields": [{ "label": "Name: ___", "answer": "Peterson" }] }`  
Table: `{ "title": "...", "headers": [...], "rows": [{ "cells": [...], "answerIndices": [2], "answers": ["London"] }] }`  
Flow: `{ "title": "...", "steps": [{ "text": "Start at ___", "answer": "main desk", "hasBlank": true }] }`  
Sentence: `{ "items": [{ "text": "The event is in ___ next month.", "answer": "Berlin" }] }`

### IELTS Section (ielts-section)
```json
[
  { "part": 1, "audioUrl": "https://...", "groups": [{ "id": "...", "type": "mcq", "label": "Questions 11-14", "wordLimit": "...", "data": [...] }] },
  { "part": 2, "audioUrl": "https://...", "groups": [...] }
]
```
Stored in `questions` column. `audio_part1_url` and `audio_part2_url` also set.

### Full Exam (exam-*)
Stored in `sections` column (not `questions`):
```json
[{
  "number": 1,
  "audioUrl": "https://...",
  "introUrl": "https://...",
  "questionGroups": [{ "type": "note-completion", "label": "Questions 1-5", "data": {...} }]
}]
```

---

## Key Components

### page.tsx
- Single-file router, all screen switching via `setScreen()`
- Holds global state: `selectedLevel`, `practiceMode`, `isQuizMode`, `selectedIELTSSection`, `currentExam`, `examAnswers`
- `UserPanel` component (fixed top-right): shows account menu for logged-in users

### QuizScreen.tsx
- Handles ALL practice types: MCQ, Fill, Dictation, Short Answer, Matching, Map, IELTS Section
- Sub-components inside: `AudioPlayer`, `MCQQuestionView`, `FillQuestionView`, `DictationQuestionView`, `ShortAnswerView`, `MatchingView`, `MapView`, `CommentsPanel`
- `calculateScore()` handles all types including IELTS Section
- Saves result to `user_results` on finish

### AdminScreen.tsx
- Bulk paste system for all question types
- Unified MCQ editor supports Single / Choose TWO / Choose THREE
- `parseBulkMCQ()` handles all three MCQ variants from `Correct) A` or `Correct) B,D`
- File uploads via `/api/upload` → Cloudflare R2
- Manage tab: filter/search/paginate/edit/delete episodes
- Users tab: list unique emails from user_results

### IELTSExam.tsx (Exam/IELTSExam.tsx)
- Full timed exam: reading phase (45s) → listening phase → checking phase (30s) → review (600s)
- Renders all question group types inline
- Answer keys: `${sectionNum}-${group.label}-${type}-${index}`

---

## Answer Normalization
```typescript
function normalize(str) { return str.toLowerCase().trim().replace(/[.,!?;:'"]/g, ""); }
function checkAnswer(userAnswer, correctAnswer) {
  return correctAnswer.split("|").map(normalize).some(v => v === normalize(userAnswer));
}
```
Used in QuizScreen, IELTSExam, ExamResults.

---

## IELTS Section Structure
- **Section 1 (Beginner):** 2 speakers, everyday conversation — Form/Note/Table Completion
- **Section 2 (Intermediate):** 1 speaker, social monologue — Map Labelling + MCQ/Matching  
- **Section 3 (Intermediate):** 2-4 speakers, academic — MCQ + Matching + Sentence Completion
- **Section 4 (Advanced):** 1 speaker, lecture — Note/Flow/Table/Sentence, NO pause

Real Cambridge Section 2: always **3 Choose TWO questions** per recording (Q15-16, Q17-18, Q19-20)

### Mixed-format `ielts-section` type
- 2 audio parts (Part 1 + Part 2), except Section 4 (1 part only)
- Each part has `questionGroups` array
- Open question: build into single `ielts-section` episode type (current) vs separate activities → do not change without instruction

---

## Bulk Paste Format Rules

### Multiple Choice (all variants)
```
Q) question text
A) option A
B) option B
C) option C
D) option D      ← Choose TWO: include D, E
E) option E
F) option F      ← Choose THREE: include F, G
G) option G
Correct) B       ← single: one letter | Choose TWO: "B,D" | Choose THREE: "A,C,F"
Explanation) why correct
```
- 5 options for Choose TWO, 7 for Choose THREE
- `Explanation)` mandatory

### Fill in the Blank
```
TEXT) sentence with ___ blank
ANS1) primary answer
ANS2) alternative/answer2
```
- Blanks not predictable from context
- Prefer: phrasal verb parts, emotional responses, unexpected words
- Summaries must paraphrase audio, not copy verbatim

### Dictation
```
S) Full sentence to dictate.
```
- A1-A2: 1 sentence | B1-B2: 1-2 sentences | C1-C2: 2-3 sentences

### Matching
```
L) left item
R) right item
[blank line between pairs]
```

---

## Content Rules
- ❌ No child characters — `child`, `children`, `kid`, `boy`, `girl` forbidden → use `"university student"`
- ✅ Speaker separation mandatory: `SHE` / `HE` / `NARRATOR`
- ✅ Each activity type (MC/FITB/Dictation) uses a **different story** within same pack
- ❌ VocabularyScreen is deprecated — do not add vocabulary features

---

## ElevenLabs V3 Audio Rules

**API:** `POST /v1/text-to-dialogue/convert` | max 10 speakers | 2000 char limit

**Speed (slider):**
| Level | Speed |
|---|---|
| A1-A2 | 0.75–0.80 |
| B1-B2 | 0.85–0.90 |
| C1-C2 | 1.0 |

**Multi-speaker format:** `Speaker 1: [tag] text`

**Approved emotion tags:** `[laughs]` `[sighs]` `[excited]` `[frustrated]` `[nervously]` `[reassuring]` `[professional]` `[curious]` `[deadpan]` `[dramatically]` `[warmly]` `[sheepishly]` `[alarmed]` `[dismissive]` `[sympathetic]` `[questioning]` `[impressed]` `[cracking up]` `[panicking]` `[delighted]` `[amazed]` `[crying]` `[mischievously]` `[giggling]` `[chuckles]` `[sarcastic]` `[whispers]` `[exhales]` `[desperately]` `[robotic voice]` `[overlapping]`

**Sound effects:** `[gunshot]` `[applause]` `[clapping]` `[explosion]` `[swallows]` `[gulps]`

**Experimental (test first):** `[strong X accent]` `[sings]` `[woo]` `[fart]`

**Rules:**
- ❌ No SSML `<break>` tags → use `...` and commas
- ❌ No action/physical tags: `[standing]` `[grinning]` `[music]`
- ✅ Tags at sentence start or end
- ✅ Combinations OK: `[frustrated sigh]`
- ✅ Emphasis: CAPITALIZE words, `...`, `!`, `?`

---

## Content Packs Completed (do not regenerate)

### C1-C2 Advanced MC
- Pack v1–v4: 25 activities each (100 total)
- Pack v5: 25 activities — Rawls, Hochschild, Olson, Chakrabarty, etc.

### B1-B2 Intermediate
- MC Vol. 3–4: 25 activities each — phrasal verbs in everyday dialogue
- Matching Pack: 15 activities, 8 pairs each

---

## Design System (colors)
```
bg-[#f7eee8]    — page background (warm cream)
bg-[#fffaf7]    — card background
bg-[#ead7cc]    — accent/highlight
border-[#e0c7bb] — borders
text-[#3b2f2f]  — primary text (dark brown)
text-[#7a6258]  — secondary text
text-[#c9a99a]  — muted/tertiary
bg-[#3b2f2f]    — buttons/CTAs
```
Rounded: `rounded-2xl`, `rounded-3xl`, `rounded-[2rem]`

---

## Dev Notes
- No `pages/` directory — App Router only
- Supabase client: `lib/supabase.ts` → `import { supabase } from "../lib/supabase"`
- File uploads: POST to `/api/upload` with FormData (`file` + `folder`) → returns `{ url }`
- Audio from Cloudflare R2, URL in `episodes.audio_url`
- Deployed on Vercel, DNS via Namecheap → Vercel nameservers
- Auth: Google OAuth + magic link email (Supabase Auth)
- Guest mode: no auth, no progress saved
