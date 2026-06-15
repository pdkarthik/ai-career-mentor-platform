import React, { useState, useEffect } from 'react';
import { Award, Sun, Moon, Menu, X, PlusCircle, Send, User, Mail, Phone, Briefcase, GraduationCap, FileText, ChevronRight, MessageSquare } from 'lucide-react';
import './LandingPage.css';

export default function LandingPage({ onToggleAdmin, apiBaseUrl, theme, onToggleTheme }) {
  // --- Auth & Identity States ---
  const [user, setUser] = useState(null); // Holds { name, email, submissionId }
  const [emailInput, setEmailInput] = useState('');
  const [profileInput, setProfileInput] = useState({
    name: '',
    phone: '',
    targetRole: '',
    skills: '',
    education: '',
    experience: ''
  });
  
  const [onboardingStep, setOnboardingStep] = useState('email'); // 'email' | 'profile'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // --- Chat & Session States ---
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load user session from localStorage on mount (using our isolated prefix!)
  useEffect(() => {
    const cachedUser = localStorage.getItem('nayepankh_user');
    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        setUser(parsedUser);
        initializeSessions(parsedUser.email, parsedUser.name, parsedUser.analysis);
      } catch (e) {
        localStorage.removeItem('nayepankh_user');
      }
    }
  }, []);

  const initializeSessions = (email, name, analysis) => {
    const initialSessionId = `sess_${Date.now()}`;
    const defaultSessions = [
      {
        sessionId: initialSessionId,
        topicName: "🚀 Web Development Track",
        messages: [
          { 
            role: "assistant", 
            content: `### Welcome to NayePankh AI Career Mentor, **${name}**!\n\nI see you want to prepare for a career in programming. Ask me anything to build your custom milestone roadmap!\n\n*Type a question below to start chatting with your coach.*` 
          }
        ]
      }
    ];

    // If student has an existing AI analysis from the database, append it as a session
    if (analysis && (analysis.skillGaps || analysis.roadmap)) {
      const analysisId = `sess_analysis_${Date.now()}`;
      
      let analysisSummary = `### 📊 Your AI Career Mentoring Report\n\n`;
      if (analysis.skillGaps && analysis.skillGaps.length > 0) {
        analysisSummary += `#### Current Skill Gaps Evaluated:\n`;
        analysis.skillGaps.forEach(gap => {
          analysisSummary += `* **${gap.skill}**: ${gap.percentage}% Gap remaining\n`;
        });
      }
      
      if (analysis.roadmap && analysis.roadmap.length > 0) {
        analysisSummary += `\n#### Recommended weekly study timeline:\n`;
        analysis.roadmap.forEach(week => {
          analysisSummary += `* **Week ${week.week}**: *${week.focus}*\n`;
        });
      }

      defaultSessions.unshift({
        sessionId: analysisId,
        topicName: "📊 AI Analysis & Gaps Report",
        messages: [
          { role: "assistant", content: analysisSummary }
        ]
      });
    }

    setSessions(defaultSessions);
    setCurrentSessionId(defaultSessions[0].sessionId);
    setMessages(defaultSessions[0].messages);
  };

  // Check if student exists in database
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setIsChecking(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${apiBaseUrl}/submissions/email/${encodeURIComponent(emailInput.trim())}`);
      const data = await response.json();

      if (response.ok && data.success) {
        if (data.found) {
          // Student exists! Log in and load their data
          const userData = {
            name: data.data.name,
            email: data.data.email,
            id: data.data._id,
            analysis: data.data.analysis
          };
          localStorage.setItem('nayepankh_user', JSON.stringify(userData));
          setUser(userData);
          initializeSessions(data.data.email, data.data.name, data.data.analysis);
        } else {
          // Student doesn't exist, proceed to profile registration fields
          setProfileInput(prev => ({ ...prev, email: emailInput.trim() }));
          setOnboardingStep('profile');
        }
      } else {
        setErrorMsg(data.error || 'Connection error querying student records.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with backend database.');
    } finally {
      setIsChecking(false);
    }
  };

  // Submit profile registration form
  const handleRegisterProfile = async (e) => {
    e.preventDefault();
    if (!profileInput.name || !profileInput.phone || !profileInput.targetRole || !profileInput.skills || !profileInput.education || !profileInput.experience) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    setIsChecking(true);
    setErrorMsg('');

    const payload = {
      ...profileInput,
      email: emailInput.trim(),
      role: 'Scholar',
      message: 'AI Chatbot Onboarding initial profile creation.'
    };

    try {
      const response = await fetch(`${apiBaseUrl}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const userData = {
          name: data.data.name,
          email: data.data.email,
          id: data.data._id,
          analysis: data.data.analysis
        };
        localStorage.setItem('nayepankh_user', JSON.stringify(userData));
        setUser(userData);
        initializeSessions(data.data.email, data.data.name, data.data.analysis);
      } else {
        setErrorMsg(data.error || 'Registration failed. Please check form constraints.');
      }
    } catch (err) {
      setErrorMsg('Network error creating profile.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateNewSession = () => {
    const newId = `sess_${Date.now()}`;
    const newSession = {
      sessionId: newId,
      topicName: "💬 New Career Track",
      messages: [
        { role: "assistant", content: "Started a fresh career coaching node. Tell me about your target professional goals!" }
      ]
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
    setMessages(newSession.messages);
  };

  const handleSwitchSession = (id) => {
    const target = sessions.find(s => s.sessionId === id);
    if (target) {
      setCurrentSessionId(id);
      setMessages(target.messages);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userPrompt = inputMessage.trim();
    setInputMessage('');
    
    // Append user message locally
    const updatedMessages = [...messages, { role: 'user', content: userPrompt }];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Update session tracking lists
    setSessions(prev => prev.map(s => s.sessionId === currentSessionId ? { ...s, messages: updatedMessages } : s));

    try {
      // Simulating connection payload pipeline to POST /api/mentor/chat
      setTimeout(() => {
        const aiResponse = {
          role: 'assistant',
          content: `### 🎯 Actionable Timeline Milestone Secured!\n\nYou asked about: **"${userPrompt}"**.\n\n* **Step 1 (The Tool):** Use React Router DOM for state management pipelines.\n* **Step 2 (The Logic):** Wire up dynamic hooks inside your app routing config setup.\n\n⚠️ **Rookie Pitfall:** Avoid nesting router trees patterns without error boundary checks!`
        };
        
        const finalMessages = [...updatedMessages, aiResponse];
        setMessages(finalMessages);
        setSessions(prev => prev.map(s => s.sessionId === currentSessionId ? { ...s, messages: finalMessages } : s));
        setIsLoading(false);
      }, 1200);

    } catch (error) {
      console.error("Failed handling chat pipeline stream", error);
      setIsLoading(false);
    }
  };

  const handleLogoutUser = () => {
    localStorage.removeItem('nayepankh_user');
    setUser(null);
    setEmailInput('');
    setProfileInput({
      name: '',
      phone: '',
      targetRole: '',
      skills: '',
      education: '',
      experience: ''
    });
    setOnboardingStep('email');
  };

  // Custom localized Markdown Interpreter for rendering chat bubbles cleanly
  const RenderMarkdown = ({ text }) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) return <h3 key={i} className="chat-md-h3">{trimmed.replace('### ', '')}</h3>;
      if (trimmed.startsWith('#### ')) return <h4 key={i} className="chat-md-h3" style={{ fontSize: '1rem', opacity: 0.9 }}>{trimmed.replace('#### ', '')}</h4>;
      if (trimmed.startsWith('* ')) return <li key={i} className="chat-md-li">{trimmed.substring(2)}</li>;
      if (trimmed.includes('**')) {
        const parts = trimmed.split('**');
        return <p key={i} className="chat-md-p">{parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx}>{p}</strong> : p)}</p>;
      }
      return <p key={i} className="chat-md-p">{line}</p>;
    });
  };

  return (
    <div className="landing-layout-wrapper">
      
      {/* 1. TOP NAVBAR */}
      <nav className="cw-navbar" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={18} color="#fff" />
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)'
          }}>
            NAYEPANKH <span style={{ color: 'var(--secondary)' }}>AI MENTOR</span>
          </span>
        </div>

        <div className="cw-navbar-links">
          <a href="#mission" className="cw-navbar-link" onClick={(e) => { e.preventDefault(); alert("NayePankh Foundation is a youth empowerment NGO."); }}>About Us</a>
          <a href="#spring" className="cw-navbar-link" onClick={(e) => { e.preventDefault(); alert("Empowering careers through custom roadmaps and mentor tracking."); }}>Our Impact</a>
        </div>

        <div className="cw-navbar-actions">
          <button onClick={onToggleAdmin} className="btn btn-outline cw-navbar-admin-btn" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px' }}>
            Admin Portal
          </button>
          
          <button 
            onClick={onToggleTheme} 
            className="theme-toggle-btn"
            style={{ width: '36px', height: '36px' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="theme-toggle-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </span>
          </button>
          
          {user && (
            <button onClick={handleLogoutUser} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
              Log Out
            </button>
          )}

          {/* Mobile Hamburger Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="cw-mobile-menu-btn"
            style={{ width: '36px', height: '36px' }}
            title="Toggle Menu"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="cw-mobile-menu-panel">
            <button 
              onClick={() => { onToggleAdmin(); setMobileMenuOpen(false); }} 
              className="btn btn-outline" 
              style={{ width: '100%', padding: '10px', fontSize: '0.9rem', borderRadius: '6px', marginTop: '4px' }}
            >
              Admin Portal
            </button>
            {user && (
              <button 
                onClick={() => { handleLogoutUser(); setMobileMenuOpen(false); }} 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '10px', fontSize: '0.9rem', borderRadius: '6px', marginTop: '8px', color: 'var(--error)' }}
              >
                Log Out
              </button>
            )}
          </div>
        )}
      </nav>

      {/* 2. MAIN WORKSPACE OR ONBOARDING */}
      <div className="landing-main-content">
        {!user ? (
          <div className="onboard-container">
            <div className="onboard-card">
              <div className="onboard-header">
                <h2>Initialize AI Career Mentor Session</h2>
                <p>Provide your secure email to launch your secure, multi-session personalized roadmap chat portal.</p>
              </div>

              {onboardingStep === 'email' ? (
                <form onSubmit={handleCheckEmail} className="onboard-form">
                  <div className="form-group">
                    <label>Secure Email Address (Onboarding Key)</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="email" 
                        placeholder="e.g. priyal@nayepankh.org" 
                        value={emailInput} 
                        onChange={(e) => setEmailInput(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                        required 
                        disabled={isChecking}
                      />
                    </div>
                  </div>
                  
                  {errorMsg && <div style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '4px' }}>⚠️ {errorMsg}</div>}
                  
                  <button type="submit" className="btn-onboard-submit" disabled={isChecking}>
                    {isChecking ? 'Verifying Records...' : 'Continue to Dashboard'}
                    {!isChecking && <ChevronRight size={16} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterProfile} className="onboard-form" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--accent)', background: 'rgba(245, 158, 11, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)', margin: '0 0 10px 0' }}>
                    Welcome! It looks like you're new. Let's create your mentoring profile to build your roadmap.
                  </p>

                  <div className="form-group">
                    <label>Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        placeholder="e.g. Priyal Sharma" 
                        value={profileInput.name} 
                        onChange={(e) => setProfileInput({...profileInput, name: e.target.value})}
                        style={{ paddingLeft: '40px' }}
                        required 
                        disabled={isChecking}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="tel" 
                        placeholder="e.g. +91 98765 43210" 
                        value={profileInput.phone} 
                        onChange={(e) => setProfileInput({...profileInput, phone: e.target.value})}
                        style={{ paddingLeft: '40px' }}
                        required 
                        disabled={isChecking}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Target Career Role</label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        placeholder="e.g. Frontend React Developer" 
                        value={profileInput.targetRole} 
                        onChange={(e) => setProfileInput({...profileInput, targetRole: e.target.value})}
                        style={{ paddingLeft: '40px' }}
                        required 
                        disabled={isChecking}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Technical Skills</label>
                    <div style={{ position: 'relative' }}>
                      <GraduationCap size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                      <textarea 
                        placeholder="e.g. HTML, CSS, JavaScript, React, Git" 
                        value={profileInput.skills} 
                        onChange={(e) => setProfileInput({...profileInput, skills: e.target.value})}
                        style={{ paddingLeft: '40px', minHeight: '60px', resize: 'vertical' }}
                        required 
                        disabled={isChecking}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Education / College details</label>
                    <div style={{ position: 'relative' }}>
                      <GraduationCap size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        placeholder="e.g. B.Tech in CSE (Batch of 2026)" 
                        value={profileInput.education} 
                        onChange={(e) => setProfileInput({...profileInput, education: e.target.value})}
                        style={{ paddingLeft: '40px' }}
                        required 
                        disabled={isChecking}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Projects & Background summary</label>
                    <div style={{ position: 'relative' }}>
                      <FileText size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                      <textarea 
                        placeholder="Briefly describe any personal projects, internships, or background info..." 
                        value={profileInput.experience} 
                        onChange={(e) => setProfileInput({...profileInput, experience: e.target.value})}
                        style={{ paddingLeft: '40px', minHeight: '80px', resize: 'vertical' }}
                        required 
                        disabled={isChecking}
                      />
                    </div>
                  </div>

                  {errorMsg && <div style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '4px' }}>⚠️ {errorMsg}</div>}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setOnboardingStep('email')} className="btn btn-outline" style={{ flex: 1, padding: '12px' }} disabled={isChecking}>
                      Back
                    </button>
                    <button type="submit" className="btn-onboard-submit" style={{ flex: 2, margin: 0 }} disabled={isChecking}>
                      {isChecking ? 'Registering...' : 'Register & Start'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="chat-dashboard-container">
            {/* SIDEBAR: Active Sessions Directories Tracker */}
            <div className="chat-sidebar">
              <button className="btn-new-track" onClick={handleCreateNewSession}>
                <PlusCircle size={16} />
                <span>New Career Track</span>
              </button>
              <div className="session-history-tree">
                <div className="tree-title">Your Active Roadmaps</div>
                {sessions.map((sess) => (
                  <div 
                    key={sess.sessionId}
                    className={`session-tree-node ${currentSessionId === sess.sessionId ? 'node-active' : ''}`}
                    onClick={() => handleSwitchSession(sess.sessionId)}
                  >
                    {sess.topicName.includes("🚀") || sess.topicName.includes("💬") || sess.topicName.includes("📊") ? sess.topicName : `📂 ${sess.topicName}`}
                  </div>
                ))}
              </div>
              <div className="sidebar-footer-profile">
                <div className="user-profile-badge">🧑‍💻 {user.name}</div>
                <div className="user-email-sub">{user.email}</div>
              </div>
            </div>

            {/* WORKSPACE: Real-Time Messaging Component Terminal */}
            <div className="chat-main-workspace">
              <div className="chat-messages-scroll-well">
                {messages.map((msg, index) => (
                  <div key={index} className={`chat-bubble-wrapper ${msg.role === 'user' ? 'align-user' : 'align-mentor'}`}>
                    <div className={`chat-bubble-box ${msg.role === 'user' ? 'user-theme' : 'mentor-theme'}`}>
                      <RenderMarkdown text={msg.content} />
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="chat-bubble-wrapper align-mentor">
                    <div className="chat-bubble-box mentor-theme skeleton-loading">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line short"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action input text strip row */}
              <form onSubmit={handleSendMessage} className="chat-input-bar-dock">
                <input 
                  type="text" 
                  placeholder="Ask your NayePankh mentor a question about your custom timeline..." 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                />
                <button type="submit" className="btn-chat-send" disabled={isLoading}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
