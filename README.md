<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:10b981,100:059669&height=220&section=header&text=BanglaMind%20AI&fontSize=60&fontColor=ffffff&fontAlignY=38&desc=Bangladesh's%20Intelligent%20Multilingual%20Research%20Assistant&descAlignY=58&descSize=18&animation=fadeIn" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=26&duration=3000&pause=800&color=10B981&center=true&vCenter=true&multiline=true&width=780&height=100&lines=NID+%2B+e-Passport+%2B+Tax+%2B+Health+%2B+Agriculture+%2B+Law;One+RAG-powered+assistant.+Bangla%2C+English+%26+Banglish.;Verified+answers%2C+not+guesses." alt="Typing SVG" />

<br/><br/>

[![Live Demo](https://img.shields.io/badge/status-live-10b981?style=for-the-badge&logo=render&logoColor=white)](https://banglamind-ai.onrender.com/)
<img src="https://img.shields.io/badge/license-MIT-059669?style=for-the-badge" />
<img src="https://img.shields.io/badge/made%20for-Bangladesh%20🇧🇩-10b981?style=for-the-badge" />

<br/><br/>

<a href="#-the-problem--the-solution">Problem &amp; Solution</a> •
<a href="#-live-demo--preview">Preview</a> •
<a href="#-features">Features</a> •
<a href="#-architecture">Architecture</a> •
<a href="#-tech-stack">Tech Stack</a> •
<a href="#-getting-started">Getting Started</a> •
<a href="#-developer">Developer</a>

</div>

<br/>

<div align="center">
<img width="90" src="public/2.png" alt="Bangladesh Flag" />
</div>

---

## 🇧🇩 The Problem &amp; The Solution

Millions of Bangladeshi citizens — students, farmers, small business owners, and everyday people — lose time, money, and peace of mind navigating **fragmented, scattered, and confusing government + civic information**:

| 😣 The Problem | ✅ How BanglaMind AI Solves It |
|---|---|
| NID correction, e-Passport rules, and land mutation steps are spread across dozens of government sites in dense bureaucratic language | Instantly explains procedures, required documents, and fees in **plain Bangla, English, or Banglish** |
| Farmers can't quickly diagnose crop diseases (like Rice Blast or Fall Armyworm) or find loan eligibility rules | Dedicated **Agriculture Assistant** mode with verified DAE/Bangladesh Bank guidance |
| Students struggle to find accurate SSC/HSC GPA formulas, BCS exam structure, or scholarship info | **Student Assistant** mode trained on verified academic knowledge sources |
| Small business owners don't know Trade License or NBR tax filing steps | **Business Hub** mode covers licensing, TIN registration &amp; tax slabs |
| People don't know dengue danger signs, platelet thresholds, or Surokkha vaccine registration | **Health Assistant** mode surfaces verified public-health guidance instantly |
| Most AI tools don't understand **Banglish** (code-mixed Bangla-English) the way Bangladeshis actually type | Native language detection for **Bangla, English &amp; Banglish** — responds in the same register |
| AI answers are often hallucinated with no way to verify them | Every answer is backed by **Retrieval-Augmented Generation (RAG)** with visible **source citations** and a confidence score |

> **In short:** BanglaMind AI is a Bangladesh-centric, multilingual, citation-backed AI assistant that turns confusing bureaucratic and civic knowledge into clear, trustworthy, instant answers — in the language people actually speak.

---

## 🖼️ Live Demo &amp; Preview

<div align="center">
<img src="./banglamind.png" alt="BanglaMind AI Preview" width="850" style="border-radius: 16px; box-shadow: 0 0 40px rgba(16,185,129,0.35);" />
</div>

<div align="center">
<sub>Dark, glassmorphic UI • Bangla/English/Banglish chat • RAG semantic inspector • Admin analytics dashboard</sub>
</div>

---

## ✨ Features

<table>
<tr>
<td width="33%" valign="top">

### 🧠 Intelligent RAG Core
- Hybrid **semantic + keyword** search
- Gemini-powered embeddings
- Confidence scoring per answer
- Inline **source citations**
- Anti-hallucination guardrails

</td>
<td width="33%" valign="top">

### 🗣️ True Multilingual UX
- Auto-detects **Bangla / English / Banglish**
- Voice input (Speech-to-Text)
- Text-to-Speech playback
- Responds in the user's own language register

</td>
<td width="33%" valign="top">

### 🧩 8 Specialized Modes
- 🎓 Student &nbsp; 💻 Programming
- 🔬 Research &nbsp; 🌱 Agriculture
- 🏛️ Government &nbsp; ❤️ Health
- 💼 Business &nbsp; 🤖 General

</td>
</tr>
<tr>
<td width="33%" valign="top">

### 📚 Living Knowledge Base
- 25+ preseeded verified civic documents
- Drag &amp; drop **PDF / image OCR** ingestion
- Auto-chunking &amp; vector indexing
- Per-document retrieval toggling

</td>
<td width="33%" valign="top">

### 📊 Admin Analytics Console
- BLEU / ROUGE-L / BERTScore panels
- Live latency &amp; token telemetry
- Per-user session auditing
- System activity log stream

</td>
<td width="33%" valign="top">

### 🔐 Secure &amp; Shareable
- Google Sign-In via Firebase Auth
- Firestore-backed chat history
- One-click **shareable read-only** chat links
- PWA — installable, works offline-cached

</td>
</tr>
</table>

---

## 🏗️ Architecture

```mermaid
flowchart TD
    A["🧑🏽 User<br/>Bangla · English · Banglish"] -->|"types or speaks"| B["⚛️ React 19 Frontend<br/>Vite + TailwindCSS"]
    B -->|"POST /api/chat"| C["🚂 Express Server"]
    C --> D{"Language<br/>Detector"}
    D --> E["🔎 Hybrid Retriever<br/>75% Semantic + 25% Keyword"]
    E --> F[("🗂️ In-Memory Vector Store<br/>Preseeded + User Docs")]
    E --> G["🧬 Gemini Embedding API"]
    F --> H["Top-3 Retrieved Chunks"]
    H --> I["✨ Gemini Generation API<br/>+ System Grounding Prompt"]
    I --> J["📝 Cited, Confidence-Scored Answer"]
    J --> B
    C -->|"auth + persistence"| K["🔥 Firebase Auth &amp; Firestore"]
    B -->|"upload PDF / image"| L["🖼️ Gemini OCR Extraction"]
    L --> G

    style A fill:#050807,stroke:#10b981,color:#fff
    style B fill:#0A100D,stroke:#10b981,color:#fff
    style C fill:#0A100D,stroke:#10b981,color:#fff
    style D fill:#050807,stroke:#059669,color:#fff
    style E fill:#050807,stroke:#059669,color:#fff
    style F fill:#0A100D,stroke:#3b82f6,color:#fff
    style G fill:#0A100D,stroke:#a855f7,color:#fff
    style H fill:#050807,stroke:#10b981,color:#fff
    style I fill:#0A100D,stroke:#a855f7,color:#fff
    style J fill:#050807,stroke:#10b981,color:#fff
    style K fill:#0A100D,stroke:#f59e0b,color:#fff
    style L fill:#0A100D,stroke:#ec4899,color:#fff
```

### 🔄 Problem → Solution Flow

```mermaid
graph LR
    P1["📄 Confusing NID / Passport rules"] --> S["🧠 BanglaMind AI RAG Engine"]
    P2["🌾 Unknown crop disease"] --> S
    P3["💰 Tax filing confusion"] --> S
    P4["🩺 Health emergency guidance"] --> S
    P5["🎓 GPA / Admission questions"] --> S
    S --> R["✅ Verified, Cited Answer<br/>in Bangla / English / Banglish"]

    style S fill:#059669,stroke:#10b981,color:#fff,stroke-width:3px
    style R fill:#0A100D,stroke:#10b981,color:#fff
```

---

## 🛠️ Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,nodejs,express,firebase,html,css,git,github,vscode&theme=dark" />

<br/><br/>

<img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/TailwindCSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<br/>
<img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
<img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" />
<img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" />
<br/>
<img src="https://img.shields.io/badge/Recharts-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" />
<img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" />
<img src="https://img.shields.io/badge/Lucide_Icons-000000?style=for-the-badge&logo=lucide&logoColor=white" />

</div>

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, TailwindCSS 4, Framer Motion (`motion`), Lucide Icons |
| **Backend** | Node.js, Express, `tsx` runtime |
| **AI / RAG** | Google Gemini (`generateContent`, `embedContent`), custom hybrid semantic+keyword retriever |
| **Auth &amp; Data** | Firebase Authentication (Google Sign-In), Cloud Firestore |
| **Visualization** | Recharts (BLEU / ROUGE-L / BERTScore, latency graphs, source distribution) |
| **Voice** | Web Speech API (STT + TTS, Bangla &amp; English) |
| **PWA** | Service Worker, Web App Manifest, installable offline-first shell |
| **Deployment** | Render |

---

## 📁 Project Structure

```text
banglamind-ai/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker (network-first HTML strategy)
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx            # Mode switcher, doc uploader, chat history
│   │   ├── ChatArea.tsx           # Chat UI, markdown renderer, voice I/O
│   │   ├── KnowledgeBase.tsx      # Suggested prompt explorer
│   │   ├── ResearchDashboard.tsx  # Academic evaluation metrics (Admin)
│   │   ├── AdminConsole.tsx       # DB seeding, telemetry, user auditing
│   │   └── TransparentMapLogo.tsx # Animated glowing logo component
│   ├── lib/
│   │   ├── firebase.ts        # Firebase init + auth helpers
│   │   └── chatSessions.ts    # Firestore chat session CRUD
│   ├── types.ts                # Shared TS interfaces & enums
│   ├── App.tsx                 # Root shell, auth gate, routing
│   └── main.tsx                 # Entry point + SW registration
├── server.ts                    # Express + Gemini RAG pipeline
├── firestore.rules              # Firestore security rules
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>=18`
- A [Google Gemini API key](https://ai.google.dev/)
- A [Firebase project](https://console.firebase.google.com/) with Authentication + Firestore enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/Joy5691/banglamind-ai.git
cd banglamind-ai

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your GEMINI_API_KEY inside .env.local

# Run in development
npm run dev
```

The app runs at `http://localhost:3000` 🎉

### Build for Production

```bash
npm run build
npm run start
```

---

## 🌐 Deployment

This project is deployment-ready for **Render** (or any Node-compatible host):

1. Push your repo to GitHub.
2. Create a new **Web Service** on [Render](https://render.com/).
3. Set the build command: `npm run build`
4. Set the start command: `npm run start`
5. Add environment variable `GEMINI_API_KEY` in the Render dashboard.
6. Add your Render domain to **Firebase Console → Authentication → Settings → Authorized Domains**.

---

## 🗺️ Roadmap

- [ ] SMS/USSD fallback channel for offline-first rural access
- [ ] District-level government office locator integration
- [ ] Expanded agriculture disease image-recognition module
- [ ] Public API for third-party civic-tech integrations
- [ ] Full Bangla voice-first mode

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/Joy5691/banglamind-ai/issues).

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Developer

<div align="center">

<img src="https://github.com/Joy5691.png" width="110" style="border-radius:50%; box-shadow: 0 0 25px rgba(16,185,129,0.6);" />

### Khalid Mahmud Joy

Building intelligent, civic-first AI tools for Bangladesh 🇧🇩

<a href="https://github.com/Joy5691/">
<img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" />
</a>

</div>

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:059669,100:10b981&height=120&section=footer" />

<sub>Made with 💚 for the people of Bangladesh</sub>
</div>
