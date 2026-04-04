import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import './Dashboard.css'

function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview')

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Tutoring Platform</h1>
          <p className="welcome">Welcome, {user?.displayName || user?.email}</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`nav-btn ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          📚 Content Library
        </button>
        <button 
          className={`nav-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          ✏️ Assignments
        </button>
        <button 
          className={`nav-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          💬 Messages
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2>Dashboard Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>📖 Lessons Completed</h3>
                <p className="stat-number">5</p>
              </div>
              <div className="stat-card">
                <h3>📝 Assignments</h3>
                <p className="stat-number">3 pending</p>
              </div>
              <div className="stat-card">
                <h3>⭐ Average Grade</h3>
                <p className="stat-number">85%</p>
              </div>
              <div className="stat-card">
                <h3>🎯 Progress</h3>
                <p className="stat-number">60%</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="tab-content">
            <h2>Content Library</h2>
            <p>Browse and access learning materials (coming soon)</p>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="tab-content">
            <h2>Assignments</h2>
            <p>Submit assignments for AI grading (coming soon)</p>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="tab-content">
            <h2>Messages</h2>
            <p>Chat with instructors and classmates (coming soon)</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
