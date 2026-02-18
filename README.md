# 🦞 Croati Mission Control

Your personal OpenClaw command center. Monitor agents, manage crons, spawn tasks — all from one dashboard.

## 🚀 Quick Start

```bash
# Navigate to Mission Control
cd /data/.openclaw/workspace/mission-control

# Start the server
./run-server.sh 8080

# Open in browser
# http://localhost:8080
```

## 📁 Structure

```
mission-control/
├── index.html          # Main dashboard (Agent Swarm, Pipeline, Health)
├── agents.html         # Agent management & spawn templates
├── crons.html          # Cron job schedule & quick actions
├── missions.html       # Complete mission history log
├── style.css           # Dark theme with OpenClaw orange accents
├── run-server.sh       # Launch script (Python/Node)
├── api/
│   └── status.sh       # Live data API (JSON output)
└── README.md           # This file
```

## 🎛️ Dashboard Sections

### Main Dashboard (`index.html`)
- **👥 Agent Swarm** — Currently running agents with status
- **📅 Mission Pipeline** — Running/completed/idle mission stats
- **⚡ Quick Actions** — Weather, Notion, Cron, TTS, Browser tests
- **📊 System Health** — Gateway, APIs, GitHub, Notion status
- **📜 Recent Events** — Last 10 mission activities

### Agent Management (`agents.html`)
- View active & scheduled agents
- Spawn new agents (custom or templates)
- Templates: Research, Code, Notion, Browser
- Kill/resume agent controls

### Cron Jobs (`crons.html`)
- Morning Briefing (7:30 AM daily)
- Evening Prep (8:00 PM daily)
- Run any cron immediately
- Cron syntax reference

### Mission Log (`missions.html`)
- Complete history of all activities
- Filter by status (success/failed/all)
- Export capability (placeholder)
- Success rate statistics

## 🔧 Configuration

### Colors
- Primary background: `#0d1117`
- Secondary: `#161b22`
- Accent (OpenClaw Orange): `#FF4500`
- Success: `#238636`
- Warning: `#d29922`
- Danger: `#da3633`

### Auto-Refresh
- Dashboard refreshes every 30 seconds
- Manual refresh via "🔄 Refresh" button

## 📝 Current Setup

**Your Active Cron Jobs:**
| Name | Schedule | ID | Status |
|------|----------|-----|--------|
| Morning Briefing | 7:30 AM CT | `bb0fb60e...` | ✅ Active |
| Evening Prep | 8:00 PM CT | `18e381cb...` | ✅ Active |

**Connected Services:**
- ✅ **Kimi API** — Running via NVIDIA NIM
- ✅ **GitHub** — Connected (ethanhardage)
- ✅ **Notion** — 3 tasks synced
- ⚠️ **Claude Code** — Installed, interactive mode only

## 🆕 Adding New Features

Want to extend Mission Control? Common additions:

### Add a New Quick Action
Edit `index.html`, find the Quick Actions section, add:
```html
<button class="action-btn" onclick="quickAction('your-action')">
    <span>🔥</span>
    Your Action Name
</button>
```

Then add handler in the `<script>` section.

### Add Real Data
Replace the placeholder data in `index.html` with:
- Fetch from `/api/status.json` (already set up)
- Or use the `sessions_list` tool to get real sessions
- Or query Notion API for live tasks

### New Page
1. Copy `agents.html` as template
2. Customize content
3. Add to navigation in all pages
4. Add to `run-server.sh` if needed

## ⚠️ Known Limitations

- **Static HTML**: Currently shows placeholder data
- **API**: `api/status.sh` outputs sample JSON
- **Real Data**: Would need backend integration with OpenClaw
- **Claude Code**: Requires interactive terminal (not autonomously spawnable)

## 🔮 Future Enhancements

- [ ] Live data from OpenClaw API
- [ ] WebSocket for real-time updates
- [ ] Agent spawn directly from dashboard
- [ ] ClawHub skill integration
- [ ] Mobile app version

## 💻 Development

**Tech Stack:**
- Pure HTML5/CSS3/JavaScript (no frameworks)
- Vanilla JS for interactivity
- CSS Grid/Flexbox for layouts
- No build step required

**View Source:**
All files are human-readable. Open in any text editor.

---

Built for Ethan Hardage by Croati 🦞  
Last updated: 2026-02-17