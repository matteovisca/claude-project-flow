---
name: project-init
description: Initialize a project in project-flow — analyze codebase, create definition, register in DB
---

# Project Init

Initialize the current project in claude-project-flow. Analyzes the codebase and registers in the DB.

## Parameters
- `$ARGUMENTS` — Project name override (optional, defaults to git root directory name)

## Step 1: Detect project

- Get name from git root basename (or `$ARGUMENTS`)
- Get path from git root
- Detect type from codebase (app, library, plugin, service)
- Present and ask for confirmation

## Step 2: Analyze codebase

Launch an Explore agent to examine:
1. Project structure, entry points, build system
2. Stack (language, framework, runtime)
3. Dependencies grouped by purpose
4. Architectural patterns
5. Code patterns (naming, error handling, DI)
6. Configuration and testing setup

Draft a `project-definition.md` content with standard template.

## Step 3: Interactive refinement

Present draft and ask:
1. "Is the description accurate? Business context?"
2. "Architectural decisions not obvious from code?"
3. "Team conventions not in code?"

## Step 4: Register

1. Call `project_register` with name, path, type
2. The definition content is stored in the `projects.definition` column

The definition can be viewed and edited in the dashboard under the project tree.

## Step 5: Report

> **Progetto registrato: {name}**
> - Path: {path}
> - Type: {type}
> - Definition: salvata nel DB
>
> Prossimo passo: `/feature-init <name>` per iniziare a tracciare feature
