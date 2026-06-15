# AI Career Mentor: Resilient MERN Platform with Background Processing

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://ai-career-mentor-platform.vercel.app)

Welcome to the **AI Career Mentor** platform! This complete MERN stack application provides an intelligent, automated AI mentor that engages with candidates, evaluates technical proficiency asynchronously, and dynamically generates custom career roadmaps and gap analyses—-backed by a resilient, fault-tolerant backend architecture. It also features a sleek, secure Admin Portal for HR/Admins to review these sessions seamlessly.

---

## 🎯 Users Perspective (The Candidate Experience)
From the user’s point of view, the platform is a visually stunning, highly interactive landing page where they can initiate a session with an AI Career Mentor. 
- **Smooth Onboarding:** The user enters basic details (Name, Email, Phone, Target Role) to begin.
- **Conversational Assessment:** Rather than filling out boring static forms, the candidate just chats with the AI naturally.
- **Seamless Automation:** Unbeknownst to the user, as they chat, the system intelligently monitors the conversation length and quality. It evaluates their skills and confidence behind the scenes.
- **Modern UI:** The platform utilizes sleek dark/light mode options, WhatsApp-style dynamic chat bubbles, and micro-animations, making the interaction feel premium and "alive."

## 💻 Developers Perspective (The Technical Approach)
From a developer’s point of view, this project is designed around a scalable, decoupled client-server architecture with an emphasis on seamless async workflows and rich frontend aesthetics.

- **Frontend (Vite + React + Vanilla CSS):** Built utilizing Vite for ultra-fast bundling. The UI strictly adheres to modern aesthetic standards (glassmorphism, subtle gradients, fluid CSS transitions) without relying heavily on bloated component libraries. Complex, custom components were implemented from scratch, such as highly responsive data tables, a custom scrollbar logic wrapper (`CustomScrollArea`), and fully responsive modals.
- **Backend (Express + Node + Mongoose):** A robust RESTful API handles state persistence. It features an intelligent fallback mechanism: if MongoDB fails to connect or isn't configured, the app gracefully degrades to utilizing a local `.json` file (`submissions.json`) for data storage, ensuring the app works perfectly out-of-the-box in local environments.
- **AI Integration (Groq API):** The backend asynchronously interfaces with the Groq API. An event-driven hook was built into the chat endpoint to evaluate the candidate’s `chatHistory` after a set number of interactions. This offloads the heavy lifting from the frontend and ensures the LLM has deep contextual knowledge of the candidate's actual conversational abilities before generating the gap analysis.

---

## ✨ Impressive & Optimistic Features

- **Automated Background Context Analysis:** The system doesn't rely on self-reported skills. Instead, every 4 messages, the server triggers an asynchronous task that feeds the last 15 messages of the candidate's conversation directly into the Groq LLM. It infers their exact skill gaps, technical proficiency, and confidence levels, then seamlessly saves the generated weekly roadmap into the database—all without interrupting the user's active chat session.
- **Dynamic Secure Admin Portal:** A completely secure, responsive dashboard allows admins to monitor all active and past sessions. It features:
  - **Live Syncing:** Admins can view the exact chat transcript of what the user is discussing with the AI.
  - **Dynamic Gap Reports:** Admins can instantly view the LLM-generated Gap Analysis, including visual progress bars reflecting the candidate's proficiency percentages, and a week-by-week actionable roadmap.
  - **Adaptive UI:** The portal elegantly switches between a side-by-side desktop layout to a highly optimized, scroll-friendly vertical stack on mobile devices.
- **Security & Rate Limiting:** The backend is hardened with `express-rate-limit` to protect against spam and brute-force attacks. It utilizes dual-layered thresholds: a strict 5-request limit per 15 minutes on the Admin login to prevent password guessing, and a 20-request per minute limit on the AI Chat endpoint to prevent API spam and preserve LLM credits.
- **Aesthetic Excellence:** Custom-built UI features like smooth modal animations, responsive dynamic chat bubbles with sender-aware coloring, custom thumb tracks, and integrated Light/Dark modes.

---

## 🚀 Setup & Installation Instructions

Follow these steps to get the complete project running locally on your machine.

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (optional, the app will gracefully fall back to local JSON storage if not configured)
- Groq API Key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Backend Setup
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

**Environment Variables:**
Create a `.env` file in the `server` directory and configure the following:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string # Optional
GROQ_API_KEY=your_groq_api_key # Required for AI Chat & Gap Analysis
ADMIN_USERNAME=admin # Optional, default is admin
ADMIN_PASSWORD=admin123 # Optional, default is admin123
JWT_SECRET=your_super_secret_jwt_key
```

**Start the Backend Server:**
```bash
npm run dev
```
*(The server will start on `http://localhost:5000`)*

### 3. Frontend Setup
Open a new terminal window, navigate to the client directory, and install dependencies:
```bash
cd client
npm install
```

**Environment Variables:**
Create a `.env` file in the `client` directory:
```env
VITE_API_URL=http://localhost:5000
```

**Start the Frontend Client:**
```bash
npm run dev
```
*(The Vite development server will start, typically on `http://localhost:5173`)*

---

### 🎉 Usage
- **Candidate View:** Open `http://localhost:5173` in your browser. Enter your details and begin chatting with the AI mentor.
- **Admin View:** Click the **"Admin Access"** button in the top right. Login using the credentials defined in your server `.env` file. You will be able to click on any user session to review their live chat transcript and automatically generated Gap Analysis reports!