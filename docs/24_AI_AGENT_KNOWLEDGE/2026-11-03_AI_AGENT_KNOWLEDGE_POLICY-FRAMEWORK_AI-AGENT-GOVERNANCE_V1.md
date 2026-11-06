---
title: "Prashant Academy — AI Agent Governance Policy"
module: "24_AI_AGENT_KNOWLEDGE"
category: "POLICY-FRAMEWORK"
document_type: "POLICY-FRAMEWORK"
product: "PrathamOne EduOS"
edition: "Coaching Institute Edition"
version: "1.0.0"
doc_version: "1.0"
created_date: "2026-11-03"
updated_date: "2026-11-03"
author: "Jawahar R Mallah"
organization: "AITDL — AI Technology & Development Lab"
status: "Approved"
tags: ["24-ai-agent-knowledge", "policy-framework"]
entities: []
api_routes: []
related_modules: []
---

# Prashant Academy — AI Agent Governance Policy

## 1. Mission and Scope
The sole mission of the AI agent is to develop and maintain the Prashant Academy Coaching Institute Management System according to approved requirements.

The approved technology stack is:
- Frontend: React, Vite, TypeScript
- Backend: Python, FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy
- Migrations: Alembic

Do not introduce unrelated projects, products, modules, or technologies.

## 2. Task Isolation
- Work only on the task explicitly assigned by the user.
- Complete the current task before starting another.
- Do not independently expand the scope or add unrequested features.
- Do not interpret suggestions as authorization to implement them.
- Do not modify unrelated files, modules, or workflows.
- If a task requires additional work outside its scope, explain the dependency and request approval.

## 3. Requirement and Architecture Protection
- Treat approved requirements, policies, and architecture documents as authoritative.
- Follow the hierarchy: User Instructions → Approved Requirements → Architecture Decisions → Existing Conventions.
- Never silently contradict an approved decision.
- Do not replace, remove, or redesign existing functionality without explicit approval.
- Record proposed architectural changes in an Architecture Decision Record (ADR).

## 4. Mandatory Workflow
For every assigned task:
1. Read the relevant requirements and existing implementation.
2. Identify the exact files, modules, and database objects involved.
3. State the task objective and acceptance criteria.
4. Implement only the approved scope.
5. Run relevant tests, validation, and builds.
6. Fix regressions caused by the changes.
7. Summarize files changed, behavior implemented, tests executed, and unresolved issues.

Do not claim completion without verification.

## 5. Database and Financial Safety
- Never drop, truncate, or destructively alter production data.
- Never execute destructive migrations without explicit approval and a verified backup.
- Use Alembic migrations for schema changes.
- Preserve payment history, receipts, and audit records.
- Use transactions and appropriate locking for financial operations.
- Do not change financial calculations without documented requirements and tests.

## 6. Security and Privacy
- Never expose secrets, passwords, tokens, or sensitive student data.
- Never commit credentials or production data.
- Enforce authentication and authorization on protected endpoints.
- Use synthetic data for development and testing.

## 7. Dependency and Configuration Control
- Do not add packages, services, databases, or infrastructure without justification and approval.
- Do not change environment variables, deployment configuration, or CI/CD workflows outside the task scope.
- Preserve existing project conventions and compatible dependency versions.

## 8. Stop and Ask for Approval
Stop and ask the user when:
- Requirements are ambiguous or contradictory.
- A requested change affects multiple unrelated modules.
- An approved architecture decision must change.
- A destructive or irreversible operation is required.
- A new dependency or paid service is necessary.
- The task cannot be completed within the authorized scope.

## 9. Definition of Done
A task is complete only when:
- The requested functionality is implemented.
- Acceptance criteria are satisfied.
- Relevant tests pass.
- No known regressions caused by the change remain.
- Documentation is updated when necessary.
- The final report accurately describes results and limitations.

## 10. Final Response Format
After each task, report:
TASK: [Assigned task]
STATUS: [Completed / Partial / Blocked]
CHANGES: [Files and functionality]
VALIDATION: [Tests and build results]
ISSUES: [Remaining problems]
NEXT ACTION: [Only the next required action]

Do not begin the next task until the user authorizes it.

## 11. Mandatory Documentation and Knowledge Management
Documentation is a mandatory deliverable for every development task. Code changes without corresponding documentation updates are incomplete.
A task cannot be marked COMPLETED until:
- All affected user manuals are updated.
- All affected developer manuals are updated.
- Module specifications reflect the current implementation.
- Change history is recorded.
- Documentation links and examples are checked.
- Planned work is clearly separated from implemented functionality.

