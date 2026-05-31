# Hargen AI Ops Layer — Canon End-to-End Execution Plan

**Purpose:** Define the full execution plan to build Hargen's AI Ops Layer safely, predictably, and in the correct order (foundation first).  
**Scope:** Planning only (no implementation details or code).  
**Primary outcome:** Turn repetitive solar admin work into reusable project context, approved facts, guided execution, proof-of-work, and faster follow-through.

**Related docs:**
- [ai-platform-foundation.md](./ai-platform-foundation.md) — shared AI infrastructure (ingest, runner, audit, limits)
- [ai-assistant-extension-interface-spec.md](./ai-assistant-extension-interface-spec.md) — assistant + extension handshake

---

## 1) Canon Product Statement

Hargen stores approved project context once, then reuses it across permit, interconnection, CRM cleanup, customer updates, scheduling, and reporting.  
AI prepares and drafts. Cody reviews and approves. Hargen records the work trail. Portal assist tools fill reviewed data. Cody submits.

---

## 2) Non-Negotiable Ownership Boundaries (Critical)

### Tenant ownership (client-scoped data)
- Customers belong to clients.
- Projects belong to clients (through their customers).
- Project facts belong to the client's projects.
- Project documents, work history, and follow-up tasks are client-scoped.
- No global "all customers" or "all projects" operating list across Hargen.

### Hargen platform ownership (shared intelligence)
- Building department (AHJ) profiles belong to Hargen.
- Utility profiles belong to Hargen.
- Portal behavior/mapping intelligence belongs to Hargen.
- Common rejection patterns, correction patterns, and timing intelligence belong to Hargen.
- Shared intelligence must never expose one client's private project content to another client.

### Rule to enforce in every phase
- Project data is tenant-private.
- Infrastructure intelligence is platform-shared.
- Shared intelligence can reference patterns, not client-identifiable confidential content.

---

## 3) Core Operating Principles

1. **Foundation before automation:** context and approved facts come first.
2. **Approval gate everywhere:** AI outputs are drafts until approved.
3. **Human submission control:** no auto-submit, no legal declaration by AI.
4. **Structured memory over chat memory:** facts and events must be queryable.
5. **Session-based work capture:** explicit start/end work sessions, not hidden surveillance.
6. **Evidence preservation:** source documents and action history remain auditable.
7. **Modular execution:** permit/interconnection/CRM/update modules over one vague assistant.

---

## 4) Target System Shape (Planning View)

The operating model has five major layers:

1. **Project Context Layer**  
   Client -> Customer -> Project -> Documents, facts, history, issues, follow-ups.

2. **Work Session + Proof-of-Work Layer**  
   Explicit sessions, activity events, outcomes, time usage, next actions.

3. **AI Admin Assistant Layer**  
   Extracts, drafts, flags missing/conflicting info, proposes actions.

4. **Work Module Layer**  
   Permit, interconnection/PTO, CRM cleanup, customer updates, scheduling, quote support.

5. **Portal Assist Layer (later)**  
   Reviewed field mapping and fill assistance, with manual submission.

---

## 5) Canon Data Domains (Planning Taxonomy)

### A) Client domain (tenant private)
- Client profile
- End customers
- Projects/jobs/requests
- Project documents
- Approved and extracted facts
- Work sessions and activity events
- Draft outputs and approvals
- Client/customer communications
- Follow-up tasks and issue records

### B) Hargen intelligence domain (platform shared)
- AHJ profiles and requirements
- Utility profiles and requirements
- Portal field dictionaries
- Mapping templates by portal type
- Common failure/rejection patterns
- Correction recommendations
- Timing benchmarks and follow-up heuristics

### C) Security/privacy domain
- Access controls and role boundaries
- Data retention and audit policy
- Action logging and approval traceability
- Sensitive-field handling and redaction policy

---

## 6) End-to-End Workflow Canon

### Standard execution loop
1. Select client.
2. Select customer/project.
3. Select work type.
4. Start work session.
5. Load known project context.
6. AI presents confirmed, low-confidence, missing, and conflicting info.
7. Cody approves/corrects.
8. System generates module outputs (field set, checklist, updates, tasks).
9. Cody reviews, executes submission steps manually.
10. System logs proof-of-work, waiting-on reason, and next action.
11. Session closes with summary and follow-up schedule.

### Long-gap continuity loop (months later)
1. Reopen same project.
2. Start new work session with new work type.
3. Reuse approved facts automatically.
4. Request only net-new required data.
5. Continue without rebuilding context from scratch.

---

## 7) Program Structure and Workstreams

Run this as parallel workstreams with staged dependencies:

