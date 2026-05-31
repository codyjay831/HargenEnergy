# AI Assistant + Browser Extension — Interface Spec

**Purpose:** Define how the Hargen AI Assistant and browser extension work together so AI does the typing, Cody verifies, the extension fills approved data, and Cody submits.  
**Scope:** Planning only — payloads, states, handshakes, and gates. No implementation code.  
**Related docs:**
- [ai-ops-execution-plan-canon.md](./ai-ops-execution-plan-canon.md) — product phases and ownership
- [ai-platform-foundation.md](./ai-platform-foundation.md) — shared AI infrastructure (ingest, runner, audit, limits)

---

## 1) Operating model

```text
Select client → customer → project → work type → start session
        ↓
AI loads context, extracts facts, drafts typed outputs
        ↓
Cody reviews fact table + field set + comms drafts
        ↓
Cody approves (or corrects then approves)
        ↓
Extension pulls approved PortalFieldSet for active project
        ↓
Extension detects portal fields, shows mapping preview
        ↓
Cody clicks Fill Reviewed Fields
        ↓
Cody uploads docs, submits, pays, signs — manually
        ↓
Extension + app log fill run + submission marked complete
        ↓
Session closes with proof-of-work summary + follow-up
```

**Canon line:** AI prepares. Cody approves. Extension fills. Cody submits. App records.

---

## 2) Ownership and scoping

### Client-scoped (tenant private)
Everything the extension consumes for a fill run is scoped to:

```text
clientId → customerId → projectId → workSessionId
```

The extension never operates on a global project list. Active context is always one explicit project under one client.

### Hargen-scoped (platform shared)
The extension may reference shared intelligence that does **not** contain client-private content:

- AHJ profile (portal URL patterns, field label hints, document requirements)
- Utility profile (same)
- Portal mapping templates (label → factKey, not client values)

Shared templates say *how to map*; approved facts say *what values to use*.

---

## 3) Core entities and relationships

```text
Client
  └── EndCustomer
        └── Project
              ├── Document
              ├── ProjectFact (extracted + approved)
              ├── WorkSession
              │     └── WorkActivityEvent
              ├── AiDraft (typed outputs pending approval)
              ├── PortalFieldSet (approved fill payload)
              └── PortalFillRun (extension execution record)

Hargen (shared)
  ├── AHJProfile
  ├── UtilityProfile
  └── PortalMappingTemplate
```

### Link to existing app (planning)
- `SupportRequest` may optionally link to `projectId` for billing/intake continuity.
- `TimeEntry` may optionally link to `workSessionId`.
- Do not replace SupportRequest with Project; link them.

---

## 4) Lifecycle states

### ProjectFact.approvalStatus

| State | Meaning | Extension may use? |
|-------|---------|-------------------|
| `EXTRACTED` | AI found value; not reviewed | No |
| `NEEDS_REVIEW` | Low confidence or conflict | No |
| `APPROVED` | Cody confirmed usable | Yes |
| `REJECTED` | Not usable; do not reuse | No |
| `SUPERSEDED` | Replaced by newer approved fact | No |

### AiDraft.status

| State | Meaning |
|-------|---------|
| `DRAFT` | AI output; editable |
| `NEEDS_REVIEW` | Flagged for attention |
| `APPROVED` | Cody signed off |
| `APPLIED` | Used in field set, email, or log |
| `DISCARDED` | Intentionally unused |

### PortalFieldSet.approvalStatus

| State | Meaning | Extension may pull? |
|-------|---------|---------------------|
| `DRAFT` | AI-generated field table | No |
| `READY_FOR_REVIEW` | Complete enough to review | No |
| `APPROVED` | Cody approved for portal fill | **Yes** |
| `SUPERSEDED` | Replaced by newer set | No |
| `EXPIRED` | Stale; facts changed since approval | No |

### PortalFillRun.status

| State | Meaning |
|-------|---------|
| `PREVIEW` | Mapping shown; nothing filled |
| `PARTIAL` | Some fields filled |
| `COMPLETE` | All approved mappable fields filled |
| `ABORTED` | User cancelled |
| `SUBMITTED_MARKED` | User marked portal submission done (manual) |

### WorkSession.status

| State | Meaning |
|-------|---------|
| `ACTIVE` | Session in progress |
| `PAUSED` | Paused with reason |
| `ENDED` | Closed with summary |

---

