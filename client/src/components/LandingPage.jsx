import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Send, Award, Heart, Shield, CheckCircle, Clock, Copy, ArrowRight, BookOpen, Users, Compass, Sun, Moon, ChevronDown, ChevronUp, Menu, X, Square } from 'lucide-react';

const QUESTIONS = [
  { field: 'name', prompt: "Hello! I am your NayePankh AI Career Mentor. I will guide you through building a custom milestone roadmap. Let's start with your Full Name. What is your name?" },
  { field: 'email', prompt: "Thank you! What is your Email Address? I will use this to retrieve your active session or create your profile." },
  { field: 'phone', prompt: "Got it. What is your Phone Number?" },
  { field: 'targetRole', prompt: "What is your Target Career Role? (e.g. Frontend React Developer, Python Data Analyst)" },
  { field: 'skills', prompt: "What are your Technical Skills? (e.g. HTML, CSS, JavaScript, React)" },
  { field: 'education', prompt: "What is your Education details? (e.g. B.Tech in CSE / BCA - Graduation 2026)" },
  { field: 'experience', prompt: "Perfect! Lastly, describe any projects, internships, or background summary so I can evaluate your gaps." }
];

const LandingPage = ({ onToggleAdmin, apiBaseUrl, theme, onToggleTheme }) => {
  // Mobile Navbar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // --- Conversational Chatbot States ---
  const [userSession, setUserSession] = useState(null); // Holds { name, email, id }
  const [profileInput, setProfileInput] = useState(() => {
    const cached = localStorage.getItem('nayepankh_profileInput');
    return cached ? JSON.parse(cached) : {
      name: '',
      email: '',
      phone: '',
      targetRole: '',
      skills: '',
      education: '',
      experience: ''
    };
  });
  const [userAnalysis, setUserAnalysis] = useState(null);
  const [showGaps, setShowGaps] = useState(false);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const cached = localStorage.getItem('nayepankh_questionIndex');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [chatMessages, setChatMessages] = useState(() => {
    const cached = localStorage.getItem('nayepankh_chatMessages');
    return cached ? JSON.parse(cached) : [];
  });
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('president@nayepankh.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Statistics counters
  const [stats, setStats] = useState({ count: 1200, countries: 24, hours: 450 });

  useEffect(() => {
    // Counter animation
    const interval = setInterval(() => {
      setStats(prev => ({
        count: prev.count < 3500 ? prev.count + 45 : 3500,
        countries: prev.countries < 54 ? prev.countries + 1 : 54,
        hours: prev.hours < 980 ? prev.hours + 12 : 980
      }));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // On mount: check for cached user session (using isolated prefix)
  useEffect(() => {
    const cached = localStorage.getItem('nayepankh_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setUserSession(parsed);
        loadUserAnalysis(parsed.email, parsed.name);
      } catch (err) {
        localStorage.removeItem('nayepankh_user');
        resetChatToStart();
      }
    } else {
      const cachedMessages = localStorage.getItem('nayepankh_chatMessages');
      if (!cachedMessages) {
        resetChatToStart();
      }
    }
  }, []);

  // Save states to localStorage whenever they update
  useEffect(() => {
    localStorage.setItem('nayepankh_questionIndex', currentQuestionIndex.toString());
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem('nayepankh_chatMessages', JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('nayepankh_profileInput', JSON.stringify(profileInput));
  }, [profileInput]);

  // Auto scroll to chat bottom without moving the page window
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else if (chatEndRef.current) {
      // Fallback if container is not available
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, isLoading]);

  const loadUserAnalysis = async (email, name) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/submissions/email/${encodeURIComponent(email.toLowerCase())}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.found) {
        const userData = {
          name: data.data.name,
          email: data.data.email,
          id: data.data._id
        };
        localStorage.setItem('nayepankh_user', JSON.stringify(userData));
        setUserSession(userData);
        setUserAnalysis(data.data.analysis || null);

        if (data.data.chatHistory && data.data.chatHistory.length > 0) {
          setChatMessages(data.data.chatHistory);
        } else {
          let welcomeMsg = `### Welcome back, **${userData.name}**!\n\nI found your active career profile for **${data.data.targetRole || 'General Scholar'}**.`;
          
          const analysis = data.data.analysis;
          if (analysis && (analysis.skillGaps || analysis.roadmap)) {
            welcomeMsg += `\n\nHere is your custom timeline roadmap:\n`;
            if (analysis.skillGaps) {
              welcomeMsg += `\n**Skill Gaps Evaluation:**\n`;
              analysis.skillGaps.forEach(gap => {
                welcomeMsg += `* **${gap.skill}**: ${gap.percentage}% remaining gap\n`;
              });
            }
            if (analysis.roadmap) {
              welcomeMsg += `\n**Weekly Milestones:**\n`;
              analysis.roadmap.forEach(item => {
                welcomeMsg += `* **Week ${item.week} (${item.focus})**\n`;
                item.tasks?.forEach(task => {
                  welcomeMsg += `  - ${task}\n`;
                });
              });
            }
          } else {
            welcomeMsg += `\n\nYour profile is registered under technical skills: **${data.data.skills || 'N/A'}**. Your custom AI analysis is pending review by our mentoring team.`;
          }
          setChatMessages([
            { role: 'assistant', content: welcomeMsg }
          ]);
        }
        setCurrentQuestionIndex(7); // Jump to chatting mode
      } else {
        resetChatToStart();
      }
    } catch (err) {
      console.error('Error fetching user on mount:', err);
      resetChatToStart();
    } finally {
      setIsLoading(false);
    }
  };

  const resetChatToStart = () => {
    const initialMsg = [{ role: 'assistant', content: QUESTIONS[0].prompt }];
    setChatMessages(initialMsg);
    localStorage.setItem('nayepankh_chatMessages', JSON.stringify(initialMsg));
    
    setCurrentQuestionIndex(0);
    localStorage.setItem('nayepankh_questionIndex', '0');
    
    setUserSession(null);
    setUserAnalysis(null);
    setShowGaps(false);
    
    const initialProfile = {
      name: '',
      email: '',
      phone: '',
      targetRole: '',
      skills: '',
      education: '',
      experience: ''
    };
    setProfileInput(initialProfile);
    localStorage.setItem('nayepankh_profileInput', JSON.stringify(initialProfile));
  };

  const handleLogout = () => {
    localStorage.removeItem('nayepankh_user');
    resetChatToStart();
  };

  const handleSendChat = async (e, retryText = null) => {
    if (e) e.preventDefault();
    if (isLoading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }
    
    const userInput = retryText || chatInput.trim();
    if (!userInput) return;

    if (!retryText) {
      setChatInput('');
    }

    let updatedMessages = chatMessages;
    if (retryText) {
      updatedMessages = chatMessages.filter(msg => !msg.isError);
      setChatMessages(updatedMessages);
    } else {
      updatedMessages = [...chatMessages, { role: 'user', content: userInput }];
      setChatMessages(updatedMessages);
    }

    if (currentQuestionIndex === 7) {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();
      try {
        const userId = userSession?.id || JSON.parse(localStorage.getItem('nayepankh_user'))?.id;
        const response = await fetch(`${apiBaseUrl}/mentor/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            submissionId: userId,
            message: userInput,
            history: updatedMessages
          }),
          signal: abortControllerRef.current.signal
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: data.reply
          }]);
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `🤖 **AI Career Mentor**: ⚠️ Failed to get a reply from AI Mentor: ${data.error || 'Server error'}.`
          }]);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `🤖 **AI Career Mentor**: ⏸️ Generation stopped by user.`
          }]);
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `🤖 **AI Career Mentor**: ⚠️ Network error communicating with real-time AI Mentor.`,
            isError: true
          }]);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
      return;
    }

    if (currentQuestionIndex === 100) {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();
      try {
        const response = await fetch(`${apiBaseUrl}/mentor/onboard`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: profileInput.name,
            email: profileInput.email,
            message: userInput,
            history: updatedMessages
          }),
          signal: abortControllerRef.current.signal
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: data.reply
          }]);
          
          if (data.complete) {
            // Dynamic onboarding completed! Set user session
            const userData = {
              name: data.user.name,
              email: data.user.email,
              id: data.user.id
            };
            localStorage.setItem('nayepankh_user', JSON.stringify(userData));
            setUserSession(userData);
            loadUserAnalysis(userData.email, userData.name);
          }
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `🤖 **AI Career Mentor**: ⚠️ Failed to continue onboarding: ${data.error || 'Server error'}.`
          }]);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `🤖 **AI Career Mentor**: ⏸️ Onboarding generation stopped by user.`
          }]);
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `🤖 **AI Career Mentor**: ⚠️ Network error during AI onboarding.`,
            isError: true
          }]);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
      return;
    }

    // Onboarding Mode: Store input and advance
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    const field = currentQuestion.field;
    
    // Save field in local state
    const nextProfile = { ...profileInput, [field]: userInput };
    setProfileInput(nextProfile);

    // If we just collected Email (index 1)
    if (currentQuestionIndex === 1) {
      setIsLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/submissions/email/${encodeURIComponent(userInput.toLowerCase())}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          if (data.found) {
            // Student exists! Log in and load analysis
            const userData = {
              name: data.data.name,
              email: data.data.email,
              id: data.data._id
            };
            localStorage.setItem('nayepankh_user', JSON.stringify(userData));
            setUserSession(userData);
            
            let welcomeContent = `### Welcome back, **${data.data.name}**!\n\nI found your active career profile for **${data.data.targetRole || 'General Mentee'}**.`;
            
            const analysis = data.data.analysis;
            if (analysis && (analysis.skillGaps || analysis.roadmap)) {
              welcomeContent += `\n\nHere is your custom timeline roadmap:\n`;
              if (analysis.skillGaps) {
                welcomeContent += `\n**Skill Gaps Evaluation:**\n`;
                analysis.skillGaps.forEach(gap => {
                  welcomeContent += `* **${gap.skill}**: ${gap.percentage}% remaining gap\n`;
                });
              }
              if (analysis.roadmap) {
                welcomeContent += `\n**Weekly Milestones:**\n`;
                analysis.roadmap.forEach(item => {
                  welcomeContent += `* **Week ${item.week} (${item.focus})**\n`;
                  item.tasks?.forEach(task => {
                    welcomeContent += `  - ${task}\n`;
                  });
                });
              }
            } else {
              welcomeContent += `\n\nYour profile is registered under technical skills: **${data.data.skills || 'N/A'}**. Your custom AI analysis is pending review by our mentoring team.`;
            }
            
            setChatMessages(prev => [...prev, { role: 'assistant', content: welcomeContent }]);
            setCurrentQuestionIndex(7); // Jump to chat mode
            setIsLoading(false);
            return;
          } else {
            // New user! Start dynamic AI onboarding
            const onboardProfile = { ...profileInput, email: userInput.toLowerCase() };
            setProfileInput(onboardProfile);
            setCurrentQuestionIndex(100);

            // Fetch the first dynamic question from AI Mentor
            try {
              const onboardResponse = await fetch(`${apiBaseUrl}/mentor/onboard`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: onboardProfile.name,
                  email: onboardProfile.email,
                  message: "Hello! I am ready to start my profile interview.",
                  history: updatedMessages
                })
              });
              const onboardData = await onboardResponse.json();
              if (onboardResponse.ok && onboardData.success) {
                setChatMessages(prev => [...prev, {
                  role: 'assistant',
                  content: onboardData.reply
                }]);
              } else {
                setChatMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `🤖 **AI Career Mentor**: Nice to meet you, ${onboardProfile.name}! Let's start with your phone number. What is your phone number?`
                }]);
              }
            } catch (err) {
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `🤖 **AI Career Mentor**: Let's build your profile. What is your phone number?`
              }]);
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching student by email:', err);
      }
      setIsLoading(false);
      return;
    }

    // Proceed to next question
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < QUESTIONS.length) {
      setIsLoading(true);
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'assistant', content: QUESTIONS[nextIndex].prompt }]);
        setCurrentQuestionIndex(nextIndex);
        setIsLoading(false);
      }, 600);
    } else {
      // Completed last question (Experience) - register student
      setIsLoading(true);
      const payload = {
        name: nextProfile.name,
        email: nextProfile.email.toLowerCase(),
        phone: nextProfile.phone,
        targetRole: nextProfile.targetRole,
        skills: nextProfile.skills,
        education: nextProfile.education,
        experience: nextProfile.experience,
        role: 'Mentee',
        message: 'Registered through NayePankh AI Mentor Chatbot.'
      };

      try {
        // 1. Submit application to backend
        const regResponse = await fetch(`${apiBaseUrl}/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const regData = await regResponse.json();

        if (regResponse.ok && regData.success) {
          const studentId = regData.data._id;
          
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `### Profile registered successfully!\n\n🤖 *Generating your custom AI Career roadmap using Llama-3... Please wait...*`
          }]);

          // 2. Trigger AI analysis
          const analyzeResponse = await fetch(`${apiBaseUrl}/mentor/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ submissionId: studentId })
          });
          const analyzeData = await analyzeResponse.json();

          if (analyzeResponse.ok && analyzeData.success) {
            const analysis = analyzeData.data.analysis;
            let finalRoadmapContent = `### 🌟 Your Personalized AI Career Timeline is ready!\n\nBased on your target role as **${regData.data.targetRole}**, I have mapped out your milestones:`;
            
            if (analysis.skillGaps) {
              finalRoadmapContent += `\n\n**Skill Gaps Assessment:**\n`;
              analysis.skillGaps.forEach(gap => {
                finalRoadmapContent += `* **${gap.skill}**: ${gap.percentage}% Gap\n`;
              });
            }
            if (analysis.roadmap) {
              finalRoadmapContent += `\n**Timeline Milestones:**\n`;
              analysis.roadmap.forEach(item => {
                finalRoadmapContent += `* **Week ${item.week}**: *${item.focus}*\n`;
                item.tasks?.forEach(task => {
                  finalRoadmapContent += `  - ${task}\n`;
                });
              });
            }

            setChatMessages(prev => [...prev, { role: 'assistant', content: finalRoadmapContent }]);
            
            const userData = {
              name: regData.data.name,
              email: regData.data.email,
              id: studentId
            };
            localStorage.setItem('nayepankh_user', JSON.stringify(userData));
            setUserSession(userData);
            setCurrentQuestionIndex(7);
          } else {
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `⚠️ AI analysis failed: ${analyzeData.error || 'Server error'}. However, your profile was saved. Please contact an admin.`
            }]);
            setCurrentQuestionIndex(7);
          }
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ Profile registration failed: ${regData.error || 'Validation error'}. Please reset the session and try again.`
          }]);
        }
      } catch (err) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Network error communicating with backend database.`
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleApplyClick = (e, role) => {
    if (e) e.preventDefault();
    const element = document.getElementById('apply-fold');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentRoleConfig = {
    image: '/scholar_female.png',
    quote: '"NayePankh AI Mentor pointed out my exact gaps in system design and React state management. The 4-week roadmap helped me structure my prep and land a placement at Infosys."',
    author: 'Priyal Sharma',
    title: 'Junior Web Developer, Infosys'
  };

  return (
    <div style={{ position: 'relative' }}>
      
      {/* 1. TOP NAVBAR */}
      <nav className="cw-navbar">
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
          <a href="#mission" className="cw-navbar-link">About Us</a>
          <a href="#ways-to-give" className="cw-navbar-link">Our Impact</a>
          <a href="#spring" className="cw-navbar-link">Mentoring</a>
          <a href="#transparency" className="cw-navbar-link">Transparency</a>
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

          <a href="#apply-fold" onClick={(e) => handleApplyClick(e)} className="cw-btn-gold cw-navbar-apply-btn">Get Started</a>

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
            <a href="#mission" onClick={() => setMobileMenuOpen(false)} className="cw-mobile-menu-link">About Us</a>
            <a href="#ways-to-give" onClick={() => setMobileMenuOpen(false)} className="cw-mobile-menu-link">Our Impact</a>
            <a href="#spring" onClick={() => setMobileMenuOpen(false)} className="cw-mobile-menu-link">Mentoring</a>
            <a href="#transparency" onClick={() => setMobileMenuOpen(false)} className="cw-mobile-menu-link">Transparency</a>
            <button 
              onClick={() => { onToggleAdmin(); setMobileMenuOpen(false); }} 
              className="btn btn-outline" 
              style={{ width: '100%', padding: '10px', fontSize: '0.9rem', borderRadius: '6px', marginTop: '4px' }}
            >
              Admin Portal
            </button>
          </div>
        )}
      </nav>

      {/* 2. HERO SPLIT SCREEN SECTION */}
      <section className="cw-hero-split">
        
        {/* Left Visual Column */}
        <div 
          className="cw-hero-visual" 
          style={{ backgroundImage: `url('${currentRoleConfig.image}')` }}
        >
          <div className="cw-hero-overlay"></div>
          
          {/* Floating Live Metric */}
          <div className="cw-hero-metric">
            <span className="cw-hero-metric-num">{stats.count}+</span>
            <span className="cw-hero-metric-label">Careers Empowered</span>
          </div>

          {/* Testimonial quote at the bottom */}
          <div className="cw-hero-quote-card">
            <p className="cw-hero-quote-text">{currentRoleConfig.quote}</p>
            <div className="cw-hero-quote-author">
              <div className="cw-hero-quote-avatar">
                <img 
                  src={currentRoleConfig.image} 
                  alt={currentRoleConfig.author} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div>
                <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                  {currentRoleConfig.author}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', margin: 0 }}>
                  {currentRoleConfig.title}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="cw-hero-form-panel">
          <div className="cw-form-wrapper">
            <h1 className="cw-hero-form-title">
              Empower your technical career with AI-driven mentorship.
            </h1>
            <p className="cw-hero-form-desc">
              Indian freshers face unique challenges entering the tech workforce. NayePankh Foundation's AI Mentor provides personalized skills profiling, maps learning paths, and details step-by-step roadmaps to help you land your dream tech job.
            </p>

            {/* Pristine white/dark form card */}
            <div id="apply-fold" className="cw-form-card" style={{ display: 'flex', flexDirection: 'column', height: '650px' }}>
              
              {/* Header Title */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                width: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                  <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-primary)'
                  }}>
                    🤖 AI Career Coach
                  </span>
                </div>
                <button 
                  onClick={handleLogout} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--error)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                  title="Clear Chat & Restart"
                >
                  Clear Chat
                </button>
              </div>

              {/* Tab Toggler (Dynamic Gap Analysis) */}
              {userAnalysis?.skillGaps && (
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  padding: '4px 8px',
                  gap: '8px'
                }}>
                  <button 
                    type="button"
                    onClick={() => setShowGaps(false)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: !showGaps ? 'var(--primary-glow)' : 'transparent',
                      color: !showGaps ? 'var(--primary)' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    💬 Roadmap Chat
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowGaps(true)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: showGaps ? 'var(--primary-glow)' : 'transparent',
                      color: showGaps ? 'var(--primary)' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    📊 Skill Gaps
                  </button>
                </div>
              )}

              {showGaps && userAnalysis?.skillGaps ? (
                /* Visual Skill Gaps Progress Bars */
                <div style={{
                  flex: 1,
                  padding: '20px',
                  overflowY: 'auto',
                  background: 'rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  width: '100%'
                }}>
                  <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Your Skill Gaps Evaluation</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>This analysis highlights the remaining percentage of knowledge gap to close for your target career role.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
                    {userAnalysis.skillGaps.map((gap, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{gap.skill}</span>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{gap.percentage}% Gap</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${gap.percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Normal Chat Log and Input Form */
                <>
                  {/* Chat log body */}
                  <div className="cw-chat-log" ref={chatContainerRef} style={{
                    flex: 1,
                    padding: '20px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    background: 'rgba(0, 0, 0, 0.02)',
                    width: '100%'
                  }}>
                    {chatMessages.map((msg, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        width: '100%'
                      }}>
                        <div style={{
                          maxWidth: '85%',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          fontSize: '0.9rem',
                          lineHeight: '1.5',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          background: msg.role === 'user' 
                            ? (theme === 'dark' ? '#005c4b' : '#d9fdd3') 
                            : 'var(--bg-glass-active)',
                          color: msg.role === 'user' 
                            ? (theme === 'dark' ? '#e9edef' : '#111b21') 
                            : 'var(--text-primary)',
                          border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                          borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                          borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                          overflowX: 'auto',
                          width: '100%'
                        }}>
                          <RenderChatContent text={msg.content} />
                        </div>
                        {msg.isError && (
                          <button
                            onClick={() => {
                              const reversed = [...chatMessages].reverse();
                              const lastUserMsg = reversed.find(m => m.role === 'user');
                              if (lastUserMsg) {
                                handleSendChat(null, lastUserMsg.content);
                              }
                            }}
                            className="btn btn-outline"
                            style={{
                              marginTop: '8px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              borderRadius: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--error)',
                              borderColor: 'var(--error)'
                            }}
                          >
                            ↻ Retry
                          </button>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                        <div style={{
                          maxWidth: '120px',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          background: 'var(--bg-glass-active)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div className="skeleton-line" style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', width: '80px' }}></div>
                          <div className="skeleton-line" style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', width: '50px' }}></div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef}></div>
                  </div>

                  {/* Chat input form */}
                  <form onSubmit={handleSendChat} style={{
                    padding: '12px 20px',
                    borderTop: '1px solid var(--border-color)',
                    background: 'rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <input 
                      type="text" 
                      placeholder={currentQuestionIndex === 7 ? "Ask follow-up questions..." : (currentQuestionIndex === 100 ? "Answer AI mentor's question..." : "Type your response here...")}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: 'var(--bg-input)',
                        border: '1.5px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    <button 
                      type="submit" 
                      disabled={!isLoading && !chatInput.trim()}
                      style={{
                        padding: '10px 16px',
                        background: (!chatInput.trim() && !isLoading) ? 'var(--bg-secondary)' : (isLoading ? 'var(--error)' : 'var(--primary)'),
                        color: (!chatInput.trim() && !isLoading) ? 'var(--text-muted)' : '#fff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: (!chatInput.trim() && !isLoading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: (!chatInput.trim() && !isLoading) ? 'none' : (isLoading ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'var(--shadow-neon-primary)'),
                        transition: 'var(--transition-smooth)'
                      }}
                      title={isLoading ? "Stop generating response" : "Send message"}
                    >
                      {isLoading ? <Square size={14} fill="currentColor" /> : <Send size={14} />}
                    </button>
                  </form>
                </>
              )}

            </div>

          </div>
        </div>

      </section>

      {/* 3. SECTION: MORE WAYS TO GIVE */}
      <section id="ways-to-give" className="cw-section">
        <div className="cw-section-container">
          
          <div className="cw-section-header">
            <h2 className="serif-title cw-section-title">More ways to give</h2>
          </div>

          <div className="cw-ways-grid">
            
            {/* Card 1: Honor educator */}
            <div className="cw-way-card">
              <div className="cw-way-icon-box">
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <rect x="15" y="25" width="70" height="50" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M15 25 L50 55 L85 25" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M42 48 C44 50, 48 52, 50 52 C52 52, 56 50, 58 48" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="50" cy="42" r="7" fill="#FFCA0A" />
                </svg>
              </div>
              <h3 className="cw-way-card-title">Honor someone special</h3>
              <p className="cw-way-card-text">
                Honor or remember someone special by making a technical scholarship gift in their name.
              </p>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-way-link">GIVE IN HONOR OF SOMEONE</a>
            </div>

            {/* Card 2: Legacy giving */}
            <div className="cw-way-card">
              <div className="cw-way-icon-box">
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <path d="M50 85 L50 45" fill="none" stroke="currentColor" strokeWidth="3" />
                  <path d="M50 45 Q35 35, 30 25 Q35 15, 50 25" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M50 45 Q65 35, 70 25 Q65 15, 50 25" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="50" cy="22" r="4" fill="#FFCA0A" />
                  <path d="M20 75 Q40 85, 50 85 Q60 85, 80 75" fill="none" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </div>
              <h3 className="cw-way-card-title">Legacy giving</h3>
              <p className="cw-way-card-text">
                Join us in shaping the future and making tech education accessible to underprivileged youth a part of your lasting legacy.
              </p>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-way-link">LEARN MORE</a>
            </div>

            {/* Card 3: Crypto */}
            <div className="cw-way-card">
              <div className="cw-way-icon-box">
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="42" y="32" width="16" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <line x1="42" y1="44" x2="58" y2="44" stroke="currentColor" strokeWidth="2.5" />
                  <line x1="42" y1="56" x2="58" y2="56" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="50" cy="50" r="6" fill="#FFCA0A" />
                </svg>
              </div>
              <h3 className="cw-way-card-title">Donate with cryptocurrency</h3>
              <p className="cw-way-card-text">
                We accept bitcoin, ether, litecoin, USDC, Solana, and other top-tier decentralized assets.
              </p>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-way-link">GIVE CRYPTO</a>
            </div>

            {/* Card 4: Check/Stock */}
            <div className="cw-way-card">
              <div className="cw-way-icon-box">
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <rect x="15" y="30" width="70" height="40" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <line x1="25" y1="42" x2="75" y2="42" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="25" y1="55" x2="55" y2="55" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="68" cy="55" r="5" fill="#FFCA0A" />
                  <path d="M72 25 L82 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="cw-way-card-title">Give by check or stock</h3>
              <p className="cw-way-card-text">
                We also accept secure direct donations by checks, wire transfers, stock grants, or corporate matching.
              </p>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-way-link">GET THE DETAILS</a>
            </div>

          </div>

        </div>
      </section>

      {/* 4. SECTION: TRUST AND TRANSPARENCY */}
      <section id="transparency" className="cw-section" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="cw-section-container">
          
          <div className="cw-section-header">
            <h2 className="serif-title cw-section-title">You deserve to give with confidence</h2>
            <p className="cw-section-desc">
              All of our operational expenses are funded by a private community of visionary founders, so you can trust 100% of your sponsor support goes directly to student devices, tech bootcamps, and career resources. Every cent, every time.
            </p>
          </div>

          {/* Badges Container */}
          <div className="cw-badges-flex">
            
            {/* Badge 1: Top Rated */}
            <div className="cw-trust-badge">
              <svg viewBox="0 0 80 80" style={{ width: '60px', height: '60px', marginBottom: '12px' }}>
                <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M25 50 C25 35, 55 35, 55 50 Z" fill="#222520" />
                <circle cx="40" cy="30" r="8" fill="#FFCA0A" />
                <path d="M15 40 L65 40" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>Charity Watch</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOP-RATED</span>
            </div>

            {/* Badge 2: Platinum */}
            <div className="cw-trust-badge">
              <svg viewBox="0 0 80 80" style={{ width: '60px', height: '60px', marginBottom: '12px' }}>
                <rect x="20" y="15" width="40" height="50" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M30 35 L40 45 L50 25" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="40" cy="38" r="14" fill="none" stroke="#FFCA0A" strokeWidth="2" strokeDasharray="3,3" />
              </svg>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>Platinum</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRANSPARENCY 2026</span>
            </div>

            {/* Badge 3: Navigator */}
            <div className="cw-trust-badge">
              <svg viewBox="0 0 80 80" style={{ width: '60px', height: '60px', marginBottom: '12px' }}>
                <path d="M40 10 L50 35 L78 35 L55 50 L65 78 L40 60 L15 78 L25 50 L2 35 L30 35 Z" fill="#FFCA0A" stroke="currentColor" strokeWidth="1" />
                <circle cx="40" cy="42" r="10" fill="none" stroke="#fff" strokeWidth="1.5" />
              </svg>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>Charity Navigator</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>FOUR-STAR ★★★★</span>
            </div>

            {/* Badge 4: BBB */}
            <div className="cw-trust-badge">
              <svg viewBox="0 0 80 80" style={{ width: '60px', height: '60px', marginBottom: '12px' }}>
                <polygon points="40,10 65,22 65,58 40,70 15,58 15,22" fill="none" stroke="currentColor" strokeWidth="2" />
                <text x="25" y="46" fontFamily="var(--font-heading)" fontSize="20" fontWeight="900" fill="currentColor">BBB</text>
                <circle cx="40" cy="60" r="4" fill="#FFCA0A" />
              </svg>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>BBB Accredited</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>CHARITY SEAMLESS</span>
            </div>

          </div>

        </div>
      </section>

      {/* 5. SECTION: JOIN THE SPRING COLLAGE & COHORT SPONSOR */}
      <section id="spring" className="cw-section cream">
        <div className="cw-section-container">
          
          {/* Collage Split */}
          <div className="cw-spring-split">
            
            {/* Left Col: Three Tilted Real People Images */}
            <div className="cw-spring-split-col">
              <div className="cw-spring-collage">
                <div className="cw-collage-card">
                  <img src="/spring_member_1.png" alt="Spring Member 1" />
                </div>
                <div className="cw-collage-card">
                  <img src="/spring_member_2.png" alt="Spring Member 2" />
                </div>
                <div className="cw-collage-card">
                  <img src="/spring_member_3.png" alt="Spring Member 3" />
                </div>
              </div>
            </div>

            {/* Right Col: Call to Action */}
            <div className="cw-spring-split-col" style={{ textAlign: 'left' }}>
              <h2 className="serif-title cw-section-title" style={{ fontSize: '2.3rem', lineHeight: '1.2' }}>
                Join Our Community to invest in tech education & mentorship
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: '24px 0 32px 0', lineHeight: '1.6' }}>
                Support monthly, and you'll become a part of NayePankh's Mentor Network, a passionate community of global mentors and sponsors invested in a world where every Indian youth has equal access to shape the technical future.
              </p>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-btn-gold" style={{ padding: '14px 32px', display: 'inline-block' }}>JOIN TODAY</a>
            </div>

          </div>

          {/* Alternate Split: Left Text, Right Large Image */}
          <div className="cw-spring-split alternate">
            
            {/* Right Col: Large Image */}
            <div className="cw-spring-split-col">
              <div className="cw-split-image-container">
                <img src="/tech_pioneers.png" alt="Tech Pioneers Coding" />
              </div>
            </div>

            {/* Left Col: Text */}
            <div className="cw-spring-split-col" style={{ textAlign: 'left' }}>
              <h2 className="serif-title cw-section-title" style={{ fontSize: '2.3rem', lineHeight: '1.2' }}>
                Sponsor a tech cohort or regional chapter project
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: '24px 0 32px 0', lineHeight: '1.6' }}>
                Transform an entire regional code club, high-school chapter, or community tech bootcamp with a corporate talent pipeline sponsorship or device grant of $10,000 or more.
              </p>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-btn-gold" style={{ padding: '14px 32px', display: 'inline-block' }}>LEARN MORE</a>
            </div>

          </div>

        </div>
      </section>

      {/* 6. METRICS OVERVIEW */}
      <section id="mission" className="cw-section" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="cw-section-container" style={{ textAlign: 'center' }}>
          
          <h2 className="serif-title cw-section-title" style={{ marginBottom: '50px' }}>Our Collective Impact</h2>
          
          <div className="cw-metrics-grid">
            <div>
              <h3 style={{ fontSize: '3rem', color: '#695CFE', fontWeight: 800, margin: 0 }}>{stats.count}+</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px' }}>Active Members</p>
            </div>
            <div>
              <h3 style={{ fontSize: '3rem', color: '#FFCA0A', fontWeight: 800, margin: 0 }}>{stats.countries}+</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px' }}>University Chapters</p>
            </div>
            <div>
              <h3 style={{ fontSize: '3rem', color: '#F43F97', fontWeight: 800, margin: 0 }}>{stats.hours}k+</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '10px' }}>Mentorship Hours</p>
            </div>
          </div>

        </div>
      </section>

      {/* 7. PREMIUM MULTI-COLUMN FOOTER */}
      <footer className="cw-footer">
        <div className="cw-section-container" style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
          
          {/* Main Footer Directory Grid */}
          <div className="cw-footer-grid">
            
            {/* Column 1: Take Action */}
            <div className="cw-footer-col">
              <span className="cw-footer-col-title">Take Action</span>
              <a href="#apply-fold" onClick={(e) => handleApplyClick(e, 'Mentee')} className="cw-footer-link">Apply as Mentee</a>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-footer-link">Apply as Mentor</a>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-footer-link">Sponsor a Chapter</a>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-footer-link">Join NayePankh</a>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-footer-link">Other Ways to Support</a>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-footer-link">Gift in Honor of Someone</a>
            </div>

            {/* Column 2: About Us */}
            <div className="cw-footer-col">
              <span className="cw-footer-col-title">About Us</span>
              <a href="#mission" className="cw-footer-link">Our Tech Mission</a>
              <a href="#transparency" className="cw-footer-link">Financial Auditing</a>
              <a href="#transparency" className="cw-footer-link">Transparency Reports</a>
              <a href="#mission" className="cw-footer-link">Chapter Locations</a>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-footer-link">Leadership & Team</a>
              <a href="https://nayepankh.com" target="_blank" rel="noopener noreferrer" className="cw-footer-link">Frequently Asked FAQs</a>
            </div>

            {/* Column 3: Tech Impact */}
            <div className="cw-footer-col">
              <span className="cw-footer-col-title">Tech Impact</span>
              <a href="#mission" className="cw-footer-link">Technical Bootcamps</a>
              <a href="#mission" className="cw-footer-link">Device Procurements</a>
              <a href="#mission" className="cw-footer-link">Mentorship Guild</a>
              <a href="#mission" className="cw-footer-link">Cohort Pipelines</a>
              <a href="#mission" className="cw-footer-link">Workspace Foundations</a>
              <a href="#transparency" className="cw-footer-link">Confidence Badges</a>
            </div>

            {/* Column 4: Stay Connected */}
            <div className="cw-footer-col">
              <span className="cw-footer-col-title">Stay Connected</span>
              <p className="cw-footer-text">
                Receive quarterly impact digests, inspiring placement stories, and organizational transparency summaries.
              </p>
              <form 
                className="cw-newsletter-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert('Thank you for subscribing to the NayePankh Foundation newsletter!');
                  e.target.reset();
                }}
              >
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="cw-newsletter-input" 
                  required 
                />
                <button type="submit" className="cw-newsletter-btn">
                  <Send size={15} />
                </button>
              </form>
            </div>

          </div>

          {/* Bottom Copyright and Branding Credit */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '30px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={20} color="var(--secondary)" />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                NAYEPANKH FOUNDATION
              </span>
            </div>

            {/* Social Media Links */}
            <div className="cw-footer-social-row">
              <a href="https://www.instagram.com/nayepankhfoundation" target="_blank" rel="noopener noreferrer" className="cw-social-footer-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                <span>Instagram</span>
              </a>
              <a href="https://www.linkedin.com/company/nayepankh" target="_blank" rel="noopener noreferrer" className="cw-social-footer-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                <span>LinkedIn</span>
              </a>
              <a href="https://youtube.com/@nayepankhfoundation" target="_blank" rel="noopener noreferrer" className="cw-social-footer-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                <span>YouTube</span>
              </a>
              <a href="https://facebook.com/nayepankhfoundation" target="_blank" rel="noopener noreferrer" className="cw-social-footer-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                <span>Facebook</span>
              </a>
              <a href="https://x.com/nayepankh" target="_blank" rel="noopener noreferrer" className="cw-social-footer-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>
                <span>X (Twitter)</span>
              </a>
              <button 
                onClick={handleCopyEmail}
                className="cw-social-footer-link" 
                style={{ 
                  cursor: 'pointer', 
                  background: copiedEmail ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  borderColor: copiedEmail ? 'var(--secondary)' : 'var(--border-color)',
                  color: copiedEmail ? 'var(--secondary)' : 'var(--text-secondary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                title="Click to copy email address"
              >
                {copiedEmail ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                )}
                <span>{copiedEmail ? 'Copied!' : 'contact@nayepankh.com'}</span>
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
              © 2026 NayePankh Foundation. All rights reserved. NayePankh is a registered NGO empowering youth through skill development, career mentoring, and corporate placements.
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
};

const parseBold = (text) => {
  if (typeof text !== 'string') return text;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} style={{ fontWeight: 700 }}>{part}</strong>;
    }
    return part;
  });
};

const RenderChatContent = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={index} style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, margin: '14px 0 6px 0', color: 'inherit' }}>{parseBold(trimmed.replace('### ', ''))}</h3>);
    } else if (trimmed.startsWith('#### ')) {
      elements.push(<h4 key={index} style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, margin: '10px 0 4px 0', color: 'inherit', opacity: 0.9 }}>{parseBold(trimmed.replace('#### ', ''))}</h4>);
    } else if (trimmed.startsWith('* ')) {
      elements.push(<li key={index} style={{ marginLeft: '16px', marginBottom: '4px', listStyleType: 'disc' }}>{parseBold(trimmed.substring(2))}</li>);
    } else if (trimmed.startsWith('- ')) {
      elements.push(<li key={index} style={{ marginLeft: '16px', marginBottom: '4px', listStyleType: 'circle' }}>{parseBold(trimmed.substring(2))}</li>);
    } else if (trimmed === '') {
      elements.push(<div key={index} style={{ height: '8px' }}></div>);
    } else {
      elements.push(<p key={index} style={{ margin: '0 0 6px 0' }}>{parseBold(line)}</p>);
    }
  });

  return <div>{elements}</div>;
};

export default LandingPage;