### Workstream A: Product and domain design
- Canon glossary and naming rules.
- Work type taxonomy and module boundaries.
- Approval lifecycle definitions (draft -> approved -> applied).
- Confidence and conflict handling standards.

### Workstream B: Data architecture and governance
- Tenant scoping policy for customers/projects/facts/events.
- Shared intelligence policy for AHJ/utility artifacts.
- Evidence and retention policy.
- Audit and traceability standards.

### Workstream C: UX and operator flow
- Work session UX.
- Fact review UX.
- Missing/conflict resolution UX.
- Proof-of-work and follow-up UX.

### Workstream D: AI operations and quality
- Extraction playbooks per document type.
- Module prompt strategies and validation checks.
- Hallucination containment and fallback behavior.
- Human approval checkpoints.

### Workstream E: Delivery operations
- Milestone gating criteria.
- Rollout strategy (internal -> pilot -> broader release).
- Training and SOPs.
- KPIs and quality dashboards.

---

## 8) Phased Delivery Plan (Recommended Order)

## Phase 0 — Canon and readiness
**Goal:** Align the business and product rules before build acceleration.  
**Outputs:**
- Canon glossary and ownership matrix (tenant vs shared intelligence).
- Approval and risk policy.
- Success metric baseline.
- Pilot client selection criteria.
**Exit criteria:** All owners aligned on what is in/out for first production release.

## Phase 1 — Project context foundation
**Goal:** Establish durable project memory.  
**Outputs:**
- Client-scoped customer/project records.
- Project timeline and document context.
- Basic project status and dependencies.
**Exit criteria:** Teams can reopen any project and recover context quickly without note-hunting.

## Phase 2 — Work session and proof-of-work foundation
**Goal:** Capture real execution trail.  
**Outputs:**
- Session start/end workflow.
- Activity event capture.
- Session summary and next-action output.
- Waiting-on reason and follow-up date standardization.
**Exit criteria:** Every meaningful work period can produce auditable proof-of-work.

## Phase 3 — Approved facts and review engine
**Goal:** Separate extracted data from approved operational truth.  
**Outputs:**
- Fact extraction flows.
- Fact review/approval/correction workflows.
- Missing/conflict detection.
- Source tracking and confidence indicators.
**Exit criteria:** Modules can reuse approved facts with low rework and explicit trust status.

## Phase 4 — Permit assistant module
**Goal:** Reduce permit prep cycle time with structured output.  
**Outputs:**
- Permit checklist logic.
- Permit field set draft and review.
- Upload checklist and submission prep.
- Permit-specific client update and follow-up output.
**Exit criteria:** Permit prep becomes faster and more consistent than current manual flow.

## Phase 5 — Interconnection/PTO assistant module
**Goal:** Reuse permit context and handle utility-specific delta work.  
**Outputs:**
- Interconnection checklist logic.
- Utility field set draft and review.
- Deficiency tracking and follow-up logic.
- PTO progression tracking.
**Exit criteria:** Months-later interconnection work starts with immediate context reuse.

## Phase 6 — CRM cleanup and communication modules
**Goal:** Normalize messy status information and communication quality.  
**Outputs:**
- CRM cleanup workflow and normalized status taxonomy.
- Client and customer draft updates with approval gates.
- Scheduling readiness support.
**Exit criteria:** Status ambiguity and communication inconsistency decline measurably.

## Phase 7 — Portal assist MVP
**Goal:** Speed data entry while preserving operator control.  
**Outputs:**
- Reviewed field mapping preview.
- Selective fill of approved fields.
- Fill event logging back to work session timeline.
**Exit criteria:** Faster portal entry with no loss of submission control.

## Phase 8 — AHJ/utility intelligence layer
**Goal:** Convert repeated failures into reusable prevention.  
**Outputs:**
- Structured AHJ and utility profiles.
- Common rejection/correction intelligence.
- Contextual warnings before submission.
**Exit criteria:** Repeat rejection classes decline over time.

## Phase 9 — Client-facing reporting layer
**Goal:** Strengthen trust and billing clarity.  
**Outputs:**
- Daily/weekly work reports.
- Completed/waiting/next-action summaries.
- Internal vs client-safe reporting views.
**Exit criteria:** Reporting is generated from session evidence, not reconstructed manually.

---

## 9) Governance Model

### Decision rights
- **Cody:** Final approval authority for facts, submissions, and outgoing communications.
- **AI system:** Preparation, extraction, drafting, mapping, and issue flagging only.
- **Hargen platform owners:** Shared AHJ/utility intelligence stewardship and quality review.

### Change control
- Define "critical workflow" changes that require sign-off (fact approval logic, submission flow, message send behavior).
- Require documented rollback plan for each major release phase.
- Maintain a live decision log for policy exceptions and scope changes.