## 5) AI Assistant — what it produces

The assistant is module-driven, not open-ended chat-first. Each module produces typed `AiDraft` records and/or structured tables.

### Module outputs

| Module | Primary AiDraft types | Becomes |
|--------|----------------------|---------|
| Permit prep | `PERMIT_FIELD_SET`, `MISSING_INFO_CHECKLIST`, `SCOPE_OF_WORK` | `PortalFieldSet` |
| Interconnection / PTO | `INTERCONNECTION_FIELD_SET`, `MISSING_INFO_CHECKLIST` | `PortalFieldSet` |
| CRM cleanup | `CRM_STATUS_NOTE`, `NEXT_ACTION` | Internal note / optional CRM copy |
| Customer update | `CLIENT_UPDATE`, `CUSTOMER_MESSAGE` | Comms (manual send) |
| Session close | `WORK_LOG`, `FOLLOW_UP_TASK` | Proof-of-work + task |

### Fact review table (in-app UI contract)

Every row shown to Cody before field-set approval:

```text
factKey | value | source | confidence | approvalStatus | action
```

Actions: Approve, Correct, Reject, Mark missing.

### Field review table (in-app UI contract)

Every portal field before extension pull:

```text
portalLabel | proposedValue | sourceFactKey | confidence | fillPolicy | action
```

`fillPolicy` values:

| Policy | Extension behavior |
|--------|-------------------|
| `AUTO_FILL` | Fill on approved set (high-confidence mapped field) |
| `REVIEW_BEFORE_FILL` | Show in preview; require explicit checkbox to fill |
| `DO_NOT_FILL` | Never fill (legal/signature/payment/certification fields) |
| `MISSING` | Block approval until resolved or explicitly waived |

---

## 6) PortalFieldSet — approved payload (extension input)

This is the **only** object the extension uses for values. No live AI calls from the extension.

### Planning shape

```json
{
  "id": "pfs_abc123",
  "projectId": "proj_123",
  "workSessionId": "ws_456",
  "clientId": "client_789",
  "portalType": "AHJ_PERMIT",
  "ahjProfileId": "ahj_city_x",
  "utilityProfileId": null,
  "portalUrlHint": "https://permits.example.gov/...",
  "approvalStatus": "APPROVED",
  "approvedAt": "2026-05-31T10:14:00Z",
  "approvedByUserId": "user_cody",
  "fields": [
    {
      "fieldId": "owner_name",
      "portalLabel": "Owner Name",
      "portalSelectorHint": "input[name='ownerName']",
      "value": "Maria Garcia",
      "sourceFactKey": "customer.name",
      "sourceFactId": "fact_001",
      "confidence": "HIGH",
      "fillPolicy": "AUTO_FILL"
    },
    {
      "fieldId": "system_size_kw",
      "portalLabel": "System Size (kW DC)",
      "value": "7.2",
      "sourceFactKey": "solar.systemSizeKwDc",
      "confidence": "HIGH",
      "fillPolicy": "AUTO_FILL"
    },
    {
      "fieldId": "scope_of_work",
      "portalLabel": "Scope of Work",
      "value": "Install rooftop residential PV system...",
      "sourceFactKey": null,
      "sourceAiDraftId": "draft_789",
      "confidence": "MEDIUM",
      "fillPolicy": "REVIEW_BEFORE_FILL"
    },
    {
      "fieldId": "certification",
      "portalLabel": "I certify under penalty of perjury...",
      "value": null,
      "fillPolicy": "DO_NOT_FILL"
    }
  ],
  "uploadChecklist": [
    {
      "documentType": "PLAN_SET",
      "documentId": "doc_111",
      "fileName": "Garcia_PlanSet_v3.pdf",
      "required": true
    }
  ],
  "warnings": [
    {
      "code": "AHJ_PRIOR_REJECTION",
      "message": "This AHJ previously required ESS placard detail on plans."
    }
  ]
}
```

### Approval gate rule

`PortalFieldSet` cannot move to `APPROVED` if:

- Any required field has `fillPolicy: MISSING` without explicit waive
- Any `AUTO_FILL` field references a fact that is not `APPROVED`
- Any unresolved conflict on a fact used in the set

---

## 7) Browser extension — role and boundaries

### Extension DOES

