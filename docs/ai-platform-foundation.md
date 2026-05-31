# AI Platform Foundation — Universal Layer Spec

**Purpose:** Define the shared AI infrastructure every Hargen ops module depends on — document ingest, context assembly, model execution, audit, limits, failures, and quality loops.  
**Scope:** Planning only. No implementation code.  
**Parent docs:**
- [ai-ops-execution-plan-canon.md](./ai-ops-execution-plan-canon.md) — product phases and ownership
- [ai-assistant-extension-interface-spec.md](./ai-assistant-extension-interface-spec.md) — assistant + extension handshake

---

## 1) Where this sits in the stack

Product layers (from canon):

```text
1. Project Context Layer
2. Work Session + Proof-of-Work Layer
3. AI Admin Assistant Layer        ← modules live here
4. Work Module Layer
5. Portal Assist Layer (extension)
```

**This doc defines Layer 0 — AI Platform Foundation** underneath all of them:

```text
0. AI Platform Foundation (shared)
   ├── Document ingest
   ├── Context builder
   ├── AI runner (model calls)
   ├── Output validation
   ├── AiRun audit
   ├── Rate limits + cost tracking
   ├── Failure/partial UX
   ├── Prompt versioning
   └── Eval fixtures
```

Every module (permit, interconnection, CRM cleanup, customer update, session summary) calls the same foundation with different task config. **No module implements its own ad-hoc Gemini wrapper.**

The browser extension never calls this layer. Extension consumes approved `PortalFieldSet` only.

---

## 2) Design principles

1. **One runner, many tasks** — single entry point for all AI operations.
2. **Structured in, structured out** — JSON schemas per task; no free-text as source of truth.
3. **Human-triggered by default** — AI runs on explicit user action unless async job is already in flight.
4. **Auditable** — every run logged with model, version, latency, outcome; prompts/responses redacted-stored.
5. **Fail gracefully** — timeouts and errors land in review UI with manual fallback, not silent failure.
6. **Tenant-scoped context** — context builder never mixes client data across tenants.
7. **Reuse outreach patterns** — extend existing Gemini + rate-limit patterns; do not fork a second AI stack.

---

## 3) Document ingest pipeline

AI cannot extract from blobs alone. Ingest runs **before** any model call.

### Supported inputs (phased)

| Phase | Types | Notes |
|-------|-------|-------|
| v1 | PDF (text-native), plain text, pasted notes | Most contracts and digital plan sets |
| v1.1 | Images (JPEG/PNG) | Photos, scanned single pages |
| v2 | Scanned multi-page PDFs | OCR required |
| v3 | Large plan sets | Page selection, chunking strategy |

### Ingest outputs (stored on Document)

Each uploaded project document should produce:

```text
Document
  rawBlobUrl          (existing attachment pattern)
  mimeType
  ingestStatus        PENDING | PROCESSING | READY | FAILED
  extractedText       (full or per-page)
  pageCount
  ingestError         (if failed)
  contentHash         (dedupe / skip re-ingest)
  ingestedAt
```

### Ingest rules

- Max file size cap (define at implementation; plan for 25–50 MB per doc initially).
- Max pages sent to model per run (e.g. first N pages + title block + equipment schedule pages if detected).
- Store extracted text in DB or blob — **do not re-parse PDF on every extraction run**.
- Ingest is async for large files (job queue); UI shows `PROCESSING` state.
- Failed ingest → user can paste text manually as fallback input.

### Document type tags (for context recipes)

```text
CONTRACT
PLAN_SET
EQUIPMENT_LIST
CUT_SHEET
PERMIT_CARD
INSPECTION_REPORT
UTILITY_LETTER
CRM_EXPORT
EMAIL
PHOTO
OTHER
```

Module context recipes reference doc types, not raw filenames.

---

## 4) Context builder

The context builder assembles the prompt payload for a given **AiTask**. It never sends the whole project universe to the model.

### Inputs

```text
clientId
projectId
workSessionId (optional)
taskType
documentIds[] (optional — subset for this run)
includeApprovedFacts    boolean (default true)
includeExtractedFacts   boolean (default false — prefer approved)
includeAhjProfile       boolean (shared, no client PII)
includeUtilityProfile   boolean (shared, no client PII)
includeRecentEvents     boolean (last N session events)
userInstruction         string (optional — side refinement)
```

### Assembly order (priority — truncate from bottom up)