### Data governance
- Tenant isolation checks are required for each release gate.
- Shared intelligence updates require scrub/redaction review.
- Keep evidence references for every approved fact used in external submissions.

---

## 10) Quality, Risk, and Safety Plan

### Quality gates (every phase)
- Workflow completion rate target.
- Manual correction rate trend.
- Approval turnaround time.
- Session completion quality (summary + next action present).

### AI risk controls
- Draft-only defaults for all AI outputs.
- Mandatory human approval before external use.
- Confidence thresholds and conflict alerts.
- Clear fallback path when extraction fails or confidence is low.

### Hard safety constraints
- No hidden monitoring.
- No password capture.
- No automatic legal submission/signature/payment.
- No AI-only billing approval.
- No silent overwrite of approved facts.

---

## 11) KPI Framework (Business and Operational)

### Speed KPIs
- Median time to prepare permit packet.
- Median time to prepare interconnection packet.
- Time-to-context when reopening an old project.

### Quality KPIs
- Rejection/correction rate by AHJ and utility.
- Missing-info rate at submission moment.
- Fact correction rate after initial extraction.

### Throughput KPIs
- Projects handled per week per operator.
- Sessions completed per day.
- Follow-up completion SLA adherence.

### Trust KPIs
- Client update consistency and timeliness.
- Billing dispute reduction.
- Evidence completeness for reported work.

---

## 12) Pilot and Rollout Strategy

### Pilot scope
- Start with a small number of cooperative clients.
- Focus first on permit workflow only.
- Use high-frequency project types to gather quick feedback loops.

### Rollout stages
1. Internal dry runs.
2. Controlled pilot clients.
3. Broader permit rollout.
4. Interconnection rollout.
5. CRM/update module rollout.
6. Portal assist rollout.

### Rollout guardrails
- No phase expansion until prior phase quality gates are met.
- Keep manual fallback available for all critical workflows.
- Freeze new module scope when defect rate exceeds threshold.

---

## 13) Operating Cadence

### Weekly cadence
- Review KPI dashboard and pilot feedback.
- Review top rejection/failure causes.
- Approve intelligence profile updates (AHJ/utility).
- Prioritize next iteration backlog.

### Monthly cadence
- Reassess phase readiness and risk posture.
- Audit tenant isolation and data handling policies.
- Review client value evidence (speed, quality, reporting gains).

### Quarterly cadence
- Strategic module roadmap updates.
- Pricing and packaging implications from real usage data.
- Governance and compliance policy refresh.

---

## 14) Roles and Accountability

### Product owner
- Owns canon, scope boundaries, and phase goals.

### Operations lead
- Owns SOPs, session discipline, and quality outcomes.

### AI quality lead
- Owns extraction quality, confidence policy, and model behavior review.

### Platform lead
- Owns tenant isolation, data governance, and release safety.

### Client success lead
- Owns communication standards, reporting clarity, and trust metrics.

---

## 15) Dependencies and Preconditions

- Stable tenant-scoped client/customer/project hierarchy.
- Reliable document ingestion and retrieval.
- Role-based access and approval controls.
- Session logging capability and report generation path.
- Defined taxonomy for statuses, work types, and issue categories.

---

## 16) Anti-Patterns to Avoid

- Building extension-first without approved facts.
- Building open-ended "chat first" without project memory.
- Storing critical truth in free-text blobs.
- Auto-sending communications without approval.
- Mixing client-private project data into global intelligence.
- Expanding modules before permit/interconnection loops are stable.

---

## 17) Final Execution Checklist (Program-Level)

- [ ] Canon product statement finalized and shared.
- [ ] Ownership matrix approved (client-owned vs Hargen-owned domains).
- [ ] Phase 0 readiness complete.
- [ ] Phase 1 context foundation complete.
- [ ] Phase 2 session/proof-of-work complete.
- [ ] Phase 3 approved facts complete.
- [ ] Phase 4 permit module stable.
- [ ] Phase 5 interconnection module stable.
- [ ] Phase 6 CRM/communications modules stable.
- [ ] Phase 7 portal assist MVP stable.
- [ ] Phase 8 intelligence layer active with measurable rejection reduction.
- [ ] Phase 9 reporting layer adopted and trusted by clients.

---

## 18) Canon Summary

The business advantage is not "AI that watches everything."  
The advantage is a disciplined execution system:
- Tenant-private project memory for each client,
- Shared Hargen AHJ/utility intelligence,
- AI-prepared but human-approved workflows,
- Repeatable proof-of-work and follow-through.

Build the foundation first. Every later automation depends on it.

