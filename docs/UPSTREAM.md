# Upstream watch policy

claude-project-flow delegates certain scopes to external plugins. The most-used one is `obra/superpowers`. Since superpowers has had documented flip-flops between minor releases (see their RELEASE-NOTES), we maintain a minimal watch policy to decide when to adopt upstream changes.

## Scope

This document tracks **only the skills we delegate to** — not the entire superpowers plugin.

Currently delegated:
- `superpowers:writing-plans` (from `/project-flow:plan`)
- `superpowers:test-driven-development` (optional, via config mapping)
- `superpowers:brainstorming` (manual user invocation, not our routing)

## Check cadence

- On each minor release of superpowers, review diff
- Never blindly merge — evaluate each change against our flow

## Adoption criteria

Adopt a change from upstream only if it satisfies ALL of:
1. It solves a concrete problem we have observed
2. It does not conflict with our file paths (`.project-flow/...` vs their `docs/superpowers/...`)
3. It does not add a hard gate that breaks our workflow
4. The change is stable (not reverted in subsequent minor)

Do NOT adopt just because "it's newer" or "it looks nice".

## Checked versions

| superpowers version | Date checked | Adopted | Notes |
|---|---|---|---|
| 5.0.7 | 2026-04-21 | n/a | Initial assessment during v0.2.0 design |

Keep this table updated on each check.