- Authenticate to Hargen (staff session token / OAuth — TBD at implementation)
- Receive active project context from app or extension popup
- Pull latest `APPROVED` `PortalFieldSet` for that project + portal type
- Detect form fields on matched host permissions (narrow allowlist)
- Match detected fields to approved set using label + selector hints + mapping template
- Show preview: matched / unmatched / do-not-fill / missing
- Fill selected or all `AUTO_FILL` + explicitly checked `REVIEW_BEFORE_FILL` fields
- Log `PortalFillRun` back to Hargen
- Emit `WorkActivityEvent`: `PORTAL_FIELDS_FILLED`, optionally `SUBMISSION_MARKED_COMPLETE`

### Extension DOES NOT

- Store passwords or vault credentials
- Call AI models
- Auto-submit forms
- Auto-pay fees
- Auto-check legal certification boxes
- Auto-sign
- Fill from `EXTRACTED` or non-approved facts
- Run on broad `<all_urls>` without narrow host permissions
- Hold cross-client data in local storage beyond active session context

---

## 8) Extension ↔ Hargen handshake

### 8.1 Authentication

Planning requirements:

- Staff-only (ADMIN role)
- Short-lived token or session cookie scoped to Hargen API
- Extension ID registered in Hargen admin settings (future)
- Revocable per device

### 8.2 Set active context (app → extension)

When Cody starts work in Hargen app:

```json
{
  "clientId": "client_789",
  "clientName": "ABC Solar",
  "customerId": "cust_001",
  "customerName": "Maria Garcia",
  "projectId": "proj_123",
  "projectLabel": "Garcia Residence — 123 Main St",
  "workSessionId": "ws_456",
  "workType": "PERMIT_PACKET",
  "portalFieldSetId": "pfs_abc123"
}
```

Extension popup shows active project. Cody opens AHJ portal in another tab.

### 8.3 Pull approved field set (extension → Hargen API)

```text
GET /api/ops/extension/portal-field-set?projectId=proj_123&portalType=AHJ_PERMIT
Authorization: Bearer <staff-token>
```

Response: `PortalFieldSet` JSON (section 6) only if `approvalStatus === APPROVED`.

Optional: pull shared mapping template for current host:

```text
GET /api/ops/extension/mapping-template?ahjProfileId=ahj_city_x&portalHost=permits.example.gov
```

Response contains label/selector hints only — no client values.

### 8.4 Detect and preview (extension local)

Extension on page:

1. Reads DOM form fields (inputs, textareas, selects)
2. Matches to `PortalFieldSet.fields` + mapping template
3. Shows preview UI:

```text
Owner Name          → Maria Garcia        [AUTO_FILL]     ✓ matched
Project Address     → 123 Main St         [AUTO_FILL]     ✓ matched
Scope of Work       → Install rooftop...  [REVIEW]        ☐ include
Valuation           → (missing)           [MISSING]       ✗ blocked
Certification       → DO NOT FILL         [BLOCKED]
```

Cody checks review fields, clicks **Fill Reviewed Fields**.

### 8.5 Execute fill (extension local)

- Write values into matched DOM fields
- Trigger input/change events as needed for reactive portals
- Never click Submit / Pay / Sign
- Record per-field result: filled | skipped | failed | not_found

### 8.6 Log fill run (extension → Hargen API)

```text
POST /api/ops/extension/fill-run
```

```json
{
  "projectId": "proj_123",
  "workSessionId": "ws_456",
  "portalFieldSetId": "pfs_abc123",
  "portalUrl": "https://permits.example.gov/application/new",
  "browserExtensionVersion": "0.1.0",
  "status": "PARTIAL",
  "detectedFields": [
    { "portalLabel": "Owner Name", "selector": "input#ownerName", "detected": true }
  ],
  "matchedFields": [
    { "fieldId": "owner_name", "portalLabel": "Owner Name", "matched": true }
  ],
  "filledFields": [
    { "fieldId": "owner_name", "valueWritten": "Maria Garcia", "success": true }
  ],
  "unfilledFields": [
    { "fieldId": "valuation", "reason": "MISSING_VALUE" },
    { "fieldId": "scope_of_work", "reason": "USER_UNCHECKED_REVIEW" }
  ]
}
```

Hargen creates `PortalFillRun` + `WorkActivityEvent`.

### 8.7 Mark submission complete (manual, Cody-triggered)

After Cody manually submits on portal:

Extension popup or app button: **Mark permit submitted**

