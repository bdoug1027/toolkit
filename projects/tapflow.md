# Tapflow

> AI-powered lead generation pipeline

## Status: 🟡 In Progress

**Started:** 2026-01-30  
**Priority:** High  
**Location:** `/Users/cmsclawdbot/.openclaw/workspace/tapflow`

---

## Goal
Fully automated lead generation loop:
Scrape → Enrich → Score → Store → Push to GHL → Outreach → AI Conversations → Book Appointments

## Current State

### ✅ Complete
- Google Maps scraping with parallel processing
- Email enrichment via website scraping
- AI lead scoring with Ollama (free, local)
- Supabase integration
- GHL CRM push with custom fields
- Webhook server with security hardening
- Conversation agent for AI replies
- Outreach script for initial contact
- 108 tests passing

### 🔄 In Progress
- GHL workflow for reply webhooks (Boston building manually)

### ⏳ Pending
- Add Supabase columns: `ghl_contact_id`, `pushed_at`
- Set up ngrok for webhook exposure
- End-to-end test of full pipeline
- Build UI dashboard

---

## Blockers
- **GHL Workflow:** Browser automation struggled with GHL UI. Boston completing manually.
- **Webhook URL:** Need ngrok or tunnel for GHL to reach local server.

---

## Key Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Ollama over Anthropic | $0/mo vs $8-95/mo for scoring | 2026-01-31 |
| Website scraping over Apollo | Free vs $49/mo paid API | 2026-01-31 |
| Filter leads by email | Only store leads with valid emails | 2026-01-31 |
| Event-driven webhooks | Better than inbox polling | 2026-02-01 |

---

## Resources
- **Supabase:** cmwlguvveayhzahsobzr.supabase.co
- **GHL Location:** drPiCuieJURqPMXn4wak (Innowavv)
- **Webhook Port:** 3847
- **Pipeline ID:** e0Rx5syOIa7z3B3swf5B

---

## History

### 2026-02-02
- Added security hardening to webhook server (rate limiting, secret validation, error sanitization)
- Fixed .env permissions to 600
- Created log rotation script
- Boston taking over GHL workflow creation manually

### 2026-02-01
- Built webhook server and conversation agent
- Created outreach script
- Set up GHL custom fields and tags
- Created cron jobs for pipeline automation

### 2026-01-31
- Completed scraping, enrichment, scoring pipeline
- Integrated with Supabase and GHL
- All tests passing
