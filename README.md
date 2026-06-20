# 🤖 AI Career Mentor: Agentic MERN Architecture with Asynchronous Background Processing

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://ai-career-mentor-platform.vercel.app)

Welcome to the **AI Career Mentor** platform! This complete MERN stack application provides an intelligent, automated AI mentor that engages with candidates, evaluates technical proficiency asynchronously, and dynamically generates custom career roadmaps and gap analyses—-backed by a resilient, fault-tolerant backend architecture. It also features a sleek, secure Admin Portal for HR/Admins to review these sessions seamlessly.

---

## 🎯 Users Perspective (The Candidate Experience)
From the user’s point of view, the platform is a visually stunning, highly interactive landing page where they can initiate a session with an AI Career Mentor. 
* **Smooth Onboarding:** The user enters basic details (Name, Email, Phone, Target Role) to begin.
* **Conversational Assessment:** Rather than filling out boring static forms, the candidate just chats with the AI naturally.
* **Seamless Agentic Automation:** Unbeknownst to the user, as they chat, the system autonomously monitors the conversation length and quality behind the scenes to evaluate their skills and confidence.
* **Modern UI:** The platform utilizes sleek dark/light mode options, WhatsApp-style dynamic chat bubbles, and micro-animations, making the interaction feel premium and "alive."

## 💻 Developers Perspective (The Technical Approach)
From a developer’s point of view, this project is designed around a scalable, decoupled client-server architecture with an emphasis on seamless async workflows and rich frontend aesthetics.

* **Frontend (Vite + React + Vanilla CSS):** Built utilizing Vite for ultra-fast bundling. The UI strictly adheres to modern aesthetic standards (glassmorphism, subtle gradients, fluid CSS transitions) without relying heavily on bloated component libraries. Complex, custom components were implemented from scratch, such as highly responsive data tables, a custom scrollbar logic wrapper (`CustomScrollArea`), and fully responsive modals.
* **Backend (Express + Node + Mongoose):** A robust RESTful API handles state persistence. It features an intelligent fallback mechanism: if MongoDB fails to connect or isn't configured, the app gracefully degrades to utilizing a local `.json` file (`submissions.json`) for data storage, ensuring the app works perfectly out-of-the-box in local environments.
* **AI Integration (Groq API):** The backend asynchronously interfaces with the Groq API. An event-driven hook was built into the chat endpoint to evaluate the candidate’s `chatHistory` after a set number of interactions. This offloads the heavy lifting from the frontend and ensures the LLM has deep contextual knowledge of the candidate's actual conversational abilities before generating the gap analysis.

---

## ✨ Advanced Engineering & Agentic Features

* **Autonomous Background Agentic Workflow:** The platform goes beyond simple prompt-response structures. The backend runs an autonomous agentic pipeline that interceptively analyzes user chat context every 4 messages via the Groq LLM (Llama 3). It independently infers technical skill gaps and synthesizes structural roadmaps asynchronously, completely decoupling heavy LLM evaluation computations from the active user session.
* **Dual-Layer Security & Rate-Limiting:** Hardened the API infrastructure using `express-rate-limit` to protect upstream LLM budgets and prevent credential brute-forcing. Implemented a strict 5-request/15-min threshold on Admin authentication routes paired with a 20-request/min throttle on live AI endpoints.
* **Local Storage Cache & Network Fault-Tolerance:** Engineered front-end application state resilience to mitigate typical free-tier server sleeping delays. User chat states and runtime history are fully persisted locally in the browser cache, allowing complete crash resilience and zero data loss upon page reloads.
* **Intelligent Background Retry Pipeline:** If a network dropped request occurs, the UI isolates the failure state, exposes a silent background 'Retry' hook, strips the transient error wrapper, and seamlessly re-invokes the core API endpoint without requiring user intervention.
* **Dynamic Secure Admin Dashboard:** Designed a responsive, secure portal utilizing JWT authentication for active monitoring. Features live session syncing for real-time chat transcript logs, dynamic gap analyses, and progressive visual rendering components built entirely from scratch.

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
