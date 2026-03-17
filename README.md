# Solutions Dashboard

> Internal knowledge base and AI-powered retrieval system for structured products materials.

A Next.js web application for the structuring team to search, retrieve, and reuse pitch decks, product explanations, Excel models, and client-facing documents — using semantic vector search powered by OpenAI embeddings and Supabase pgvector.

---

## Features

- **AI-Powered Search** — Semantic vector search across all indexed documents. Returns verbatim matched passages and slides ranked by relevance (not AI-generated answers).
- **Document Library** — Upload and manage `.pptx`, `.xlsx`, `.docx`, `.pdf` files with full metadata tagging.
- **Content Preview** — Preview slides and document passages in-browser before downloading.
- **Deck Builder** — Select slides from search results, reorder via drag-and-drop, and export as `.pptx`.
- **Client Log** — Log materials sent to clients with date, sender, and notes. Export as CSV for compliance.
- **Quality Flags** — Mark documents as Draft / Approved / Archived. Search filters to show only approved content.
- **Auth** — Magic link (passwordless) authentication via Supabase Auth.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend / DB | Supabase (Postgres + pgvector + Storage + Auth) |
| AI Embeddings | OpenAI `text-embedding-3-small` |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                  # Authenticated app shell
│   │   ├── layout.tsx          # Sidebar layout + auth check
│   │   ├── dashboard/          # Stats + recent uploads
│   │   ├── library/            # Document grid + filters + upload
│   │   ├── search/             # AI search + two-column results
│   │   ├── deck-builder/       # Slide tray + PPTX export
│   │   ├── client-log/         # Interaction log + CSV export
│   │   └── settings/           # Admin: users + security
│   ├── api/
│   │   ├── documents/          # Upload, list, delete, index
│   │   ├── search/             # Vector similarity search
│   │   ├── deck/               # Slide fetch + PPTX assembly
│   │   ├── clients/            # Client CRUD
│   │   └── client-logs/        # Interaction log + CSV export
│   └── auth/
│       ├── login/              # Magic link login page
│       └── callback/           # Supabase auth callback
├── components/
│   ├── layout/Sidebar.tsx
│   ├── documents/              # DocumentCard, UploadModal
│   ├── search/                 # SearchResultItem, PreviewPanel
│   ├── clients/                # LogInteractionModal
│   └── ui/                     # Button, Modal, Select, Input, Toast, etc.
├── lib/
│   ├── supabase/               # Browser + server clients
│   ├── constants/              # Taxonomy options
│   └── utils.ts                # Formatting helpers
├── types/index.ts              # All TypeScript types
└── middleware.ts               # Auth route protection
supabase/
└── migrations/
    └── 001_initial_schema.sql  # Full DB schema + RLS + pgvector
```

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/headgeo/SolutionsDashboard.git
cd SolutionsDashboard
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Settings → API**, copy your **Project URL** and **anon public key**.
3. Also copy the **service role key** (keep this secret).

### 3. Run the database migration

In the Supabase dashboard, go to **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, the pgvector index, and the similarity search function.

### 4. Create storage buckets

In the Supabase dashboard, go to **Storage** and create two buckets:

| Bucket name | Public |
|---|---|
| `documents` | ❌ Private |
| `thumbnails` | ✅ Public |

### 5. Set environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** The `OPENAI_API_KEY` is required for semantic search. Without it, the system falls back to basic full-text search.

### 6. Set your first user as admin

After signing in for the first time via magic link, run this in the Supabase SQL editor (replace the email):

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@yourfirm.com';
```

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repository in [vercel.com](https://vercel.com).
3. Add all environment variables from `.env.local` in the Vercel project settings.
4. Deploy.

---

## File Parsing & Indexing

The current indexing pipeline (`/api/documents/[id]/index`) does basic text extraction. For production-quality slide-level parsing and thumbnail rendering, connect a Python microservice using:

- `python-pptx` — slide text + structure extraction
- `PyMuPDF` — PDF text + page extraction  
- `python-docx` — Word document parsing
- `LibreOffice headless` — PPTX → PNG thumbnail rendering

The API route is designed to call an external service URL — set `PARSER_SERVICE_URL` in your environment and update the index route to forward the file.

---

## Deck Export

The current deck export returns a JSON manifest of selected slides. To enable true `.pptx` assembly:

1. Deploy a Python service with `python-pptx`
2. Set `DECK_SERVICE_URL` in your environment
3. Update `/api/deck/export/route.ts` to POST chunk IDs to the service and stream back the `.pptx` binary

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server only) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for embeddings |
| `NEXT_PUBLIC_APP_URL` | ✅ | App base URL (for auth redirects) |

---

## Security Notes

- All routes are protected by Supabase Auth middleware — no public endpoints.
- Row Level Security (RLS) is enabled on all Supabase tables.
- The `documents` storage bucket is private — files are accessed via signed URLs.
- No third-party analytics or external logging of document content.
- Confirm Supabase data region with compliance before launch (EU/US selectable in project settings).

---

## Internal Use Only

This system is not client-facing. Access is restricted to the structuring team.  
*Solutions Dashboard v1.0 · Structuring Team · Confidential*