```json
{
  "projectId": "proj_123",
  "workSessionId": "ws_456",
  "portalFillRunId": "pfr_999",
  "eventType": "SUBMISSION_MARKED_COMPLETE",
  "metadata": {
    "permitNumber": "BP-2026-12345",
    "submittedAt": "2026-05-31T10:40:00Z",
    "receiptDocumentId": "doc_222"
  }
}
```

AI may then draft client update from session events. Cody approves before send.

---

## 9) WorkActivityEvent types (audit trail)

Minimum event vocabulary for assistant + extension loop:

| Event type | Emitted by |
|------------|------------|
| `WORK_SESSION_STARTED` | App |
| `DOCUMENT_UPLOADED` | App |
| `AI_EXTRACTION_STARTED` | App |
| `AI_EXTRACTION_COMPLETED` | App |
| `FACT_APPROVED` | App |
| `FACT_CORRECTED` | App |
| `MISSING_INFO_FLAGGED` | App |
| `PORTAL_FIELD_SET_DRAFTED` | App |
| `PORTAL_FIELD_SET_APPROVED` | App |
| `PORTAL_FILL_RUN_STARTED` | Extension |
| `PORTAL_FIELDS_FILLED` | Extension |
| `PORTAL_FILL_RUN_COMPLETED` | Extension |
| `SUBMISSION_MARKED_COMPLETE` | App or extension |
| `CLIENT_UPDATE_DRAFTED` | App |
| `CLIENT_UPDATE_APPROVED` | App |
| `FOLLOW_UP_CREATED` | App |
| `WORK_SESSION_ENDED` | App |

Every extension action must attach to `workSessionId` + `projectId`.

---

## 10) Standard fact keys (starter canon)

Reuse across modules and mapping templates:

```text
customer.name
customer.email
customer.phone
site.address
site.apn
utility.name
utility.accountNumber
ahj.name
solar.systemSizeKwDc
solar.moduleCount
solar.moduleModel
solar.inverterModel
battery.model
electrical.mainPanelSize
permit.number
permit.status
permit.approvedDate
inspection.finalStatus
inspection.finalPassedDate
interconnection.applicationNumber
interconnection.tariffType
pto.status
pto.approvedDate
company.licenseNumber
```

`interconnection.tariffType` examples: `NEM_2`, `NBT`, `GRANDFATHERED`, `UNKNOWN`.

---

## 11) Security and privacy constraints

- Extension host permissions: allowlist per AHJ/utility profile, not global web access
- No client project data in shared mapping templates
- No passwords in extension storage or payloads
- Fill runs logged with audit metadata; retain evidence for billing disputes
- Approved field sets invalidated (`EXPIRED`) when underlying approved facts change
- Staff token scoped; revocable; no client-portal tokens for extension

---

## 12) Readiness gate — do not ship extension until

Manual loop works in app without extension:

```text
[ ] Create client → customer → project
[ ] Upload contract + plan set
[ ] AI extracts facts → Cody approves fact table
[ ] AI drafts PortalFieldSet → Cody approves
[ ] Cody manually copies approved values into real portal — succeeds
[ ] Cody marks submission complete → session summary + follow-up generated
```

Then extension replaces manual copy only. Same approval gate, same payload.

---

## 13) Build sequence (this spec)

| Step | Deliverable | Extension needed? |
|------|-------------|-------------------|
| 1 | Client → customer → project models + admin UI | No |
| 2 | Work session + activity events | No |
| 3 | Fact extraction + approval UI | No |
| 4 | PortalFieldSet draft + approval UI | No |
| 5 | Manual copy workflow + session close summary | No |
| 6 | Extension auth + pull approved set | Yes (MVP) |
| 7 | Extension detect + preview + fill + log | Yes |
| 8 | Shared AHJ/utility mapping templates | Yes (quality) |
| 9 | Mark submitted + comms draft from session | App (+ extension trigger) |

---

## 14) Success criteria

- Cody rarely types from scratch on repeat portals
- Every filled value traces to an approved fact or approved draft
- Extension never fills unapproved data
- Return to project months later → facts reload → new field set drafts delta only
- Proof-of-work and billing evidence generated from session + fill run, not reconstructed

---

## 15) One-line summary

**The AI Assistant is where typing gets drafted and approved. The extension is where approved typing gets applied. Cody verifies both and submits manually. Hargen remembers everything.**
