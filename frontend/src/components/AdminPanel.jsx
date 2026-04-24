import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { setUserRole, ROLES, getUserProfile } from '../utils/userRoles'
import { deleteSubmission } from '../utils/submissions'
import './AdminPanel.css'

function AdminPanel({ user }) {
  const [users, setUsers] = useState([])
  const [files, setFiles] = useState([])
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('users')
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [gradingSubmission, setGradingSubmission] = useState(null)
  const [gradingData, setGradingData] = useState({ grade: '', feedback: '' })
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    assignmentType: 'homework',
    dueDate: '',
    maxPoints: 100,
    attachmentUrl: '',
    studentId: ''
  })
  const [expandedStudents, setExpandedStudents] = useState(new Set())

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    setLoading(true)
    try {
      console.log('AdminPanel loadData start for user:', user.uid)

      // Get current user role
      const profile = await getUserProfile(user.uid)
      console.log('AdminPanel current profile:', profile)
      setCurrentUserRole(profile?.role)

      // Load users
      console.log('AdminPanel loading users...')
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('AdminPanel loaded users:', usersData.length)
      setUsers(usersData)

      // Load all files
      console.log('AdminPanel loading files...')
      const filesSnapshot = await getDocs(collection(db, 'files'))
      const filesData = filesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('AdminPanel loaded files:', filesData.length)
      setFiles(filesData)

      // Load assignments
      console.log('AdminPanel loading assignments...')
      const assignmentsSnapshot = await getDocs(collection(db, 'assignments'))
      const assignmentsData = assignmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('AdminPanel loaded assignments:', assignmentsData.length)
      setAssignments(assignmentsData)

      // Load submissions
      console.log('AdminPanel loading submissions...')
      const submissionsSnapshot = await getDocs(collection(db, 'submissions'))
      const submissionsData = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('AdminPanel loaded submissions:', submissionsData.length)
      setSubmissions(submissionsData)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = currentUserRole === ROLES.ADMIN
  const isTeacher = currentUserRole === ROLES.TEACHER

  // Define available sections based on role
  const availableSections = (isAdmin || isTeacher) ? ['users', 'assignments', 'submissions', 'files', 'analytics'] : ['users']

  // Set default section based on available sections
  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.includes(activeSection)) {
      setActiveSection(availableSections[0])
    }
  }, [currentUserRole, activeSection, availableSections])

  const handleRoleChange = async (userId, newRole) => {
    try {
      await setUserRole(userId, newRole)
      await loadData() // Refresh data
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Error updating user role')
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This will also delete all their files.`)) {
      return
    }

    try {
      // Delete user's files first
      const userFiles = files.filter(file => file.uploadedBy === userId)
      for (const file of userFiles) {
        await deleteDoc(doc(db, 'files', file.id))
      }

      // Delete user profile
      await deleteDoc(doc(db, 'users', userId))

      await loadData() // Refresh data
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user')
    }
  }

  const handleDeleteFile = async (fileId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }

    try {
      await deleteDoc(doc(db, 'files', fileId))
      await loadData() // Refresh data
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Error deleting file')
    }
  }

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment)
    setEditFormData({
      title: assignment.title || '',
      description: assignment.description || '',
      instructions: assignment.instructions || '',
      assignmentType: assignment.assignmentType || 'homework',
      dueDate: assignment.dueDate ? new Date(assignment.dueDate.toDate ? assignment.dueDate.toDate() : assignment.dueDate).toISOString().split('T')[0] : '',
      maxPoints: assignment.maxPoints || 100,
      attachmentUrl: assignment.attachmentUrl || '',
      studentId: assignment.studentId || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingAssignment(null)
    setEditFormData({
      title: '',
      description: '',
      instructions: '',
      assignmentType: 'homework',
      dueDate: '',
      maxPoints: 100,
      attachmentUrl: '',
      studentId: ''
    })
  }

  const handleSaveAssignment = async () => {
    if (!editingAssignment) return

    try {
      const updateData = {
        title: editFormData.title,
        description: editFormData.description,
        instructions: editFormData.instructions,
        assignmentType: editFormData.assignmentType,
        dueDate: new Date(editFormData.dueDate),
        maxPoints: parseInt(editFormData.maxPoints),
        attachmentUrl: editFormData.attachmentUrl,
        studentId: editFormData.studentId
      }

      await updateDoc(doc(db, 'assignments', editingAssignment.id), updateData)
      setEditingAssignment(null)
      await loadData() // Refresh data
      alert('Assignment updated successfully!')
    } catch (error) {
      console.error('Error updating assignment:', error)
      alert('Error updating assignment')
    }
  }

  const handleDeleteAssignment = async (assignmentId, assignmentTitle) => {
    if (!confirm(`Are you sure you want to delete the assignment "${assignmentTitle}"?`)) {
      return
    }

    try {
      await deleteDoc(doc(db, 'assignments', assignmentId))
      await loadData() // Refresh data
      alert('Assignment deleted successfully!')
    } catch (error) {
      console.error('Error deleting assignment:', error)
      alert('Error deleting assignment')
    }
  }

  const handleReassignAssignment = async (assignmentId, newStudentId) => {
    try {
      await updateDoc(doc(db, 'assignments', assignmentId), {
        studentId: newStudentId
      })
      await loadData() // Refresh data
      alert('Assignment reassigned successfully!')
    } catch (error) {
      console.error('Error reassigning assignment:', error)
      alert('Error reassigning assignment')
    }
  }

  const toggleStudentExpansion = (studentId) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  const handleGradeSubmission = (submission) => {
    setGradingSubmission(submission)
    setGradingData({
      grade: submission.grade || '',
      feedback: submission.feedback || ''
    })
  }

  const handleSaveGrade = async () => {
    if (!gradingSubmission) return

    try {
      const submissionRef = doc(db, 'submissions', gradingSubmission.id)
      await updateDoc(submissionRef, {
        grade: parseInt(gradingData.grade) || 0,
        feedback: gradingData.feedback,
        graded: true,
        updatedAt: new Date()
      })

      // Update the assignment with the grade
      const assignment = assignments.find(a => a.id === gradingSubmission.assignmentId)
      if (assignment) {
        const assignmentRef = doc(db, 'assignments', assignment.id)
        await updateDoc(assignmentRef, {
          grade: parseInt(gradingData.grade) || 0,
          feedback: gradingData.feedback
        })
      }

      setGradingSubmission(null)
      await loadData()
      alert('Submission graded successfully!')
    } catch (error) {
      console.error('Error saving grade:', error)
      alert('Error saving grade')
    }
  }

  const handleDeleteSubmission = async (submissionId, submissionFileName) => {
    if (!confirm(`Delete submission "${submissionFileName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const submission = submissions.find(s => s.id === submissionId)
      await deleteSubmission(submissionId, submission?.fileUrl)
      await loadData()
      alert('Submission deleted successfully!')
    } catch (error) {
      console.error('Error deleting submission:', error)
      alert('Error deleting submission')
    }
  }
  const getAssignmentSubmission = (assignmentId, studentId) => {
    return submissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId) || null
  }

  const getSubmissionStatus = (assignmentId, studentId) => {
    const submission = getAssignmentSubmission(assignmentId, studentId)
    if (!submission) return { status: 'No Submission', badge: 'no-submission', icon: '❌' }
    if (submission.graded) return { status: '✓ Graded', badge: 'graded', icon: '✔️' }
    return { status: '⏳ Pending Review', badge: 'pending', icon: '⏱️' }
  }
  // Group assignments by student
  const assignmentsByStudent = assignments.reduce((groups, assignment) => {
    const studentId = assignment.studentId
    if (!groups[studentId]) {
      groups[studentId] = []
    }
    groups[studentId].push(assignment)
    return groups
  }, {})

  const formatDate = (date) => {
    if (!date) return 'N/A'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return <div className="admin-loading">Loading admin panel...</div>
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>🔧 Administration Panel</h2>
        <div className="admin-stats">
          <div className="stat-item">
            <span className="stat-number">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{users.filter(u => u.role === ROLES.ADMIN).length}</span>
            <span className="stat-label">Admins</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{users.filter(u => u.role === ROLES.TEACHER).length}</span>
            <span className="stat-label">Teachers</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{users.filter(u => u.role === ROLES.STUDENT || !u.role).length}</span>
            <span className="stat-label">Students</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{assignments.length}</span>
            <span className="stat-label">Assignments</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{submissions.length}</span>
            <span className="stat-label">Submissions</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{files.length}</span>
            <span className="stat-label">Total Files</span>
          </div>
        </div>
      </div>

      <div className="admin-navigation">
        {availableSections.includes('users') && (
          <button
            className={`admin-nav-btn ${activeSection === 'users' ? 'active' : ''}`}
            onClick={() => setActiveSection('users')}
          >
            👥 User Management
          </button>
        )}
        {availableSections.includes('assignments') && (
          <button
            className={`admin-nav-btn ${activeSection === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveSection('assignments')}
          >
            📝 Assignment Management
          </button>
        )}
        {availableSections.includes('submissions') && (
          <button
            className={`admin-nav-btn ${activeSection === 'submissions' ? 'active' : ''}`}
            onClick={() => setActiveSection('submissions')}
          >
            📤 Submissions
          </button>
        )}
        {availableSections.includes('files') && (
          <button
            className={`admin-nav-btn ${activeSection === 'files' ? 'active' : ''}`}
            onClick={() => setActiveSection('files')}
          >
            📁 File Management
          </button>
        )}
        {availableSections.includes('analytics') && (
          <button
            className={`admin-nav-btn ${activeSection === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveSection('analytics')}
          >
            📊 Analytics
          </button>
        )}
      </div>

      <div className="admin-content">
        {activeSection === 'users' && (
          <div className="users-section">
            <h3>User Management</h3>
            <div className="users-table">
              <div className="table-header">
                <div>Email</div>
                <div>Display Name</div>
                <div>Role</div>
                <div>Joined</div>
                <div>Actions</div>
              </div>
              {users.map(user => (
                <div key={user.id} className="table-row">
                  <div className="user-email">{user.email}</div>
                  <div>{user.displayName || 'N/A'}</div>
                  <div>
                    <select
                      value={user.role || ROLES.STUDENT}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="role-select"
                    >
                      <option value={ROLES.STUDENT}>Student</option>
                      <option value={ROLES.TEACHER}>Teacher</option>
                      <option value={ROLES.ADMIN}>Admin</option>
                    </select>
                  </div>
                  <div>{formatDate(user.createdAt)}</div>
                  <div className="actions">
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteUser(user.id, user.email)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'submissions' && (
          <div className="submissions-section">
            <h3>📤 Assignment Submissions</h3>
            {gradingSubmission && (
              <div className="grading-modal">
                <div className="grading-modal-content">
                  <h4>Grade Submission</h4>
                  <div className="grading-info">
                    <p><strong>Student:</strong> {gradingSubmission.studentName}</p>
                    <p><strong>File:</strong> {gradingSubmission.fileName}</p>
                    <p><strong>Submitted:</strong> {formatDate(gradingSubmission.createdAt)}</p>
                  </div>
                  <div className="grading-form">
                    <div className="form-group">
                      <label>Grade (points):</label>
                      <input
                        type="number"
                        min="0"
                        max={assignments.find(a => a.id === gradingSubmission.assignmentId)?.maxPoints || 100}
                        value={gradingData.grade}
                        onChange={(e) => setGradingData(prev => ({ ...prev, grade: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Feedback:</label>
                      <textarea
                        value={gradingData.feedback}
                        onChange={(e) => setGradingData(prev => ({ ...prev, feedback: e.target.value }))}
                        rows="4"
                        placeholder="Provide constructive feedback for the student..."
                      />
                    </div>
                    <div className="grading-actions">
                      <button className="grade-btn" onClick={handleSaveGrade}>✅ Save Grade</button>
                      <button className="cancel-btn" onClick={() => setGradingSubmission(null)}>❌ Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="submissions-table">
              {submissions.length === 0 ? (
                <div className="no-submissions">No submissions yet.</div>
              ) : (
                <>
                  <div className="table-header">
                    <div>Student</div>
                    <div>Assignment</div>
                    <div>File</div>
                    <div>Submitted</div>
                    <div>Status</div>
                    <div>Grade</div>
                    <div>Actions</div>
                  </div>
                  {submissions.map(submission => {
                    const student = users.find(u => u.id === submission.studentId)
                    const assignment = assignments.find(a => a.id === submission.assignmentId)
                    return (
                      <div key={submission.id} className="table-row">
                        <div className="student-cell">{student?.displayName || student?.email || submission.studentEmail}</div>
                        <div>{assignment?.title || 'Unknown Assignment'}</div>
                        <div className="file-cell">
                          <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                            📄 {submission.fileName}
                          </a>
                        </div>
                        <div>{formatDate(submission.createdAt)}</div>
                        <div className={`status-badge ${submission.graded ? 'graded' : 'pending'}`}>
                          {submission.graded ? '✓ Graded' : '⏳ Pending'}
                        </div>
                        <div className="grade-cell">
                          {submission.graded ? `${submission.grade}/${assignment?.maxPoints || 100}` : '-'}
                        </div>
                        <div className="actions">
                          <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" className="view-btn">
                            👁️ View
                          </a>
                          <button
                            className="grade-btn"
                            onClick={() => handleGradeSubmission(submission)}
                            title="Grade this submission"
                          >
                            ✏️ Grade
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteSubmission(submission.id, submission.fileName)}
                            title="Delete submission"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {activeSection === 'files' && (
          <div className="files-section">
            <h3>File Management</h3>
            <div className="files-table">
              <div className="table-header">
                <div>Name</div>
                <div>Uploaded By</div>
                <div>Size</div>
                <div>Type</div>
                <div>Uploaded</div>
                <div>Actions</div>
              </div>
              {files.map(file => (
                <div key={file.id} className="table-row">
                  <div className="file-name">
                    {file.isFolder ? `📁 ${file.name}/` : `📄 ${file.name}`}
                  </div>
                  <div>{users.find(u => u.userId === file.uploadedBy)?.email || file.uploadedBy}</div>
                  <div>{file.isFolder ? 'Folder' : formatFileSize(file.size)}</div>
                  <div>{file.isFolder ? 'Folder' : (file.type || 'Unknown')}</div>
                  <div>{formatDate(file.uploadedAt)}</div>
                  <div className="actions">
                    {!file.isFolder && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-btn"
                      >
                        👁️ View
                      </a>
                    )}
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteFile(file.id, file.name)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'assignments' && (
          <div className="assignments-section">
            <h3>Assignment Management</h3>
            {editingAssignment && (
              <div className="edit-assignment-modal">
                <div className="edit-modal-content">
                  <h4>Edit Assignment</h4>
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Title:</label>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Description:</label>
                      <textarea
                        value={editFormData.description}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Instructions:</label>
                      <textarea
                        value={editFormData.instructions}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, instructions: e.target.value }))}
                        rows="3"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Type:</label>
                        <select
                          value={editFormData.assignmentType}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, assignmentType: e.target.value }))}
                        >
                          <option value="homework">Homework</option>
                          <option value="quiz">Quiz</option>
                          <option value="project">Project</option>
                          <option value="exam">Exam</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Due Date:</label>
                        <input
                          type="date"
                          value={editFormData.dueDate}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Max Points:</label>
                        <input
                          type="number"
                          value={editFormData.maxPoints}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, maxPoints: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Attachment URL:</label>
                      <input
                        type="url"
                        value={editFormData.attachmentUrl}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Assigned Student:</label>
                      <select
                        value={editFormData.studentId}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, studentId: e.target.value }))}
                      >
                        {users.filter(u => u.role === ROLES.STUDENT || !u.role).map(student => (
                          <option key={student.id} value={student.id}>
                            {student.email} ({student.displayName || 'No name'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="edit-actions">
                      <button onClick={handleSaveAssignment} className="save-btn">💾 Save</button>
                      <button onClick={handleCancelEdit} className="cancel-btn">❌ Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="assignments-dropdowns">
              {Object.entries(assignmentsByStudent).map(([studentId, studentAssignments]) => {
                const student = users.find(u => u.id === studentId)
                const isExpanded = expandedStudents.has(studentId)
                
                return (
                  <div key={studentId} className="student-dropdown">
                    <div 
                      className="student-header"
                      onClick={() => toggleStudentExpansion(studentId)}
                    >
                      <div className="student-info">
                        <span className="student-name">
                          {student?.email || studentId} ({student?.displayName || 'No name'})
                        </span>
                        <span className="assignment-count">
                          {studentAssignments.length} assignment{studentAssignments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="dropdown-arrow">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="student-assignments">
                        {studentAssignments.map(assignment => {
                          const submission = getAssignmentSubmission(assignment.id, studentId)
                          const submissionStatus = getSubmissionStatus(assignment.id, studentId)
                          return (
                            <div key={assignment.id} className="assignment-item">
                              <div className="assignment-details">
                                <div className="assignment-title">{assignment.title}</div>
                                <div className="assignment-meta">
                                  <span className="assignment-type">{assignment.assignmentType}</span>
                                  <span className="assignment-due">Due: {formatDate(assignment.dueDate)}</span>
                                  <span className={`status-badge ${assignment.status}`}>
                                    {assignment.status}
                                  </span>
                                  <span className={`submission-status-badge ${submissionStatus.badge}`}>
                                    {submissionStatus.icon} {submissionStatus.status}
                                  </span>
                                  <span className="assignment-grade">
                                    {assignment.grade ? `${assignment.grade}/${assignment.maxPoints}` : '-'}
                                  </span>
                                </div>
                              </div>
                              <div className="assignment-actions">
                                {submission && !submission.graded && (
                                  <button
                                    className="grade-btn quick-grade"
                                    onClick={() => handleGradeSubmission(submission)}
                                    title="Grade this submission"
                                  >
                                    📝 Grade
                                  </button>
                                )}
                                <button
                                  className="edit-btn"
                                  onClick={() => handleEditAssignment(assignment)}
                                  title="Edit assignment"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                                  title="Delete assignment"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              
              {Object.keys(assignmentsByStudent).length === 0 && (
                <div className="no-assignments">
                  No assignments found.
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'analytics' && (
          <div className="analytics-section">
            <h3>Analytics</h3>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>📊 Platform Usage</h4>
                <p>Total Users: {users.length}</p>
                <p>Total Files: {files.length}</p>
                <p>Storage Used: {formatFileSize(files.reduce((total, file) => total + (file.size || 0), 0))}</p>
              </div>
              <div className="analytics-card">
                <h4>📁 Content Breakdown</h4>
                <p>Folders: {files.filter(f => f.isFolder).length}</p>
                <p>Files: {files.filter(f => !f.isFolder).length}</p>
                <p>Avg File Size: {formatFileSize(files.filter(f => !f.isFolder).reduce((total, file) => total + (file.size || 0), 0) / Math.max(1, files.filter(f => !f.isFolder).length))}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
