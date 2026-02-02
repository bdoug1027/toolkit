# Boston's Productivity Toolkit

> Personal productivity system powered by AI

## Quick Start

Just talk to me naturally:

| Want to... | Say something like... |
|------------|----------------------|
| Track a project | "Add project [name]" |
| Capture a thought | "Note: [anything]" or "Idea: [anything]" |
| Set a reminder | "Remind me to [action] [when]" |
| Add a task | "Task: [what needs doing]" |
| Add a contact | "Add contact [name] at [company]" |
| Prep for a call | "Prep me for [name]" |
| Request research | "Research [topic]" |
| Create content | "Write a [type] about [topic]" |
| Check status | "What are we working on?" |
| Get review | "Generate weekly review" |

---

## The System

| Tool | Purpose | File |
|------|---------|------|
| **Project Tracker** | Track all projects, status, decisions | [PROJECTS.md](PROJECTS.md) |
| **Quick Capture** | Inbox for thoughts, tasks, ideas | [CAPTURE.md](CAPTURE.md) |
| **Client CRM** | People and relationship management | [CLIENTS.md](CLIENTS.md) |
| **Research Agent** | Async deep research with reports | [RESEARCH.md](RESEARCH.md) |
| **Content Writer** | Blog, social, email drafts | [CONTENT.md](CONTENT.md) |
| **Weekly Review** | Automated summary every Sunday 8 PM | [WEEKLY-REVIEW.md](WEEKLY-REVIEW.md) |

---

## Folder Structure

```
toolkit/
├── README.md            # This file
├── PROJECTS.md          # Master project tracker
├── CAPTURE.md           # Quick capture inbox
├── CLIENTS.md           # Contact CRM index
├── RESEARCH.md          # Research queue & reports
├── CONTENT.md           # Content calendar & drafts
├── WEEKLY-REVIEW.md     # Weekly reviews
├── projects/            # Individual project files
├── clients/             # Individual contact files
├── research/            # Research report files
├── content/             # Content draft files
└── captures/            # Raw capture files
```

---

## Automation

- **Weekly Review:** Cron job runs Sunday 8 PM MST, generates review and pings Telegram
- **Memory Integration:** Links to MEMORY.md and memory/*.md for context

---

Built: 2026-02-02
