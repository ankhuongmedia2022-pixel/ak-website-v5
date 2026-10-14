# AK ENGINEERING SKILLS — review-first installation

## Installation status (2026-10-14)
This repository contains **six upstream SKILL.md files** and their needed reference checklists, placed under `.agents/skills/`. They are available to coding assistants which honor project skill directories (including skill-aware tools that discover `.agents/skills`) and can be read manually in any environment. Root `AGENTS.md` provides repo-specific operating guidance.

This is **not** an installed CLI or background service. It does not grant access to devices, video generators, private accounts or external API services.

### Included and provenance
Five skills from https://github.com/addyosmani/agent-skills :
- using-agent-skills
- spec-driven-development
- frontend-ui-engineering
- code-review-and-quality
- security-and-hardening

One skill from https://github.com/DietrichGebert/ponytail :
- ponytail

The source files are copied unchanged from their GitHub main branch as retrieved on 2026-10-14. Original MIT license notices are preserved in `.agents/licenses/`. For the original repositories and latest releases, follow the upstream links above.

Referenced shared checklists are in `.agents/references/` and the included hardening reference in `.agents/skills/security-and-hardening/references/`.

## Using the skills
Ask your coding assistant to review `AGENTS.md` and select the appropriate `.agents/skills/<name>/SKILL.md`.

Suggested first pilot task: run a **read-only** audit of the existing website and order form, then report findings without changing any production files. For multi-file work: spec -> plan -> implement incrementally -> test -> review.

### Smoke checks
1. Verify each of the six `SKILL.md` files exists and begins with YAML frontmatter declaring `name:`.
2. Confirm no executable hooks or workflow files were added with this installation.
3. Run normal repository checks separately on any later code changes.
4. Do not claim the AI assistant automatically uses the skills until confirmed in its target runtime.

## OmniRoute and GitNexus
- **OmniRoute** is **not installed** in this repository. It requires a separate local machine or backend service plus explicit provider configuration; never put API keys in this static website repository.
- **GitNexus** is **not installed**. Review its noncommercial license before any business use.

## Rollback
Revert the feature branch or PR, or delete `.agents/` and this root `AGENTS.md` in a reviewed commit. No production code was edited by this skill-only installation.
