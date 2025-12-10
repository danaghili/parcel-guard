# Multi-Claude Role Setup

This folder contains role-specific instruction files for running multiple Claude Code instances in parallel, each with a distinct responsibility.

## The Roles

| Role          | File                  | Responsibility                                    |
| ------------- | --------------------- | ------------------------------------------------- |
| **Planner**   | `CLAUDE-PLANNER.md`   | Analyse requirements, create implementation plans |
| **Architect** | `CLAUDE-ARCHITECT.md` | System design, patterns, file structure decisions |
| **Developer** | `CLAUDE-DEVELOPER.md` | Write implementation code following the plan      |
| **Reviewer**  | `CLAUDE-REVIEWER.md`  | Review code against standards, identify issues    |
| **Tester**    | `CLAUDE-TESTER.md`    | Run tests, write new tests, report failures       |

## Shared Standards

All roles reference `CLAUDE.md` for shared project standards. Role files define _what each role does_ while CLAUDE.md defines _how things should be done_.

## Workflow

```
┌──────────┐     ┌───────────┐     ┌───────────┐
│ PLANNER  │ ──▶ │ ARCHITECT │ ──▶ │ DEVELOPER │
└──────────┘     └───────────┘     └─────┬─────┘
                                         │
                                         ▼
                                   ┌───────────┐
                              ┌─── │  TESTER   │ (can run parallel)
                              │    └───────────┘
                              │
                              ▼
                        ┌───────────┐
                        │ REVIEWER  │
                        └─────┬─────┘
                              │
                              ▼
                    [Issues?] ──▶ Back to DEVELOPER
                        │
                        ▼ (No issues)
                    [Merge & Deploy]
```

## Quick Start

### Option 1: Startup Prompts

Open multiple terminals and start each with a role prompt:

```bash
# Terminal 1 - Planner
claude --prompt "Read CLAUDE-PLANNER.md for your role. You are the Planner for this session. Do not write implementation code."

# Terminal 2 - Architect
claude --prompt "Read CLAUDE-ARCHITECT.md for your role. You are the Architect for this session."

# Terminal 3 - Developer
claude --prompt "Read CLAUDE-DEVELOPER.md for your role. You are the Developer for this session. Follow the plan and architecture provided."

# Terminal 4 - Reviewer
claude --prompt "Read CLAUDE-REVIEWER.md for your role. You are the Reviewer for this session. Do not fix issues, only identify them."

# Terminal 5 - Tester
claude --prompt "Read CLAUDE-TESTER.md for your role. You are the Tester for this session."
```

### Option 2: Shell Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias claude-plan='claude --prompt "Read CLAUDE-PLANNER.md. You are the Planner. Create implementation plans, do not write code."'
alias claude-arch='claude --prompt "Read CLAUDE-ARCHITECT.md. You are the Architect. Make design decisions, do not implement."'
alias claude-dev='claude --prompt "Read CLAUDE-DEVELOPER.md. You are the Developer. Implement the plan, follow the architecture."'
alias claude-review='claude --prompt "Read CLAUDE-REVIEWER.md. You are the Reviewer. Review code, identify issues, do not fix them."'
alias claude-test='claude --prompt "Read CLAUDE-TESTER.md. You are the Tester. Run and write tests, report failures."'
```

Then just run `claude-plan`, `claude-dev`, etc.

## Typical Session Examples

### Starting a New Feature

1. **Terminal 1 (Planner):** "We need to add user notifications. Create an implementation plan."
2. Review and approve the plan
3. **Terminal 2 (Architect):** "Based on this plan, design the notification system architecture."
4. Review and approve the architecture
5. **Terminal 3 (Developer):** "Implement task 1 from the plan following the architecture."

### Parallel Development + Testing

1. **Terminal 1 (Developer):** Working on feature implementation
2. **Terminal 2 (Tester):** Running regression tests, writing tests for completed tasks

### Code Review Cycle

1. **Terminal 1 (Developer):** Completes implementation
2. **Terminal 2 (Reviewer):** Reviews the changes
3. **Terminal 1 (Developer):** Addresses review feedback
4. Repeat until approved

## Tips

- **Don't run all 5 simultaneously** - typically 2-3 at a time makes sense
- **Planner → Architect → Developer** is the natural sequence for new features
- **Developer + Tester** work well in parallel
- **Reviewer** comes in after implementation, before merge
- Each role should re-read their role file if they start drifting

## File Locations

Copy these files to your project root alongside `CLAUDE.md`:

```
your-project/
├── CLAUDE.md              # Shared standards (required)
├── CLAUDE-PLANNER.md      # Planner role
├── CLAUDE-ARCHITECT.md    # Architect role
├── CLAUDE-DEVELOPER.md    # Developer role
├── CLAUDE-REVIEWER.md     # Reviewer role
├── CLAUDE-TESTER.md       # Tester role
└── ...
```
