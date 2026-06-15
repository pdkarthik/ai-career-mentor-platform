import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Eye, LogOut, Trash2, Check, RefreshCw, Search, Filter, BookOpen, Users, Compass, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, CheckCircle, Sun, Moon, Globe, Home, Download, LayoutDashboard, Settings, User, X } from 'lucide-react';

const CustomScrollArea = ({ children, style, theme, className, thumbHeight = 100 }) => {
  const contentRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startScrollTopRef = useRef(0);

  const updateThumbPosition = () => {
    if (!contentRef.current || !trackRef.current || !thumbRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    
    if (scrollHeight > clientHeight) {
      trackRef.current.style.opacity = '1';
      trackRef.current.style.pointerEvents = 'auto';
      const maxScrollTop = scrollHeight - clientHeight;
      const scrollFraction = scrollTop / maxScrollTop;
      const maxThumbOffset = clientHeight - thumbHeight;
      const newPos = scrollFraction * maxThumbOffset;
      thumbRef.current.style.transform = `translate3d(0, ${newPos}px, 0)`;
    } else {
      trackRef.current.style.opacity = '0';
      trackRef.current.style.pointerEvents = 'none';
    }
  };

  const handleScroll = () => {
    requestAnimationFrame(updateThumbPosition);
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    
    let observer;
    if (contentRef.current) {
      observer = new MutationObserver(() => {
        handleScroll();
      });
      observer.observe(contentRef.current, { childList: true, subtree: true, characterData: true });
    }
    
    return () => {
      window.removeEventListener('resize', handleScroll);
      if (observer) observer.disconnect();
    };
  }, [children]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startScrollTopRef.current = contentRef.current.scrollTop;
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e) => {
      if (!contentRef.current) return;
      const { scrollHeight, clientHeight } = contentRef.current;
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbOffset = clientHeight - thumbHeight;
      
      const deltaY = e.clientY - startYRef.current;
      const deltaScroll = (deltaY / maxThumbOffset) * maxScrollTop;
      
      contentRef.current.scrollTop = Math.min(maxScrollTop, Math.max(0, startScrollTopRef.current + deltaScroll));
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, thumbHeight]);

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, ...style }}>
      <div 
        ref={contentRef}
        onScroll={handleScroll}
        className="hide-native-scrollbar"
        style={{
          flex: 1,
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '12px',
          scrollBehavior: 'auto',
          transform: 'translateZ(0)',
          willChange: 'scroll-position'
        }}
      >
        {children}
      </div>
      
      <div 
        ref={trackRef}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '8px',
          background: 'transparent',
          zIndex: 10,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.2s'
        }}
      >
        <div 
          ref={thumbRef}
          onPointerDown={handlePointerDown}
          style={{
            position: 'absolute',
            top: 0,
            right: '2px',
            width: '6px',
            height: `${thumbHeight}px`,
            background: isDragging 
              ? (theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)') 
              : (theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
            borderRadius: '4px',
            cursor: 'grab',
            transition: isDragging ? 'none' : 'background 0.2s ease',
            willChange: 'transform'
          }}
        />
      </div>
    </div>
  );
};

