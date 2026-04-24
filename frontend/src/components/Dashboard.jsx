import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import ContentLibrary from './ContentLibrary'
import AdminPanel from './AdminPanel'
import CreateAssignment from './CreateAssignment'
import AssignmentList from './AssignmentList'
import { getUserProfile, ROLES } from '../utils/userRoles'
import './Dashboard.css'

function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [userProfile, setUserProfile] = useState(undefined)
  const [loading, setLoading] = useState(true)
  const [assignmentRefreshKey, setAssignmentRefreshKey] = useState(0)

  useEffect(() => {
    if (user) {
      loadUserProfile()
    } else {
      setUserProfile(null)
      setLoading(false)
    }
  }, [user])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      console.log('=== DASHBOARD: Loading user profile ===')
      console.log('User UID:', user.uid)
      const profile = await getUserProfile(user.uid)
      console.log('Profile loaded:', profile)
      console.log('Profile role:', profile?.role)
      setUserProfile(profile)
      console.log('=== DASHBOARD: Profile loaded successfully ===')
    } catch (error) {
      console.error('Error loading user profile:', error)
      console.error('Error details:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isAdmin = userProfile?.role === ROLES.ADMIN
  const isTeacher = userProfile?.role === ROLES.TEACHER
  const hasAdminAccess = isAdmin || isTeacher

  const profileLoading = loading && userProfile === undefined

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Ultimate Tutor</h1>
          <p className="welcome">
            Welcome, {user?.displayName || user?.email} 
            {isAdmin && <span className="admin-badge">(Admin)</span>}
            {isTeacher && <span className="teacher-badge">(Teacher)</span>}
          </p>
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
        {hasAdminAccess && (
          <button 
            className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            ⚙️ Admin Panel
          </button>
        )}
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
          <ContentLibrary user={user} />
        )}

        {activeTab === 'assignments' && (
          <div className="assignments-tab">
            {(isAdmin || isTeacher) && (
              <CreateAssignment
                user={user}
                onAssignmentCreated={() => setAssignmentRefreshKey(prev => prev + 1)}
              />
            )}
            <AssignmentList user={user} refreshKey={assignmentRefreshKey} />
          </div>
        )}

        {activeTab === 'admin' && hasAdminAccess && (
          <AdminPanel user={user} />
        )}
        {activeTab === 'admin' && profileLoading && (
          <div className="tab-content">
            <h2>Admin</h2>
            <p>Loading permissions...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
