---
description: Initialize a project in project-flow — analyzes codebase, creates project-definition.md, registers in DB
---

# Project Init

Initialize the current project in claude-project-flow.

## Parameters
- `$ARGUMENTS` — Project name override (optional, defaults to git root directory name)

## Step 1: Detect project

- Get project name from the git root directory basename (or use `$ARGUMENTS` if provided)
- Get project path from git root
- Get project type: detect from codebase (app, library, shared)
- Present to the user and ask for confirmation/override

## Step 2: Determine docs path

1. Call `project_flow__settings_get` to read settings
2. Check if `project_overrides[project_name]` exists → use that
3. Otherwise use `default_projects_path/project_name/`
4. If neither is set, ask the user and suggest running `/claude-project-flow:setup` first
5. Present the resolved path and ask for confirmation

## Step 3: Create directory structure

Create the project docs directory:
```
<resolved_path>/
├── project-definition.md    — Generated in step 4
└── features/                — Empty, used by /feature-init later
```

## Step 4: Analyze codebase

Launch an Explore agent to analyze the repository. The agent should examine:

1. **Project structure** — directory layout, entry points, build system
2. **Stack** — language, framework, runtime, build tools
3. **Dependencies/Libraries** — from package.json, requirements.txt, Cargo.toml, .csproj, go.mod, etc. Group by purpose (runtime, dev, testing)
4. **Architectural patterns** — MVC, layered, hexagonal, monorepo, microservices, etc.
5. **Code patterns** — naming conventions, error handling approach, state management, DI
6. **Configuration** — env files, config files, feature flags
7. **Testing** — framework, coverage setup, test organization

From the analysis, draft a `project-definition.md` with this structure:

```markdown
# Project: <name>

## Overview
<!-- 2-3 sentences describing what this project does -->

## Stack
| Layer | Technology |
|-------|-----------|
| Language | ... |
| Framework | ... |
| Build | ... |
| Database | ... |
| Testing | ... |

## Directory Structure
<!-- Key directories and their purpose, tree format -->

## Libraries
### Runtime
- **<library>** — purpose

### Development
- **<library>** — purpose

## Patterns
### Architecture
<!-- Architectural patterns identified -->

### Code Conventions
<!-- Naming, file organization, import style -->

### Error Handling
<!-- How errors are managed -->

## Configuration
<!-- Config files, env vars, feature flags -->

## Notes
<!-- Anything else relevant -->
```

## Step 5: Interactive refinement

Present the draft to the user and ask targeted questions:

1. "Is the project description accurate? What's the business context?"
2. "Are there architectural decisions not obvious from the code?"
3. "Any conventions or rules the team follows that aren't in the code?"
4. "Anything to add about the libraries or their usage?"

Incorporate the answers into the document.

## Step 6: Save and register

1. Write the final `project-definition.md` to the docs path
2. Call `project_flow__project_register` with:
   - `name`: project name
   - `path`: git root path
   - `type`: detected type (app/library/shared)
3. Report what was created:
   - Docs path and files created
   - DB registration confirmation
   - Suggest next steps: `/claude-project-flow:feature-init <name>` to start tracking features
