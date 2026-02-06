# 🎯 Empusa: Mission Control for Autonomous Agents

**Stop burning API credits on zombie loops. Visualize, Debug, and Resume your AI agents in real-time.**

---

## 🔥 The Problem

You've built an autonomous agent. It works... until it doesn't.

- **Infinite retry loops** drain your API budget while you sleep
- **Hallucinated steps** cause agents to click the same button 47 times
- **Timeout failures** leave you parsing 5,000 lines of JSON logs at 2 AM
- **No visibility** into what went wrong or where the agent got stuck

**Empusa fixes this.**

---

## 📸 Screenshots

### Mission Control Dashboard
![Mission Control Dashboard](./public/dashboard-preview.png)
*Real-time overview of all running agents with status indicators and intervention counts*

### Time Travel Debugger
![Time Travel Debugger](./public/trace-view.png)
*Step-by-step execution timeline with success/failure states and loop detection*

---

## ✨ Key Features

### 🕵️‍♂️ **Time Travel Debugging**
Visualize execution traces as an interactive timeline. Green = Success, Red = Fail, Yellow = Loop Detected. No more grep-ing through logs.

### 🔄 **Adaptive Loop Detection**
The system automatically identifies when an agent is stuck in a retry loop and shows exactly where intervention occurred. Watch the yellow pulse in action.

### ⏯️ **Human-in-the-Loop Resume** *(Planned)*
Pause bad runs, inspect the state, fix the issue, and resume without restarting from scratch. Save hours of debugging time.

### ⚡ **Universal Compatibility**
Built for OpenClaw logs but designed to work with any Agent Protocol (LangChain, AutoGPT, custom frameworks). Plug in your telemetry and go.

---

## 🏗️ Origin Story

This tool was born from fixing the **critical Infinite Loop bug in OpenClaw** (PR #9759). After watching agents burn through $200 in API credits overnight, we realized the ecosystem needed better observability.

**We built this because we needed it.** Now we're open-sourcing it for the community.

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/empusa-dashboard.git
cd empusa-dashboard

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## 🛠️ Tech Stack

- **Next.js 14** (App Router) - React framework for production
- **Tailwind CSS** - Utility-first styling
- **Lucide Icons** - Beautiful, consistent iconography
- **TypeScript** - Type-safe development

---

## 📋 Roadmap

- [x] Real-time agent status dashboard
- [x] Execution timeline visualization
- [x] Loop detection system
- [ ] Live log streaming
- [ ] State inspection & editing
- [ ] Resume from checkpoint
- [ ] Multi-agent orchestration view
- [ ] Cost tracking & alerts

---

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 Bug reports
- 💡 Feature requests
- 📖 Documentation improvements
- 🔧 Code contributions

Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built by developers who got tired of debugging agents in production. Special thanks to the OpenClaw community for inspiration and feedback.

---

**⭐ If this saves you from one 2 AM debugging session, give us a star!**