1. Task system prompt (versioned template)
2. Output JSON schema description
3. Approved facts (compact key-value)
4. Target document excerpts (from ingest)
5. AHJ / utility profile snippets (requirements, quirks — no other clients' data)
6. Recent session events (short)
7. Extracted-but-unapproved facts (only if task requires delta detection)
8. User instruction (if any)

### Token budget policy

- Hard cap per task type (define at implementation; e.g. 80k input budget with truncation).
- Truncation order: drop oldest events first → trim doc excerpts → trim unapproved facts.
- Never truncate: approved facts for fields the task must produce; task schema; safety/redaction rules.
- Log `truncated: true` on `AiRun` when budget forced cuts.

### Delta context (months-later reuse)

When project has approved facts and task is interconnection (not first permit run):

- Context builder sends **approved facts + new docs + utility profile**.
- Prompt instructs model: "Do not re-extract approved facts unless document contradicts them; flag conflicts."

---

## 5) AI runner — shared execution service

Single server-side service all modules invoke:

```text
runAiTask(input: AiTaskRequest) → AiTaskResult
```

### AiTaskRequest (planning shape)

```json
{
  "taskType": "EXTRACT_PROJECT_FACTS",
  "clientId": "client_789",
  "projectId": "proj_123",
  "workSessionId": "ws_456",
  "documentIds": ["doc_111", "doc_112"],
  "promptVersion": "extract_facts_v1",
  "options": {
    "force": false,
    "userInstruction": null
  },
  "triggeredByUserId": "user_cody"
}
```

### Task types (starter set)

| taskType | Module | Output lands in |
|----------|--------|-----------------|
| `EXTRACT_PROJECT_FACTS` | Facts | `ProjectFact` (EXTRACTED) |
| `DRAFT_PERMIT_FIELD_SET` | Permit | `AiDraft` → `PortalFieldSet` |
| `DRAFT_INTERCONNECTION_FIELD_SET` | Interconnection | `AiDraft` → `PortalFieldSet` |
| `DRAFT_SCOPE_OF_WORK` | Permit | `AiDraft` |
| `DRAFT_CRM_STATUS` | CRM cleanup | `AiDraft` |
| `DRAFT_CLIENT_UPDATE` | Comms | `AiDraft` |
| `DRAFT_CUSTOMER_MESSAGE` | Comms | `AiDraft` |
| `DRAFT_SESSION_SUMMARY` | Session close | `AiDraft` |
| `DRAFT_MISSING_INFO_CHECKLIST` | Any | `AiDraft` |
| `REFINE_DRAFT` | Side refine | Updates existing `AiDraft` |

### Execution flow

```text
1. AuthZ — staff only; verify project belongs to client
2. Rate limit check
3. Load task config (model, prompt version, schema, timeout)
4. Context builder → prompt payload
5. Redaction pass (strip blocked fields — see §9)
6. Model call (with timeout)
7. Parse response → validate against JSON schema
8. Retry once on schema failure (same model, stricter instruction)
9. On success → write outputs to domain records + AiRun SUCCESS
10. On failure → AiRun FAILED + surface manual fallback UX
```

### Async jobs

Long tasks (`EXTRACT_PROJECT_FACTS` on large plan set) run as background jobs:

```text
AiRun.status: QUEUED → RUNNING → SUCCEEDED | FAILED | PARTIAL | CANCELLED
```

UI polls or subscribes; user can continue reviewing other fields while job runs.

### Idempotency

- Same `contentHash` + same `promptVersion` + `force: false` → return cached `AiRun` result if fresh (configurable TTL, e.g. 24h).
- `force: true` → new run; old extracted facts marked `SUPERSEDED` only after user approves new ones (not auto).

---

## 6) Structured output validation

Every task defines a JSON schema. Parser rejects free-form prose as the primary result.

### Example: EXTRACT_PROJECT_FACTS output schema (planning)

```json
{
  "facts": [
    {
      "factKey": "solar.systemSizeKwDc",
      "value": "7.2",
      "confidence": "HIGH",
      "sourceDocumentId": "doc_111",
      "sourceExcerpt": "System size: 7.2 kW DC",
      "conflictsWithFactId": null
    }
  ],
  "missingExpectedKeys": ["site.apn"],
  "warnings": []
}
```

### Validation rules

- Unknown `factKey` → warning, not hard fail.
- Required keys for task type missing → `PARTIAL` status + `missingExpectedKeys` populated.
- Schema parse fail after retry → `FAILED`; no silent write to `ProjectFact`.
- Conflicts reference existing approved fact IDs when detected.

---

## 7) AiRun audit record

Every model invocation creates an `AiRun` row (name at implementation).

### AiRun fields (planning)

```text
id
clientId
projectId
workSessionId (nullable)
taskType
promptVersion
modelProvider          (e.g. google)
modelName              (e.g. gemini-2.5-flash)
status                 QUEUED | RUNNING | SUCCEEDED | PARTIAL | FAILED | CANCELLED
inputTokenCount        (nullable)
outputTokenCount       (nullable)
estimatedCostCents     (nullable)
latencyMs
truncated              boolean
errorCode
errorMessage
promptSnapshotRedacted (text or blob ref)
responseSnapshotRedacted
outputRecordIds        (fact ids, draft ids created)
triggeredByUserId
createdAt
completedAt
```

### Retention

- Keep `AiRun` rows for audit/billing debug (minimum 90 days; align with business policy).
- Redact PII in stored snapshots where possible; full raw prompts optional admin-only.

### Link to WorkActivityEvent

Emit events:

```text
AI_EXTRACTION_STARTED   (task queued/running)
AI_EXTRACTION_COMPLETED (success/partial/fail)
```

Attach `aiRunId` in event metadata.

---

## 8) Rate limits, cost, and quotas

Extend existing `src/lib/rate-limit.ts` pattern — new buckets for ops AI, separate from outreach.

### Rate limit buckets (planning)

| Bucket | Scope | Purpose |
|--------|-------|---------|
| `ops-ai-extract` | per user per hour | Heavy doc extraction |
| `ops-ai-draft` | per user per hour | Field set / comms drafts |
| `ops-ai-refine` | per user per 15 min | Side refine / chat-like edits |
| `ops-ai-project` | per project per hour | Prevent runaway loops on one job |

### Cost tracking

- Log tokens per `AiRun`.
- Optional: `estimatedCostCents` from provider pricing table.
- Admin dashboard (later): cost per client, per week, per task type.
- Hard daily cap (env config) → block new runs with clear message when exceeded.

### No users yet advantage

Set conservative defaults now; tune from real usage data before client onboarding.

---

## 9) PII and model input policy

### Never send to model

- Passwords, vault links, `adminSecureNote`
- Full payment card or bank data
- Unrelated clients' project data
- Staff credentials

### Allowed with care

- End customer name, address, phone, email (required for permit/utility work)
- System specs, permit numbers, utility account numbers
- Document excerpts from client project files

### Redaction pass (pre-call)

Automated scrub before prompt send:

- Strip patterns matching vault URLs if accidentally pasted in notes
- Strip lines tagged `[INTERNAL ONLY]` if used in notes convention

### Provider policy

- Document which provider(s) are used (currently Gemini in outreach).
- Configure data retention / zero-retention if provider supports it.
- No client-facing claim of "AI never sees your data" — be accurate: AI sees what you upload for that project.

---

## 10) Prompt versioning

Prompts are not hardcoded strings scattered in modules.

### PromptTemplate (planning entity)

```text
id
taskType
version              (e.g. extract_facts_v1)
systemPrompt
userPromptTemplate
outputSchemaRef
modelName
temperature
isActive
createdAt
notes
```

### Rules

- Each `AiRun` stores `promptVersion`.
- Each `ProjectFact` / `AiDraft` stores `sourceAiRunId` + `promptVersion`.
- New version deployed as `isActive`; old runs remain auditable.
- Changing prompt version does not auto-overwrite approved facts.

### Module ownership

- Operations/product owns prompt content for task types.
- Platform owns runner, schema validation, and version deployment process.

---

## 11) Failure and partial UX states

Every AI-triggering UI must handle:

| State | User sees |
|-------|-----------|
| `idle` | Action button enabled |
| `queued` | "Queued…" |
| `running` | Spinner + cancel if async |
| `succeeded` | Results in review table |
| `partial` | Results + warnings ("APN not found in documents") |
| `failed` | Error message + manual entry path |
| `rate_limited` | "Try again in X minutes" |
| `cancelled` | No writes; return to idle |

### Failure messages (operator-friendly)

- `MODEL_TIMEOUT` — "Document too large or slow. Try fewer pages or enter fields manually."
- `SCHEMA_INVALID` — "AI returned unexpected format. Retry or enter manually."
- `INGEST_FAILED` — "Could not read file. Upload a text PDF or paste content."
- `RATE_LIMITED` — standard retry message
- `DAILY_CAP` — "Daily AI limit reached. Continue manually or try tomorrow."

Never show raw stack traces to admin UI.

---

## 12) Eval and quality loop

### Golden fixtures (before scaling modules)

Maintain a small set of test documents with expected extracted facts:

```text
fixtures/
  garcia_contract.pdf       → expected fact keys + values
  garcia_plan_set.pdf
  sample_crm_export.txt
```

### Regression runs

- Script or admin-only action: run extraction against fixtures with current prompt version.
- Compare to expected; flag drift before deploy.
- Track **correction rate** in production: facts approved after user edit / total facts approved.

### Quality KPIs (tie to canon)

- Fact correction rate by document type
- Extraction fail/partial rate
- Time from upload to approved field set
- Fields marked `NEEDS_REVIEW` at approval time

---

## 13) Reuse from existing codebase

Do not rebuild from scratch. Extend patterns already in Hargen:

| Existing | Reuse for ops AI |
|----------|------------------|
| `@google/generative-ai` + `GEMINI_API_KEY` | Default provider in runner |
| `src/lib/rate-limit.ts` | New ops buckets |
| `src/lib/outreach-enrichment.ts` | Structured prompt + JSON parse + timeout pattern |
| Human-triggered button UX (`AIEnrichmentButton`) | Same for "Extract facts" / "Draft field set" |
| `AuditLog` | Cross-reference or mirror critical AI events |
| Vercel Blob + `/api/files/read` | Document storage and secure read |
| `authorizeStaffAction` | All AI task entry points |

**Anti-pattern:** copying outreach enrichment into six module files.

---

## 14) Optional later (not v1 blockers)

| Capability | When |
|------------|------|
| Embeddings + semantic doc search | Many docs per project; hard to find equipment page |
| Session-scoped refine chat | After core review tables work |
| Multi-provider fallback (OpenAI backup) | Gemini outage pain observed |
| OCR for scanned plans | Real scanned AHJ docs in pilot |
| Auto-suggest AHJ profile from address | After manual profiles exist |

---

## 15) Build sequence (foundation)

Run in parallel with canon Phase 1–2; **must complete before Phase 3 (approved facts).**

| Step | Deliverable |
|------|-------------|
| F1 | Document ingest pipeline + `ingestStatus` on project documents |
| F2 | `AiRun` model + audit fields |
| F3 | Context builder v1 (approved facts + doc excerpts + profiles) |
| F4 | AI runner v1 — single task: `EXTRACT_PROJECT_FACTS` |
| F5 | JSON schema validation + retry + PARTIAL/FAILED UX |
| F6 | Rate limits + daily cap env |
| F7 | PromptTemplate versioning for extract task |
| F8 | Async job path for large docs |
| F9 | Golden fixture regression (manual admin trigger OK) |
| F10 | Add draft tasks: `DRAFT_PERMIT_FIELD_SET`, `DRAFT_SESSION_SUMMARY` |

---

## 16) Readiness gate — foundation complete when

```text
[ ] Upload PDF → ingest → extracted text stored
[ ] Run EXTRACT_PROJECT_FACTS → facts appear as EXTRACTED in review table
[ ] AiRun row exists with model, latency, status, promptVersion
[ ] Schema fail → retry → then FAILED with manual fallback (no corrupt DB)
[ ] Rate limit triggers with clear UX
[ ] Re-run with same contentHash does not duplicate facts (idempotent)
[ ] Prompt version change is auditable on new runs
[ ] No vault/password content in promptSnapshotRedacted
[ ] Golden fixture extraction run passes baseline
```

Only then proceed to canon **Phase 3** (approved facts review engine) at full speed.

---

## 17) Relationship to extension

```text
AI Platform Foundation → produces drafts and extracted facts in Hargen app
Approved Facts + PortalFieldSet → approved in app
Extension → reads PortalFieldSet only; zero model calls
```

If the extension ever needs AI, that is a design mistake — pull it back to the app.

---

## 18) One-line summary

**Modules are thin. The platform foundation is thick. Every AI task shares ingest, context, runner, audit, limits, and failure handling — so permit, utility, and CRM AI all behave reliably the same way.**
