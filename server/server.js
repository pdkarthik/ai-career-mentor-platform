import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: { success: false, error: 'Too many messages sent from this IP, please try again after a minute.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: { success: false, error: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

// Middleware
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:5173'] : ['http://localhost:5173'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// Ensure data folder exists for JSON Database Fallback
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const JSON_DB_PATH = path.join(DATA_DIR, 'submissions.json');

// Global Database Status Variable
let dbType = 'SQLite/JSON Fallback';
let isMongoConnected = false;

// ----------------------------------------------------
// MongoDB Setup (Mongoose schemas)
// ----------------------------------------------------
const submissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, required: true, enum: ['Scholar', 'Mentor', 'Sponsor'] },
  govId: { type: String, unique: true, sparse: true }, // Sparse unique index to prevent duplicates for Scholars
  message: { type: String, required: true },
  linkedin: { type: String },
  github: { type: String },
  socialMedia: { type: String },
  status: { type: String, required: true, default: 'Pending', enum: ['Pending', 'Reviewed', 'Accepted', 'Declined'] },
  targetRole: { type: String },
  skills: { type: String },
  education: { type: String },
  experience: { type: String },
  analysis: {
    type: {
      skillGaps: [{
        skill: { type: String },
        percentage: { type: Number }
      }],
      roadmap: [{
        week: { type: Number },
        focus: { type: String },
        tasks: [{ type: String }]
      }]
    },
    default: null
  },
  chatHistory: [{
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const MongoSubmission = mongoose.model('Submission', submissionSchema);

// Admin Account Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const MongoAdmin = mongoose.model('Admin', adminSchema);

// ----------------------------------------------------
// JSON Fallback Database Helper Layer
// ----------------------------------------------------
const readJsonDB = () => {
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify({ submissions: [], admins: [] }, null, 2));
  }
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON DB file, resetting database:', err);
    return { submissions: [], admins: [] };
  }
};

const writeJsonDB = (data) => {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
};

// Seed Fallback Admin
const seedJsonAdmin = async () => {
  const db = readJsonDB();
  const existingAdmin = db.admins.find(a => a.username === 'admin');
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    db.admins.push({
      _id: 'admin-static-id',
      username: 'admin',
      password: hashedPassword
    });
    writeJsonDB(db);
    console.log('[Fallback DB] Default Admin account seeded (username: admin, password: admin123)');
  }
};

// ----------------------------------------------------
// Database Selection and Connectivity
// ----------------------------------------------------
const connectDB = async () => {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shecan';
  console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
  try {
    // Attempt Mongoose connection with a short timeout to failover quickly
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000, 
    });
    isMongoConnected = true;
    dbType = 'MongoDB';
    console.log('💚 Successfully connected to MongoDB Database!');
    
    // Seed default admin in Mongo if not exists
    const adminCount = await MongoAdmin.countDocuments({ username: 'admin' });
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await MongoAdmin.create({ username: 'admin', password: hashedPassword });
      console.log('[Mongo DB] Default Admin account seeded (username: admin, password: admin123)');
    }


  } catch (err) {
    console.warn('⚠️ MongoDB connection failed. Falling back to the robust Local JSON Database!');
    console.log(`Details: ${err.message}`);
    isMongoConnected = false;
    dbType = 'Local JSON File';
    await seedJsonAdmin();
  }
};

// Run connection
connectDB();

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized Access. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Forbidden. Invalid or expired token.' });
  }
};

// ----------------------------------------------------
// Core API Routes
// ----------------------------------------------------

// Server status & diagnostic endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    database: dbType,
    mongoConnected: isMongoConnected
  });
});