const AdminPortal = ({ onToggleLanding, apiBaseUrl, theme, onToggleTheme }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Data State
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Pagination & Modal Tree States
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [activeTreeSelection, setActiveTreeSelection] = useState('chat');

  // Reset page number on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset active tree node on student selection change
  useEffect(() => {
    if (selectedSubmission) {
      setActiveTreeSelection('chat');
    }
  }, [selectedSubmission]);

  // Load token on startup
  useEffect(() => {
    const token = localStorage.getItem('nayepankh_admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchSubmissions(token);
    }
  }, []);

  // Fetch Submissions Helper
  const fetchSubmissions = async (tokenOverride) => {
    const token = tokenOverride || localStorage.getItem('nayepankh_admin_token');
    if (!token) return;

    setIsLoading(true);
    setFetchError('');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/submissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmissions(data.data);
      } else {
        setFetchError(data.error || 'Failed to fetch data');
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
      }
    } catch (err) {
      setFetchError('Error connecting to backend database.');
    } finally {
      setIsLoading(false);
    }
  };

  // Login handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginCreds.username || !loginCreds.password) {
      setLoginError('Please fill out all credentials.');
      return;
    }

    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await fetch(`${apiBaseUrl}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginCreds)
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem('nayepankh_admin_token', data.token);
        setIsAuthenticated(true);
        setLoginCreds({ username: '', password: '' });
        fetchSubmissions(data.token);
      } else {
        setLoginError(data.error || 'Authentication credentials rejected.');
      }
    } catch (err) {
      setLoginError('Could not communicate with backend server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nayepankh_admin_token');
    setIsAuthenticated(false);
    setSubmissions([]);
    setSelectedSubmission(null);
    onToggleLanding();
  };

  // CRUD: Update Submission Status (with Optimistic Updates)
  const handleStatusUpdate = async (id, newStatus) => {
    // 1. Save original status for rollback if the network or backend request fails
    const originalSubmission = submissions.find(s => s._id === id);
    const originalStatus = originalSubmission ? originalSubmission.status : 'Pending';

    // 2. Perform Optimistic Update (Update UI instantly)
    setSubmissions(prev => prev.map(s => s._id === id ? { ...s, status: newStatus } : s));
    if (selectedSubmission && selectedSubmission._id === id) {
      setSelectedSubmission(prev => ({ ...prev, status: newStatus }));
    }

    const token = localStorage.getItem('nayepankh_admin_token');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/submissions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      
      // If the backend fails, rollback UI state
      if (!response.ok || !data.success) {
        setSubmissions(prev => prev.map(s => s._id === id ? { ...s, status: originalStatus } : s));
        if (selectedSubmission && selectedSubmission._id === id) {
          setSelectedSubmission(prev => ({ ...prev, status: originalStatus }));
        }
        alert(data.error || 'Failed to update application status.');
      }
    } catch (err) {
      // If a network error occurs, rollback UI state
      setSubmissions(prev => prev.map(s => s._id === id ? { ...s, status: originalStatus } : s));
      if (selectedSubmission && selectedSubmission._id === id) {
        setSelectedSubmission(prev => ({ ...prev, status: originalStatus }));
      }
      alert('Network error updating status.');
    }
  };

  // CRUD: Delete Submission
  const handleDeleteSubmission = async (id) => {
    if (!window.confirm('Are you sure you want to delete this applicant sheet permanently? This cannot be undone.')) {
      return;
    }

    const token = localStorage.getItem('nayepankh_admin_token');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmissions(prev => prev.filter(s => s._id !== id));
        if (selectedSubmission && selectedSubmission._id === id) {
          setSelectedSubmission(null);
        }
      } else {
        alert(data.error || 'Failed to delete record.');
      }
    } catch (err) {
      alert('Network error deleting record.');
    }
  };

  const handleRunAnalysis = async (id) => {
    setIsAnalyzing(true);
    const token = localStorage.getItem('nayepankh_admin_token');
    try {
      const response = await fetch(`${apiBaseUrl}/mentor/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ submissionId: id })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmissions(prev => prev.map(s => s._id === id ? data.data : s));
        setSelectedSubmission(data.data);
      } else {
        alert(data.error || 'Failed to generate AI analysis.');
      }
    } catch (err) {
      alert('Network error requesting AI analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Metrics Calculations
  const totalCount = submissions.length;
  const pendingCount = submissions.filter(s => s.status === 'Pending').length;
  const reviewedCount = submissions.filter(s => s.status === 'Reviewed' || s.status === 'Accepted').length;

  const roleStats = {
    Scholar: submissions.filter(s => s.role === 'Scholar').length,
    Mentor: submissions.filter(s => s.role === 'Mentor').length,
    Sponsor: submissions.filter(s => s.role === 'Sponsor').length
  };

  // Chart Max Helper
  const maxRoleCount = Math.max(roleStats.Scholar, roleStats.Mentor, roleStats.Sponsor, 1);

  // Filters logic
  const filteredSubmissions = submissions.filter(sub => {
    return sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           sub.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredSubmissions.length / rowsPerPage) || 1;
  const safeCurrentPage = currentPage > totalPages ? 1 : currentPage;
  const currentRows = filteredSubmissions.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

  const renderRightColumn = () => {
    if (!selectedSubmission) return null;
    switch (activeTreeSelection) {
      case 'profile':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Student Profile Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</span>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0 0' }}>{selectedSubmission.name}</p>
              </div>
              <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</span>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0 0' }}>{selectedSubmission.email}</p>
              </div>
              <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Number</span>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0 0' }}>{selectedSubmission.phone || 'N/A'}</p>
              </div>
              <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Education details</span>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0 0' }}>{selectedSubmission.education || 'N/A'}</p>
              </div>
            </div>

            {(selectedSubmission.linkedin || selectedSubmission.github) && (
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Professional Profiles</span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {selectedSubmission.linkedin && (
                    <a href={selectedSubmission.linkedin.startsWith('http') ? selectedSubmission.linkedin : `https://${selectedSubmission.linkedin}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>LinkedIn / Portfolio</a>
                  )}
                  {selectedSubmission.github && (
                    <a href={selectedSubmission.github.startsWith('http') ? selectedSubmission.github : `https://${selectedSubmission.github}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>GitHub</a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case 'projects':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Projects & Career Background</h4>
            
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Career Role</span>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0 0' }}>{selectedSubmission.targetRole || 'General Scholar'}</p>
            </div>

            <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Technical Skills</span>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600, margin: '4px 0 0 0' }}>{selectedSubmission.skills || 'N/A'}</p>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Experience Summary & Project Details</span>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: '8px 0 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {selectedSubmission.experience || selectedSubmission.message}
              </p>
            </div>
          </div>
        );
      case 'roadmap':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '1.1rem' }}>💬</span>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Session: Web Dev Roadmap (Active)</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--primary)', color: '#fff', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', boxShadow: '0 4px 10px rgba(105, 92, 254, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>Hi, I want to prepare for **{selectedSubmission.targetRole || 'Web Developer'}** career role. Can you help review my skills and map out a roadmap?</p>
              </div>

              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '16px 16px 16px 4px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>🤖 AI Career Mentor</p>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Hello {selectedSubmission.name}! Based on your profile, I see that you have listed technical skills: **{selectedSubmission.skills || 'not specified'}** with an education background in **{selectedSubmission.education || 'not specified'}**.</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Let's review the week-by-week curriculum to bridge your skill gaps.</p>
              </div>

              <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--primary)', color: '#fff', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', boxShadow: '0 4px 10px rgba(105, 92, 254, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>What does the detailed weekly roadmap look like?</p>
              </div>

              <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', width: '100%' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>🤖 AI Career Mentor</p>
                {isAnalyzing ? (
                  <div className="skeleton-wrapper" style={{ padding: '10px 0' }}>
                    <div className="animate-spin" style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', marginBottom: '8px' }}></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-text short"></div>
                  </div>
                ) : selectedSubmission?.analysis?.roadmap ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', overflowX: 'auto' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>Here is your customized training roadmap:</p>
                    <div className="status-timeline" style={{ margin: '10px 0 10px 10px' }}>
                      {selectedSubmission?.analysis?.roadmap?.map((item, idx) => (
                        <div key={idx} className="timeline-item">
                          <div className="timeline-circle">{item?.week}</div>
                          <div className="timeline-content">
                            <div className="timeline-week">Week {item?.week}</div>
                            <div className="timeline-focus">{item?.focus}</div>
                            <ul className="timeline-tasks">
                              {item?.tasks?.map((task, tIdx) => (
                                <li key={tIdx} className="timeline-task-item">
                                  <span className="timeline-task-bullet">•</span>
                                  <span>{task}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>No active roadmap has been generated for this student yet.</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.95rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Please trigger the AI mentor assessment using the actions panel below.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'python_roadmap':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '1.1rem' }}>💬</span>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Session: Python Data Science (June 12)</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--primary)', color: '#fff', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', boxShadow: '0 4px 10px rgba(105, 92, 254, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>I also want to learn Python for Data Science. Where should I start?</p>
              </div>

              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '16px 16px 16px 4px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>🤖 AI Career Mentor</p>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', width: '100%', overflowX: 'auto' }}>
                  <MarkdownText text={`For Python Data Science, focus on:

### Phase 1: Foundations
* **Python Basics**: Variables, lists, loops, and custom functions.
* **NumPy**: Array math and calculations.

### Phase 2: Data Mining
* **Pandas**: Series and DataFrames for data preparation and cleaning.
* **Visualization**: Matplotlib and Seaborn graphs.`} />
                </div>
              </div>

              <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--primary)', color: '#fff', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', boxShadow: '0 4px 10px rgba(105, 92, 254, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>Thanks! That's very helpful.</p>
              </div>
            </div>
          </div>
        );
      case 'gaps':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '1.1rem' }}>📊</span>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Session: Gap Analysis Report</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', width: '100%' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>🤖 AI Career Mentor</p>
                {isAnalyzing ? (
                  <div className="skeleton-wrapper" style={{ padding: '10px 0' }}>
                    <div className="animate-spin" style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', marginBottom: '8px' }}></div>
                    <div className="skeleton skeleton-chart"></div>
                  </div>
                ) : selectedSubmission?.analysis?.skillGaps ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', overflowX: 'auto' }}>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Based on your target role as **{selectedSubmission.targetRole || 'Scholar'}**, here is your custom skill gaps evaluation:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        {selectedSubmission.analysis.skillGaps.map((gap, idx) => (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{gap?.skill}</span>
                              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{gap?.percentage}% Gap</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${gap?.percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedSubmission.analysis.roadmap && selectedSubmission.analysis.roadmap.length > 0 && (
                        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <h5 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Recommended Weekly Roadmap</h5>
                          {selectedSubmission.analysis.roadmap.map((weekObj, idx) => (
                            <div key={idx} style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Week {weekObj.week}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{weekObj.focus}</span>
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {weekObj.tasks.map((task, tIdx) => (
                                  <li key={tIdx}>{task}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Analysis Pending...</p>
                      <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.5' }}>The AI is still gathering data from the chat session. It will automatically generate the Gap Analysis and Roadmap after a few interactions. Please chat more to see the results.</p>
                    </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}
    >
      {/* Dynamic Header */}
      <header className="admin-header glass-panel">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              background:
                "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
              padding: "8px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={20} color="#fff" />
          </div>
          <span className="admin-header-title">
            NAYEPANKH{" "}
            <span className="admin-header-title-highlight">
              AI ADMIN CONTROL
            </span>
          </span>
        </div>

        <div className="admin-header-actions">
          <button
            onClick={onToggleLanding}
            className="btn btn-outline admin-header-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Home size={16} />
            <span>Home</span>
          </button>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="btn btn-primary admin-header-btn btn-logout"
            >
              <LogOut size={16} />{" "}
              <span className="hide-on-mobile">Log Out</span>
            </button>
          )}
          <button
            onClick={onToggleTheme}
            className="theme-toggle-btn"
            title={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
            aria-label="Toggle theme"
          >
            <span className="theme-toggle-icon">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </span>
          </button>
        </div>
      </header>

      {/* Primary Area */}
      <main
        style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", flex: 1 }}
      >
        {!isAuthenticated ? (
          /* Admin Login Screen */
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "60px 0",
            }}
          >
            <div
              className="glass-panel"
              style={{
                padding: "40px",
                width: "100%",
                maxWidth: "400px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "4px",
                  background:
                    "linear-gradient(90deg, var(--secondary), var(--primary))",
                }}
              ></div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "30px",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(105, 92, 254, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)",
                    marginBottom: "12px",
                  }}
                >
                  <Lock size={26} />
                </div>
                <h3
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Secure Admin Access
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    marginTop: "4px",
                  }}
                >
                  Please authenticate using admin key credentials.
                </p>
              </div>

              {loginError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    padding: "12px",
                    borderRadius: "8px",
                    color: "var(--error)",
                    fontSize: "0.85rem",
                    marginBottom: "20px",
                    textAlign: "center",
                  }}
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    value={loginCreds.username}
                    onChange={(e) =>
                      setLoginCreds((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className="form-input"
                    style={{ paddingLeft: "16px" }}
                    placeholder="Username (default: admin)"
                    disabled={isLoggingIn}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    value={loginCreds.password}
                    onChange={(e) =>
                      setLoginCreds((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="form-input"
                    style={{ paddingLeft: "16px" }}
                    placeholder="Password (default: admin123)"
                    disabled={isLoggingIn}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="btn btn-view-chat"
                  style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: "1rem",
                    marginTop: "10px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isLoggingIn ? (
                    <>
                      <span
                        className="animate-spin"
                        style={{
                          display: "inline-block",
                          width: "16px",
                          height: "16px",
                          border: "2px solid rgba(7, 38, 53, 0.2)",
                          borderTopColor: "#072635",
                          borderRadius: "50%",
                        }}
                      ></span>
                      Verifying...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : isLoading && submissions.length === 0 ? (
          /* Centralized Dashboard Loader */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "380px",
              width: "100%",
              gap: "20px",
            }}
          >
            <div
              className="animate-spin"
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid rgba(255, 255, 255, 0.1)",
                borderTopColor: "var(--primary)",
                borderRadius: "50%",
              }}
            ></div>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                color: "var(--text-secondary)",
              }}
            >
              Syncing secure executive dashboard data...
            </p>
          </div>
        ) : (
          /* Admin Main Dashboard */
          <div>
            {/* Entries Grid area - Spacious Full-Screen Data Table */}
            <div
              className="glass-panel"
              style={{
                padding: "30px",
                minHeight: "680px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    Applicant Management Panel
                  </h3>
                  {isLoading && submissions.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(30, 144, 255, 0.1)",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        border: "1px solid rgba(30, 144, 255, 0.2)",
                      }}
                    >
                      <span
                        className="animate-spin"
                        style={{
                          display: "inline-block",
                          width: "12px",
                          height: "12px",
                          border: "1.5px solid rgba(255,255,255,0.1)",
                          borderTopColor: "var(--primary)",
                          borderRadius: "50%",
                        }}
                      ></span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--primary)",
                          fontWeight: 600,
                        }}
                      >
                        Syncing...
                      </span>
                    </div>
                  )}
                </div>

                {/* Search */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    flex: 1,
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    className="input-container"
                    style={{ maxWidth: "320px", width: "100%" }}
                  >
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Name or email..."
                      className="form-input"
                      style={{
                        padding: "8px 12px 8px 36px",
                        fontSize: "0.9rem",
                        borderRadius: "8px",
                      }}
                    />
                    <Search
                      size={14}
                      style={{ left: "12px" }}
                      className="input-icon"
                    />
                  </div>
                </div>
              </div>

              {fetchError ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--error)",
                  }}
                >
                  <p>{fetchError}</p>
                </div>
              ) : (
                /* Submissions Table / Flexible Card Display */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ overflowX: "auto", flex: 1 }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          <th style={{ padding: "16px", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem" }}>NAME</th>
                          <th style={{ padding: "16px", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem" }}>EMAIL</th>
                          <th style={{ padding: "16px", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem" }}>SUBMITTED AT</th>
                          <th style={{ padding: "16px", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem", textAlign: "right" }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading && submissions.length === 0 ? (
                          [...Array(5)].map((_, idx) => (
                            <tr key={`skel-${idx}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                              <td style={{ padding: "16px" }}><div className="animate-pulse" style={{ height: '16px', background: 'var(--border-color)', borderRadius: '4px', width: '120px' }}></div></td>
                              <td style={{ padding: "16px" }}><div className="animate-pulse" style={{ height: '16px', background: 'var(--border-color)', borderRadius: '4px', width: '180px' }}></div></td>
                              <td style={{ padding: "16px" }}><div className="animate-pulse" style={{ height: '16px', background: 'var(--border-color)', borderRadius: '4px', width: '100px' }}></div></td>
                              <td style={{ padding: "16px", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                                  <div className="animate-pulse" style={{ height: '32px', background: 'var(--border-color)', borderRadius: '16px', width: '140px' }}></div>
                                  <div className="animate-pulse" style={{ height: '32px', background: 'var(--border-color)', borderRadius: '8px', width: '60px' }}></div>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : filteredSubmissions.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                              No applicant records found.
                            </td>
                          </tr>
                        ) : (
                          currentRows.map((sub) => (
                            <tr
                              key={sub._id}
                              style={{
                                borderBottom: "1px solid rgba(255,255,255,0.03)",
                                transition: "var(--transition-smooth)",
                              }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(255,255,255,0.01)")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <td
                              style={{
                                padding: "16px",
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {sub.name}
                            </td>
                            <td
                              style={{
                                padding: "16px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {sub.email}
                            </td>
                            <td
                              style={{
                                padding: "16px",
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                              }}
                            >
                              {new Date(sub.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </td>
                            <td style={{ padding: "16px", textAlign: "right" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  onClick={() => setSelectedSubmission(sub)}
                                  className="btn btn-view-chat"
                                  title="View Chat History"
                                >
                                  <Eye size={14} color="rgb(0, 107, 194)" />
                                  <span>View Chat History</span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteSubmission(sub._id)
                                  }
                                  className="btn btn-outline"
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: "0.8rem",
                                    borderRadius: "8px",
                                    color: "var(--error)",
                                    borderColor: "rgba(239,68,68,0.1)",
                                  }}
                                  title="Delete entry"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div
                    className="pagination-controls"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "24px",
                      paddingTop: "16px",
                      borderTop: "1px solid var(--border-color)",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Showing{" "}
                      {filteredSubmissions.length > 0
                        ? (safeCurrentPage - 1) * rowsPerPage + 1
                        : 0}{" "}
                      to{" "}
                      {Math.min(
                        safeCurrentPage * rowsPerPage,
                        filteredSubmissions.length,
                      )}{" "}
                      of {filteredSubmissions.length} entries
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={safeCurrentPage === 1}
                        className="btn btn-outline"
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          cursor:
                            safeCurrentPage === 1 ? "not-allowed" : "pointer",
                          opacity: safeCurrentPage === 1 ? 0.5 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title="First Page"
                      >
                        <ChevronsLeft size={18} />
                      </button>

                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={safeCurrentPage === 1}
                        className="btn btn-outline"
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          cursor:
                            safeCurrentPage === 1 ? "not-allowed" : "pointer",
                          opacity: safeCurrentPage === 1 ? 0.5 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title="Previous Page"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => {
                          const isActive = pageNum === safeCurrentPage;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className="btn"
                              style={{
                                padding: "6px 12px",
                                fontSize: "0.85rem",
                                borderRadius: "6px",
                                cursor: "pointer",
                                background: isActive
                                  ? "rgb(0, 139, 220)"
                                  : "transparent",
                                color: isActive
                                  ? "#fff"
                                  : "var(--text-primary)",
                                border: isActive
                                  ? "none"
                                  : "1px solid var(--border-color)",
                                boxShadow: "none",
                                fontWeight: isActive ? 700 : 500,
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}

                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={safeCurrentPage === totalPages}
                        className="btn btn-outline"
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          cursor:
                            safeCurrentPage === totalPages
                              ? "not-allowed"
                              : "pointer",
                          opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title="Next Page"
                      >
                        <ChevronRight size={18} />
                      </button>

                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safeCurrentPage === totalPages}
                        className="btn btn-outline"
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          cursor:
                            safeCurrentPage === totalPages
                              ? "not-allowed"
                              : "pointer",
                          opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title="Last Page"
                      >
                        <ChevronsRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal Overlay popup */}
      {selectedSubmission && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(10, 6, 20, 0.75)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 150,
            animation: "fadeIn 0.25s ease-out",
            padding: "20px",
          }}
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1100px",
              height: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: "24px",
              background: theme === 'dark' ? '#1e1b29' : '#ffffff',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)",
                background: theme === 'dark' ? '#1e1b29' : '#ffffff',
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--success)" }}></div>
                <h3 style={{ fontSize: "1.25rem", margin: 0, color: "var(--text-primary)" }}>Student Session: {selectedSubmission.name}</h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="btn btn-outline"
                style={{ padding: "6px 12px", borderRadius: "8px", minWidth: "40px" }}
              >✕</button>
            </div>

            {/* Modal Body */}
            <div className="admin-modal-body" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Left Column: Navigation & Profile */}
              <div className="admin-modal-sidebar" style={{ width: "320px", borderRight: "1px solid var(--border-color)", background: theme === 'dark' ? '#1e1b29' : '#ffffff', overflowY: 'auto' }}>
                <div style={{ display: "flex", flexDirection: "column", padding: "24px", gap: "20px" }}>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['details', 'chat', 'gaps'].map(id => (
                      <li key={id} className={id === 'details' ? 'mobile-only-btn' : ''}>
                        <button onClick={() => setActiveTreeSelection(id)} className={`btn ${activeTreeSelection === id ? '' : 'btn-outline'}`} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
                          {id === 'details' && '👤 Candidate Details'}
                          {id === 'chat' && '💬 Live Chat History'}
                          {id === 'gaps' && '📊 Gap Analysis'}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="desktop-only-details" style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", marginTop: "10px", marginBottom: "12px" }}>Candidate Details</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>FULL NAME</span><span style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 600 }}>{selectedSubmission.name}</span></div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>EMAIL ADDRESS</span><span style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 600, wordBreak: "break-all" }}>{selectedSubmission.email}</span></div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>PHONE NUMBER</span><span style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 600 }}>{selectedSubmission.phone || "N/A"}</span></div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TARGET ROLE</span><span style={{ fontSize: "0.95rem", color: "var(--primary)", fontWeight: 700 }}>{selectedSubmission.targetRole || "Scholar"}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Main Content */}
              <div className="admin-modal-chat" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(0, 0, 0, 0.02)" }}>
                <CustomScrollArea key={activeTreeSelection} theme={theme} style={{ flex: 1, padding: "30px", gap: "16px" }}>
                  {activeTreeSelection === 'details' ? (
                    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <h2 style={{ color: "var(--text-primary)", marginTop: 0 }}>Candidate Details</h2>
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: theme === 'dark' ? '#1e1b29' : '#ffffff', padding: "24px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>FULL NAME</span><span style={{ fontSize: "1.1rem", color: "var(--text-primary)", fontWeight: 600 }}>{selectedSubmission.name}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>EMAIL ADDRESS</span><span style={{ fontSize: "1.1rem", color: "var(--text-primary)", fontWeight: 600, wordBreak: "break-all" }}>{selectedSubmission.email}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>PHONE NUMBER</span><span style={{ fontSize: "1.1rem", color: "var(--text-primary)", fontWeight: 600 }}>{selectedSubmission.phone || "N/A"}</span></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>TARGET ROLE</span><span style={{ fontSize: "1.1rem", color: "var(--primary)", fontWeight: 700 }}>{selectedSubmission.targetRole || "Scholar"}</span></div>
                      </div>
                    </div>
                  ) : activeTreeSelection === 'chat' ? (
                    selectedSubmission.chatHistory && selectedSubmission.chatHistory.length > 0 ? (
                      selectedSubmission.chatHistory.map((msg, index) => (
                        <div key={index} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", width: "100%", marginBottom: "16px" }}>
                          <div style={{ maxWidth: "85%", padding: "12px 16px", borderRadius: "16px", fontSize: "0.9rem", lineHeight: "1.5", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", wordBreak: "break-word", overflowWrap: "anywhere", background: msg.role === "user" ? (theme === 'dark' ? '#005c4b' : '#d9fdd3') : theme === 'dark' ? '#2a2636' : '#ffffff', color: msg.role === "user" ? (theme === 'dark' ? '#e9edef' : '#111b21') : "var(--text-primary)" }}>
                            <MarkdownText text={msg.content} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                        No chat history recorded for this user.
                      </div>
                    )
                  ) : (
                    renderRightColumn()
                  )}
                </CustomScrollArea>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const parseBold = (text) => {
  if (typeof text !== 'string') return text;
  
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{part}</strong>;
    }
    return part;
  });
};

const MarkdownText = ({ text }) => {
  if (!text) return null;

  // Handle literal stringified newlines that the backend might return
  const formattedText = typeof text === 'string' ? text.replace(/\\n/g, '\n') : text;
  const lines = formattedText.split('\n');
  const renderedElements = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={`list-${key}`} style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'disc' }}>
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('###')) {
      flushList(index);
      const headerText = trimmedLine.replace(/^###\s*/, '');
      renderedElements.push(
        <h4 key={index} style={{ fontSize: '1.05rem', margin: '14px 0 8px 0', color: 'var(--text-primary)', fontWeight: 600 }}>
          {parseBold(headerText)}
        </h4>
      );
    } else if (trimmedLine.startsWith('##')) {
      flushList(index);
      const headerText = trimmedLine.replace(/^##\s*/, '');
      renderedElements.push(
        <h3 key={index} style={{ fontSize: '1.25rem', margin: '16px 0 10px 0', color: 'var(--text-primary)', fontWeight: 700 }}>
          {parseBold(headerText)}
        </h3>
      );
    } else if (trimmedLine.startsWith('#')) {
      flushList(index);
      const headerText = trimmedLine.replace(/^#\s*/, '');
      renderedElements.push(
        <h2 key={index} style={{ fontSize: '1.4rem', margin: '18px 0 12px 0', color: 'var(--text-primary)', fontWeight: 700 }}>
          {parseBold(headerText)}
        </h2>
      );
    } else if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
      const bulletText = trimmedLine.replace(/^[*+-]\s*/, '');
      currentList.push(
        <li key={index} style={{ margin: '4px 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          {parseBold(bulletText)}
        </li>
      );
    } else if (trimmedLine === '') {
      flushList(index);
      renderedElements.push(<div key={index} style={{ height: '8px' }} />);
    } else {
      flushList(index);
      renderedElements.push(
        <p key={index} style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          {parseBold(line)}
        </p>
      );
    }
  });

  flushList(lines.length);

  return <div style={{ wordBreak: 'break-word' }}>{renderedElements}</div>;
};

export default AdminPortal;
