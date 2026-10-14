# An Khương Media — Coding Agent Instructions

Scope: this repository (AK website). These instructions coordinate optional coding-agent skills; they do not execute software or alter production.

## Skills available locally
All instruction files are under `.agents/skills/<skill>/SKILL.md`:
- `using-agent-skills`: decide which workflow applies.
- `spec-driven-development`: clarify requirements and acceptance criteria for significant changes.
- `frontend-ui-engineering`: responsive, accessible UI changes.
- `code-review-and-quality`: code review before merging.
- `security-and-hardening`: threat modeling and boundary checks.
- `ponytail`: prefer the smallest change that fully solves the task.

Read the relevant skill's SKILL.md before beginning work. Follow its process where appropriate; do not assume tools or permissions the runtime does not provide. References are stored in `.agents/references/`. The upstream project and license notices are documented in `.agents/README.md`.

## Repo-specific priorities
- Preserve existing website pages, forms, order checkout behavior and deployed endpoints.
- Do not change production API behavior, payment/order routing, secrets, third-party integrations or GitHub Actions without explicit authorization and targeted tests.
- Never commit API keys, tokens, personal data, customer details or private social-account credentials.
- Do not access or operate the owner's personal Facebook account.
- Keep dependencies minimal; avoid new build tools for this largely static HTML/CSS/JS website.
- For changes involving `order.js`, run `node --check order.js` and, when available, `node --test tests/order.test.cjs`. Do not claim production order-delivery verification from mocked tests.
- Report what was changed, tests actually run, unresolved risks, and rollback steps.
- If upstream instructions conflict with the user's explicit request or repository safety rules, follow the higher-priority safety requirements.

## Safety of this installation
The skill pack is Markdown only. No executables, lifecycle hooks or AI gateway are installed by these files.
Changes are prepared on a feature branch for review; merging into main must be a deliberate step.
