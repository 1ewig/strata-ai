# Implementation Plan — PostgreSQL Migration & Character Limits

Migrate the storage engine from client-side Dexie (IndexedDB) to server-side PostgreSQL (Supabase) for Conversations, Messages, and Workspace Files. Enforce character limits on user messages and workspace files across client and server layers.

---

## 1. Database Schema & Migration (`scripts/app-schema.sql`)

Create relational tables in PostgreSQL (`public` schema) bound to `better_auth."user"(id)`:

```sql
-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES better_auth."user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  model TEXT NOT NULL DEFAULT 'gemini-3.5-flash-lite',
  thinking_level TEXT,
  active_file_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON public.conversations(user_id, updated_at DESC);

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY, -- AI SDK message ID
  chat_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES better_auth."user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created
  ON public.messages(chat_id, created_at ASC);

-- 3. Workspace Files Table
CREATE TABLE IF NOT EXISTS public.workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES better_auth."user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'markdown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_chat_filename UNIQUE (chat_id, name)
);

CREATE INDEX IF NOT EXISTS idx_workspace_files_chat
  ON public.workspace_files(chat_id);
```

---

## 2. Character Limits Specification

| Entity | Limit | Client Enforcement | Server / Agent Enforcement |
|--------|-------|--------------------|----------------------------|
| **User Messages** | **4,000 characters** | Textarea `maxLength={4000}`, character counter badge in `ChatInput.tsx` | Validated in `POST /api/agent` (returns HTTP 400 if exceeded) |
| **Workspace Files** | **50,000 characters** | File drawer editor validation | Checked in `writeFile` & `editFile` tools (returns tool error if edit exceeds 50k chars) |

---

## 3. Proposed Changes

### Database & Backend API Layer

#### [NEW] [app-schema.sql](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/scripts/app-schema.sql)
- SQL migration script creating `conversations`, `messages`, and `workspace_files` tables and indexes.

#### [NEW] [pg-db.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/lib/db/pg-db.ts)
- Server-side PostgreSQL data access layer using `pg` Pool (`DATABASE_URL`).
- Functions: `createConversation`, `getConversationsByUser`, `getConversationById`, `deleteConversation`, `saveMessages`, `getMessagesByChat`, `saveWorkspaceFile`, `getWorkspaceFilesByChat`, `deleteWorkspaceFile`.

#### [NEW] [conversations/route.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/app/api/conversations/route.ts)
- `GET`: Fetch list of conversations for authenticated user.
- `POST`: Create a new conversation.

#### [NEW] [conversations/[id]/route.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/app/api/conversations/[id]/route.ts)
- `GET`: Fetch single conversation with messages and files.
- `PATCH`: Update title, model, or thinking level.
- `DELETE`: Delete conversation and cascading messages/files.

#### [NEW] [conversations/[id]/messages/route.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/app/api/conversations/[id]/messages/route.ts)
- `POST`: Save messages to PostgreSQL.

#### [NEW] [conversations/[id]/files/route.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/app/api/conversations/[id]/files/route.ts)
- `GET`: Fetch files for conversation.
- `POST`: Save/update file in PostgreSQL.
- `DELETE`: Delete file from PostgreSQL.

#### [MODIFY] [route.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/app/api/agent/route.ts)
- Add 4,000 character limit check on incoming prompt message.
- Enforce 50,000 character limit in tool execution handlers (`writeFile`, `editFile`).

---

### Client Hook & Component Layer

#### [MODIFY] [useChatSession.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/hooks/useChatSession.ts)
- Replace Dexie IndexedDB calls with API calls to `/api/conversations/*`.
- Hydrate initial messages and workspace files from PostgreSQL API.
- Persist messages and file state to PostgreSQL on `onFinish`.

#### [MODIFY] [useWorkspaceFiles.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/hooks/useWorkspaceFiles.ts)
- Perform CRUD operations against PostgreSQL API (`/api/conversations/[id]/files`).

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/components/Sidebar.tsx)
- Replace `useLiveQuery` with server fetch / state sync for conversation list.

#### [MODIFY] [ChatInput.tsx](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/components/ChatInput.tsx)
- Add character counter indicator (e.g. `1,240 / 4,000`).
- Prevent submission if length exceeds 4,000 characters.

#### [DELETE] [db.ts](file:///c:/Users/Asad/Desktop/projects/Strata%20Ai/src/lib/db/db.ts)
- Remove old Dexie IndexedDB setup file.

---

## 4. Open Questions / Choices

1. **Character Limits:** Are **4,000 characters for user messages** and **50,000 characters for files** appropriate, or would you prefer different thresholds?
2. **Local Dexie Cleanup:** Would you like a one-time migration helper to transfer existing browser Dexie conversations into PostgreSQL, or start fresh with PostgreSQL storage?

---

## 5. Verification Plan

### Automated Tests
- Run database migration: `bun run scripts/migrate-app-schema.ts`
- TypeScript check: `bunx tsc --noEmit`
- ESLint: `bun run lint`

### Manual Verification
- Create a conversation, send messages, and edit files.
- Refresh the browser and verify state persists accurately from PostgreSQL.
- Test user message > 4,000 chars and verify character limit warning prevents submission.
- Test creating/editing a file > 50,000 chars and verify tool error enforcement.