// GET /api/submissions/email/:email - Public endpoint to retrieve submission by email
app.get('/api/submissions/email/:email', async (req, res) => {
  const { email } = req.params;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email parameter is required.' });
  }

  try {
    let doc = null;
    if (isMongoConnected) {
      doc = await MongoSubmission.findOne({ email: email.trim().toLowerCase() });
    } else {
      const db = readJsonDB();
      doc = db.submissions.find(s => s.email.trim().toLowerCase() === email.trim().toLowerCase());
    }

    if (!doc) {
      return res.json({ success: true, found: false });
    }

    res.json({
      success: true,
      found: true,
      data: doc
    });
  } catch (err) {
    console.error('Error fetching submission by email:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// POST /api/submissions - Public endpoint to submit application/contact form
app.post('/api/submissions', async (req, res) => {
  let { 
    name, 
    email, 
    phone, 
    role, 
    message, 
    govId, 
    linkedin, 
    github, 
    socialMedia,
    targetRole,
    skills,
    education,
    experience
  } = req.body;

  // Default role to 'Scholar' for backward compatibility
  if (!role) {
    role = 'Scholar';
  }

  // Map experience to message if message is empty but experience is provided
  if (!message && experience) {
    message = experience;
  }

  // Real-time server-side validations
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Name must be at least 2 characters.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }
  if (!phone || phone.trim().length < 5) {
    return res.status(400).json({ success: false, error: 'Phone number is required (minimum 5 characters).' });
  }

  // If student profiler fields are provided, validate them. Else fallback to old validations.
  if (targetRole || skills || education || experience) {
    if (!targetRole || targetRole.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Target career role is required (minimum 2 characters).' });
    }
    if (!skills || skills.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Technical skills list is required.' });
    }
    if (!education || education.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Education background is required.' });
    }
    if (!experience || experience.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Experience/background description is required (minimum 5 characters).' });
    }
  } else {
    // Old validation fallback
    if (!role || !['Scholar', 'Mentor', 'Sponsor'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Please choose a valid role (Scholar, Mentor, or Sponsor).' });
    }
    if (role === 'Scholar') {
      if (!govId || govId.trim().length < 5) {
        return res.status(400).json({ success: false, error: 'Government ID Number is required for Scholars (minimum 5 characters).' });
      }
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Message must be at least 10 characters long.' });
    }
  }

  try {
    // Unique Check for Government ID (for Scholars - only if provided)
    if (role === 'Scholar' && govId && govId.trim().length >= 5) {
      const cleanGovId = govId.trim().toUpperCase();
      if (isMongoConnected) {
        const existing = await MongoSubmission.findOne({ govId: cleanGovId });
        if (existing) {
          return res.status(400).json({ success: false, error: 'An application with this Government ID has already been submitted.' });
        }
      } else {
        const db = readJsonDB();
        const existing = db.submissions.find(s => s.role === 'Scholar' && s.govId && s.govId.trim().toUpperCase() === cleanGovId);
        if (existing) {
          return res.status(400).json({ success: false, error: 'An application with this Government ID has already been submitted.' });
        }
      }
    }

    let savedDoc;
    if (isMongoConnected) {
      // Save to MongoDB
      savedDoc = await MongoSubmission.create({ 
        name, 
        email, 
        phone,
        role, 
        message, 
        govId: (role === 'Scholar' && govId) ? govId.trim().toUpperCase() : undefined,
        linkedin,
        github,
        socialMedia,
        targetRole,
        skills,
        education,
        experience,
        analysis: null
      });
    } else {
      // Save to JSON Database
      const db = readJsonDB();
      savedDoc = {
        _id: `submission-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        email,
        phone,
        role,
        message,
        govId: (role === 'Scholar' && govId) ? govId.trim().toUpperCase() : undefined,
        linkedin,
        github,
        socialMedia,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        targetRole,
        skills,
        education,
        experience,
        analysis: null
      };
      db.submissions.unshift(savedDoc); // New submissions at start
      writeJsonDB(db);
    }

    res.status(201).json({
      success: true,
      message: 'Form Submitted Successfully',
      data: savedDoc
    });
  } catch (err) {
    console.error('Error saving submission:', err);
    res.status(500).json({ success: false, error: 'Server error. Please try again later.' });
  }
});

// POST /api/admin/login - Secure Admin Login Route
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Please provide username and password.' });
  }

  try {
    let adminUser = null;

    if (isMongoConnected) {
      adminUser = await MongoAdmin.findOne({ username });
    } else {
      const db = readJsonDB();
      adminUser = db.admins.find(a => a.username === username);
    }

    if (!adminUser) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: adminUser._id, username: adminUser.username },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      message: 'Admin Authentication Successful',
      token,
      admin: { username: adminUser.username }
    });
  } catch (err) {
    console.error('Error logging in admin:', err);
    res.status(500).json({ success: false, error: 'Internal Server error.' });
  }
});

// GET /api/admin/submissions - Fetch all submissions (JWT Protected)
app.get('/api/admin/submissions', authenticateJWT, async (req, res) => {
  try {
    let submissions = [];
    if (isMongoConnected) {
      submissions = await MongoSubmission.find().sort({ createdAt: -1 });
    } else {
      const db = readJsonDB();
      submissions = db.submissions;
    }
    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve submissions.' });
  }
});

// PUT /api/admin/submissions/:id - Update submission status (JWT Protected)
app.put('/api/admin/submissions/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Pending', 'Reviewed', 'Accepted', 'Declined'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid application status.' });
  }

  try {
    let updatedDoc = null;
    if (isMongoConnected) {
      updatedDoc = await MongoSubmission.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );
    } else {
      const db = readJsonDB();
      const idx = db.submissions.findIndex(s => s._id === id);
      if (idx !== -1) {
        db.submissions[idx].status = status;
        updatedDoc = db.submissions[idx];
        writeJsonDB(db);
      }
    }

    if (!updatedDoc) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }

    res.json({
      success: true,
      message: `Status successfully updated to ${status}`,
      data: updatedDoc
    });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, error: 'Failed to update status.' });
  }
});

// DELETE /api/admin/submissions/:id - Delete submission (JWT Protected)
app.delete('/api/admin/submissions/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    let deleted = false;
    if (isMongoConnected) {
      const result = await MongoSubmission.findByIdAndDelete(id);
      deleted = !!result;
    } else {
      const db = readJsonDB();
      const initialLength = db.submissions.length;
      db.submissions = db.submissions.filter(s => s._id !== id);
      if (db.submissions.length < initialLength) {
        deleted = true;
        writeJsonDB(db);
      }
    }

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }

    res.json({
      success: true,
      message: 'Submission successfully deleted.'
    });
  } catch (err) {
    console.error('Error deleting submission:', err);
    res.status(500).json({ success: false, error: 'Failed to delete submission.' });
  }
});

// Helper for Gap Analysis Generation
async function generateGapAnalysis(submissionId) {
  try {
    let submission = null;
    if (isMongoConnected) {
      submission = await MongoSubmission.findById(submissionId);
    } else {
      const db = readJsonDB();
      submission = db.submissions.find(s => s._id === submissionId);
    }

    if (!submission) {
      console.error("Auto gap analysis failed: Submission not found for ID", submissionId);
      return null;
    }

    const name = submission.name;
    const targetRole = submission.targetRole || (submission.role === 'Scholar' ? 'General Student' : submission.role);
    const skills = submission.skills || 'Not specified';
    const education = submission.education || 'Not specified';
    const experience = submission.experience || submission.message || 'Not specified';
    const linkedin = submission.linkedin || 'Not provided';
    const github = submission.github || 'Not provided';

    let chatContext = 'No chat history available yet.';
    if (submission.chatHistory && submission.chatHistory.length > 0) {
      const recentChat = submission.chatHistory.slice(-15);
      chatContext = recentChat.map(msg => `${msg.role === 'user' ? 'Candidate' : 'AI Mentor'}: ${msg.content}`).join('\n\n');
    }

    const systemPrompt = `You are an elite career mentor for Indian freshers.
Your job is to analyze the candidate's student background, target career role, current skills, education, experience, AND their recent conversation with an AI mentor, to provide:
1. A list of skill gaps (skills they need to acquire or improve for their target role, with a percentage representing their gap/need, where 100% means they completely lack the skill and 0% means they are fully proficient. Generate between 3 to 6 skill gaps).
2. A step-by-step career roadmap broken down by weeks (generate a 4-week to 6-week plan, detailing weekly focus and specific tasks to bridge the skill gaps).

Use their conversational answers to better assess their technical proficiency and confidence.

CRITICAL DIRECTIVE: You MUST return your response as a valid JSON object. Do not wrap the JSON in markdown code blocks like \`\`\`json or add any explanation outside the JSON. Return ONLY the raw, parsable JSON string. The system is operating in JSON mode, so your response must be valid JSON matching the requested schema.

The JSON structure MUST match exactly:
{
  "skillGaps": [
    { "skill": "String", "percentage": Number }
  ],
  "roadmap": [
    { "week": Number, "focus": "String", "tasks": ["String"] }
  ]
}`;

    const userPrompt = `Candidate Profile details to analyze:
Name: ${name}
Target Career Role: ${targetRole}
Current Skills: ${skills}
Education: ${education}
Experience/Background Summary: ${experience}
LinkedIn: ${linkedin}
GitHub: ${github}

Recent Conversation History with AI Mentor:
${chatContext}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned error status ${response.status}`);
    }

    const data = await response.json();
    const resultJson = JSON.parse(data.choices[0].message.content);

    if (!resultJson.skillGaps || !Array.isArray(resultJson.skillGaps) || !resultJson.roadmap || !Array.isArray(resultJson.roadmap)) {
      throw new Error("Invalid output format returned by Groq AI");
    }

    let updatedDoc = null;
    if (isMongoConnected) {
      updatedDoc = await MongoSubmission.findByIdAndUpdate(
        submissionId,
        { analysis: resultJson },
        { new: true }
      );
    } else {
      const db = readJsonDB();
      const idx = db.submissions.findIndex(s => s._id === submissionId);
      if (idx !== -1) {
        db.submissions[idx].analysis = resultJson;
        updatedDoc = db.submissions[idx];
        writeJsonDB(db);
      }
    }

    console.log(`Auto gap analysis generated and saved for submission ${submissionId}`);
    return updatedDoc;
  } catch (error) {
    console.error("Error generating gap analysis:", error);
    throw error;
  }
}

// POST /api/mentor/analyze - Trigger Groq Llama-3 AI Career Roadmapping (Public/Chatbot Enabled)
app.post('/api/mentor/analyze', async (req, res) => {
  const { submissionId } = req.body;

  if (!submissionId) {
    return res.status(400).json({ success: false, error: 'Submission ID is required.' });
  }

  try {
    const updatedDoc = await generateGapAnalysis(submissionId);
    if (!updatedDoc) {
      return res.status(404).json({ success: false, error: 'Failed to update submission with analysis.' });
    }

    res.json({
      success: true,
      message: 'AI career analysis generated successfully',
      data: updatedDoc
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to perform career mentoring analysis: " + error.message });
  }
});

// POST /api/mentor/chat - Real-time Conversational AI Mentor Chat (Public/Chatbot Enabled)
app.post('/api/mentor/chat', chatLimiter, async (req, res) => {
  const { submissionId, message, history } = req.body;

  if (!submissionId || !message) {
    return res.status(400).json({ success: false, error: 'Submission ID and message are required.' });
  }

  try {
    let submission = null;
    if (isMongoConnected) {
      submission = await MongoSubmission.findById(submissionId);
    } else {
      const db = readJsonDB();
      submission = db.submissions.find(s => s._id === submissionId);
    }

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission profile not found.' });
    }

    const name = submission.name;
    const targetRole = submission.targetRole || 'Scholar';
    const skills = submission.skills || 'Not specified';
    const education = submission.education || 'Not specified';
    const experience = submission.experience || submission.message || 'Not specified';
    
    // Format existing analysis for LLM context
    let roadmapContext = 'No roadmap generated yet.';
    if (submission.analysis) {
      const analysis = submission.analysis;
      roadmapContext = `Skill Gaps:\n`;
      if (analysis.skillGaps) {
        analysis.skillGaps.forEach(gap => {
          roadmapContext += `- ${gap.skill}: ${gap.percentage}% gap\n`;
        });
      }
      roadmapContext += `\nWeekly Roadmap:\n`;
      if (analysis.roadmap) {
        analysis.roadmap.forEach(item => {
          roadmapContext += `- Week ${item.week} (${item.focus}): ${item.tasks?.join(', ')}\n`;
        });
      }
    }

    const systemPrompt = `You are an elite AI Career Mentor for NayePankh Foundation, helping Indian freshers and students bridge their skills gap and prepare for the tech industry.
You are chatting in real-time with ${name}, whose target career role is "${targetRole}".

Candidate Profile Details:
- Education: ${education}
- Skills: ${skills}
- Experience/Background: ${experience}

Personalized Roadmap Context:
${roadmapContext}

Instructions:
1. Act as a friendly, supportive, and extremely knowledgeable mentor.
2. Answer the student's questions regarding their career roadmap, how to learn specific skills, prepare for interviews, build projects, or any technical queries.
3. Keep your responses engaging, professional, and clear.
4. Always use Markdown styling (bold, headers, lists, code blocks) in your response so it parses correctly in their chat box.`;

    // Build the messages list, including context-rich history
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history if provided (limit to last 10 messages to avoid token bloat)
    if (history && Array.isArray(history)) {
      const cleanedHistory = history.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      messages.push(...cleanedHistory);
    }

    // Add current user message
    const lastHistoryMsg = history && history.length > 0 ? history[history.length - 1] : null;
    if (!lastHistoryMsg || lastHistoryMsg.content !== message) {
      messages.push({ role: "user", content: message });
    }

    // Add an artificial delay to allow the user to see and use the 'Stop' button UI
    await new Promise(resolve => setTimeout(resolve, 1500));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        messages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned error status ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Append user message and AI mentor response to database chatHistory
    const newMessages = [
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    ];
    
    let currentHistoryLength = 0;
    if (isMongoConnected) {
      const updatedSub = await MongoSubmission.findByIdAndUpdate(submissionId, {
        $push: { chatHistory: { $each: newMessages } }
      }, { new: true });
      if (updatedSub) currentHistoryLength = updatedSub.chatHistory.length;
    } else {
      const db = readJsonDB();
      const idx = db.submissions.findIndex(s => s._id === submissionId);
      if (idx !== -1) {
        if (!db.submissions[idx].chatHistory) db.submissions[idx].chatHistory = [];
        db.submissions[idx].chatHistory.push(...newMessages);
        currentHistoryLength = db.submissions[idx].chatHistory.length;
        writeJsonDB(db);
      }
    }

    // Auto-trigger Gap Analysis generation every 4 user interactions (which is 8 messages: 4 user, 4 assistant)
    if (currentHistoryLength >= 8 && currentHistoryLength % 8 === 0) {
      console.log(`Chat history length is ${currentHistoryLength}, auto-triggering Gap Analysis...`);
      generateGapAnalysis(submissionId).catch(err => console.error("Background Gap Analysis generation failed:", err));
    }

    res.json({
      success: true,
      reply
    });

  } catch (error) {
    console.error("Error during real-time chat API:", error);
    res.status(500).json({ success: false, error: "Failed to communicate with AI Mentor: " + error.message });
  }
});

// POST /api/mentor/onboard - AI-driven intake interview for new users
app.post('/api/mentor/onboard', async (req, res) => {
  const { name, email, message, history } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email are required.' });
  }

  try {
    const systemPrompt = `You are the NayePankh AI Career Mentor. You are conducting an onboarding interview for a new student.
Student Details:
- Name: ${name}
- Email: ${email}

Your objective is to conversationally gather the following details, one by one:
1. Phone Number
2. Target Career Role (e.g. Web Developer, Data Analyst)
3. Technical Skills
4. Education (Degree and College/Batch)
5. Background / Projects / Experience

Instructions:
- Be friendly, encouraging, and brief.
- Ask for only ONE piece of information at a time.
- Do not ask for details you have already gathered.
- Once you have gathered all 5 details (Phone, Target Role, Skills, Education, Experience), you MUST write a detailed weekly career roadmap and skill gap evaluation for the student, and append a JSON block at the very end of your response.
- The JSON block MUST be on a new line and match the format:
\`\`\`json
{
  "complete": true,
  "data": {
    "phone": "extracted phone number",
    "targetRole": "extracted target role",
    "skills": "extracted skills",
    "education": "extracted education details",
    "experience": "extracted background/projects summary"
  }
}
\`\`\`
Ensure the JSON block is valid and strictly matches this format.`;

    const messages = [
      { role: "system", content: systemPrompt }
    ];

    if (history && Array.isArray(history)) {
      // Filter out user messages or keep standard format
      messages.push(...history.slice(-12).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })));
    }

    if (message) {
      // If the last message in history is not this message, push it
      const lastHistoryMsg = history && history.length > 0 ? history[history.length - 1] : null;
      if (!lastHistoryMsg || lastHistoryMsg.content !== message) {
        messages.push({ role: "user", content: message });
      }
    }

    // Add an artificial delay to allow the user to see and use the 'Stop' button UI
    await new Promise(resolve => setTimeout(resolve, 1500));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        messages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned error status ${response.status}`);
    }

    const data = await response.json();
    let reply = data.choices[0].message.content;

    // Check if the reply contains the completed JSON block
    const jsonMatch = reply.match(/```json\s*(\{[\s\S]*?\})\s*```/) || reply.match(/(\{[\s\S]*?complete[\s\S]*?\})/);
    
    let isComplete = false;
    let extractedData = null;

    if (jsonMatch) {
      try {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.complete && parsedJson.data) {
          isComplete = true;
          extractedData = parsedJson.data;
          // Strip the JSON block from the reply displayed to the user
          reply = reply.replace(jsonMatch[0], '').trim();
        }
      } catch (err) {
        console.warn("Failed to parse onboarding completion JSON from AI:", err);
      }
    }

    // If complete, register the user in the database
    if (isComplete && extractedData) {
      // Construct initial chat history log
      const initialChatHistory = [];
      if (history && Array.isArray(history)) {
        initialChatHistory.push(...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })));
      }
      const lastHistoryMsg = history && history.length > 0 ? history[history.length - 1] : null;
      if (message && (!lastHistoryMsg || lastHistoryMsg.content !== message)) {
        initialChatHistory.push({ role: 'user', content: message });
      }
      initialChatHistory.push({ role: 'assistant', content: reply });

      // Create submission payload
      const submissionPayload = {
        name,
        email: email.toLowerCase(),
        phone: extractedData.phone || 'Not provided',
        targetRole: extractedData.targetRole || 'Scholar',
        skills: extractedData.skills || 'Not specified',
        education: extractedData.education || 'Not specified',
        experience: extractedData.experience || 'Not specified',
        role: 'Scholar',
        message: 'Onboarded dynamically via NayePankh AI Mentor Chatbot.',
        chatHistory: initialChatHistory
      };

      // Save to database
      let savedDoc;
      if (isMongoConnected) {
        savedDoc = await MongoSubmission.create(submissionPayload);
      } else {
        const db = readJsonDB();
        savedDoc = {
          _id: `submission-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ...submissionPayload,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          analysis: null
        };
        db.submissions.unshift(savedDoc);
        writeJsonDB(db);
      }

      // Now generate the structured analysis for the student profile using Llama-3 JSON mode to populate analysis field
      try {
        const analysisPrompt = `You are an elite career mentor for Indian freshers. Generate the skills gaps and weekly roadmap JSON.
        Target Role: ${submissionPayload.targetRole}
        Skills: ${submissionPayload.skills}
        Education: ${submissionPayload.education}
        Experience: ${submissionPayload.experience}`;
        
        const analysisSystemPrompt = `You MUST return your response as a valid JSON object matching:
{
  "skillGaps": [
    { "skill": "String", "percentage": Number }
  ],
  "roadmap": [
    { "week": Number, "focus": "String", "tasks": ["String"] }
  ]
}
Return ONLY the raw, parsable JSON string.`;

        const analysisResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: analysisSystemPrompt },
              { role: "user", content: analysisPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            response_format: { type: "json_object" }
          }),
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          const analysisJson = JSON.parse(analysisData.choices[0].message.content);
          
          if (isMongoConnected) {
            await MongoSubmission.findByIdAndUpdate(savedDoc._id, { analysis: analysisJson });
          } else {
            const db = readJsonDB();
            const idx = db.submissions.findIndex(s => s._id === savedDoc._id);
            if (idx !== -1) {
              db.submissions[idx].analysis = analysisJson;
              writeJsonDB(db);
            }
          }
        }
      } catch (err) {
        console.error("Failed to generate structured background analysis:", err);
      }

      return res.json({
        success: true,
        reply,
        complete: true,
        user: {
          name,
          email,
          id: savedDoc._id
        }
      });
    }

    res.json({
      success: true,
      reply,
      complete: false
    });

  } catch (error) {
    console.error("Error during onboarding chat API:", error);
    res.status(500).json({ success: false, error: "Onboarding error: " + error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 She Can Foundation Backend Server is active on port http://localhost:${PORT}`);
  console.log(`🔌 Database Mode: ${dbType}`);
});
