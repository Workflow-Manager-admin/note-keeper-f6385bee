import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

// Backend API base URL (update if different for deployment)
const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

// PUBLIC_INTERFACE
function AuthContextProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Optionally load from localStorage for persistent session
    const saved = localStorage.getItem('note_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email, password) => {
    // API call
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      setUser(res.data.user);
      localStorage.setItem('note_user', JSON.stringify(res.data.user));
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.response?.data?.detail || "Login failed" };
    }
  };

  const register = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, { email, password });
      setUser(res.data.user);
      localStorage.setItem('note_user', JSON.stringify(res.data.user));
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.response?.data?.detail || "Registration failed" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('note_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}
const AuthContext = React.createContext();

function useAuth() {
  return React.useContext(AuthContext);
}

// PUBLIC_INTERFACE
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
}

// PUBLIC_INTERFACE
function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="app-title">📝 Note Keeper</Link>
      </div>
      <div className="nav-right">
        {user && (
          <>
            <span className="nav-user">Logged in as {user.email}</span>
            <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

// PUBLIC_INTERFACE
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const res = await login(email, password);
    if (res.success) {
      navigate("/");
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        <input type="email" placeholder="Email" value={email} required autoFocus 
               onChange={e=>setEmail(e.target.value)}/>
        <input type="password" placeholder="Password" value={password} required
               onChange={e=>setPassword(e.target.value)}/>
        <button className="btn btn-block" type="submit">Login</button>
        <div className="secondary-action">
          <span>Don't have an account?</span>
          <Link to="/register">Register</Link>
        </div>
        {error && <div className="form-error">{error}</div>}
      </form>
    </div>
  );
}

// PUBLIC_INTERFACE
function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const res = await register(email, password);
    if (res.success) {
      navigate("/");
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Register</h2>
        <input type="email" placeholder="Email" value={email} required autoFocus 
               onChange={e=>setEmail(e.target.value)}/>
        <input type="password" placeholder="Password" value={password} required
               onChange={e=>setPassword(e.target.value)}/>
        <button className="btn btn-block" type="submit">Register</button>
        <div className="secondary-action">
          <span>Already have an account?</span>
          <Link to="/login">Login</Link>
        </div>
        {error && <div className="form-error">{error}</div>}
      </form>
    </div>
  );
}

// PUBLIC_INTERFACE
function NotesDashboard() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    // Search filter applied via ?q= if filter set
    try {
      const url = filter
        ? `${API_BASE}/notes?q=${encodeURIComponent(filter)}`
        : `${API_BASE}/notes`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNotes(data.notes || []);
    } catch (e) {
      setNotes([]);
    }
  }, [user, filter]);
  
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSearch = e => {
    setFilter(e.target.value);
  };

  const handleEdit = note => {
    setSelectedNote(note);
    setShowModal(true);
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;
    await axios.delete(`${API_BASE}/notes/${noteId}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    fetchNotes();
  };

  const handleCreate = () => {
    setSelectedNote(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedNote(null);
  };

  const handleModalSave = async (noteData) => {
    if (selectedNote) {
      // Edit
      await axios.put(`${API_BASE}/notes/${selectedNote.id}`, noteData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
    } else {
      // Create
      await axios.post(`${API_BASE}/notes`, noteData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
    }
    setShowModal(false);
    fetchNotes();
  };

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <button className="btn btn-block btn-large" onClick={handleCreate}>+ New Note</button>
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search notes..."
            value={filter}
            onChange={handleSearch}
          />
        </div>
      </aside>
      <section className="dashboard">
        {notes.length === 0 ? (
          <div className="empty-list">No notes found.</div>
        ) : (
          <div className="notes-list">
            {notes.map(note => (
              <div className="note-card" key={note.id}>
                <div className="note-header">
                  <div className="note-title">{note.title}</div>
                  <div className="note-actions">
                    <button onClick={() => handleEdit(note)} className="btn btn-link">Edit</button>
                    <button onClick={() => handleDelete(note.id)} className="btn btn-link btn-danger">Delete</button>
                  </div>
                </div>
                <div className="note-body">{note.content}</div>
                <div className="note-meta">
                  <span>Last updated: {new Date(note.updated_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {showModal && (
        <NoteModal
          note={selectedNote}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

// PUBLIC_INTERFACE
function NoteModal({ note, onClose, onSave }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title, content });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <form onSubmit={handleSubmit}>
          <h3>{note ? "Edit Note" : "Create Note"}</h3>
          <input
            type="text"
            className="modal-input"
            placeholder="Title"
            value={title}
            autoFocus
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={128}
          />
          <textarea
            className="modal-textarea"
            placeholder="Write your note here..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
            required
            maxLength={2000}
          ></textarea>
          <div className="modal-actions">
            <button className="btn btn-primary" type="submit">
              {note ? "Save Changes" : "Create Note"}
            </button>
            <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  // Mode switching for additional modern feel.
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Hotkey for theme toggle (optional)
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key && e.key.toLowerCase() === "j") {
        setTheme(t => (t === "light" ? "dark" : "light"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  
  return (
    <AuthContextProvider>
      <Router>
        <div className="App">
          <Navbar />
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <NotesDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthContextProvider>
  );
}

export default App;

