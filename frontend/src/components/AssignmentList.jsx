import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { getUserProfile, ROLES } from '../utils/userRoles'
import { 
  uploadSubmissionFile, 
  createSubmission, 
  getExistingSubmission,
  getSubmissionsForAssignment,
  updateSubmission,
  aiGradeSubmission
} from '../utils/submissions'
import './AssignmentList.css'

function AssignmentList({ user, refreshKey }) {
  const [userProfile, setUserProfile] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [students, setStudents] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState(null)
  const [submissionFile, setSubmissionFile] = useState(null)
  const [submissionProgress, setSubmissionProgress] = useState(0)
  const [submissionError, setSubmissionError] = useState('')
  const [gradingSubmission, setGradingSubmission] = useState(null)
  const [gradingData, setGradingData] = useState({ grade: '', feedback: '' })
  const [aiGrading, setAiGrading] = useState(false)
  const [aiGradingError, setAiGradingError] = useState('')
  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    if (user) {
      loadAssignments()
    }
  }, [user, refreshKey])

  const loadAssignments = async () => {
    setLoading(true)
    setError('')

    try {
      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)

      const assignmentsRef = collection(db, 'assignments')
      let q
      if (profile?.role === ROLES.ADMIN || profile?.role === ROLES.TEACHER) {
        q = query(assignmentsRef, orderBy('dueDate', 'asc'))
      } else {
        q = query(assignmentsRef, where('studentId', '==', user.uid), orderBy('dueDate', 'asc'))
      }

      const assignmentSnapshot = await getDocs(q)
      const assignmentData = assignmentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setAssignments(assignmentData)

      // Load submissions for all assignments
      const submissionsMap = {}
      for (const assignment of assignmentData) {
        try {
          const assignmentSubmissions = await getSubmissionsForAssignment(assignment.id)
          submissionsMap[assignment.id] = assignmentSubmissions
        } catch (err) {
          console.warn(`Error loading submissions for assignment ${assignment.id}:`, err)
          submissionsMap[assignment.id] = []
        }
      }
      setSubmissions(submissionsMap)

      if (profile?.role === ROLES.ADMIN || profile?.role === ROLES.TEACHER) {
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setStudents(usersData)
      }
    } catch (err) {
      console.error('Error loading assignments:', err)
      setError('Unable to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const getStudentInfo = (studentId) => {
    return students.find(student => student.id === studentId) || { email: studentId, displayName: 'Unknown Student' }
  }

  const getAssignmentSubmission = (assignmentId, studentId) => {
    const assignmentSubmissions = submissions[assignmentId] || []
    return assignmentSubmissions.find(sub => sub.studentId === studentId) || null
  }

  const getSubmissionStatus = (submission) => {
    if (!submission) return { status: 'No Submission', badge: 'no-submission', icon: '❌' }
    if (submission.graded) return { status: '✓ Graded', badge: 'graded', icon: '✔️' }
    return { status: '⏳ Pending Review', badge: 'pending', icon: '⏱️' }
  }

  const getAllSubmissions = () => {
    return Object.values(submissions).flat()
  }

  const handleGradeSubmission = (submission) => {
    const assignment = assignments.find(a => a.id === submission.assignmentId)
    setGradingSubmission({
      ...submission,
      assignmentTitle: assignment?.title || 'Assignment',
      maxPoints: assignment?.maxPoints || 100
    })
    setGradingData({
      grade: submission.grade != null ? submission.grade : '',
      feedback: submission.feedback || ''
    })
  }

  const handleSaveGrade = async () => {
    if (!gradingSubmission) return

    try {
      const gradeValue = parseInt(gradingData.grade)
      const updateData = {
        grade: Number.isNaN(gradeValue) ? 0 : gradeValue,
        feedback: gradingData.feedback,
        graded: true
      }

      await updateSubmission(gradingSubmission.id, updateData)

      // Mirror grade and feedback on the assignment document for student summary
      const assignmentRef = doc(db, 'assignments', gradingSubmission.assignmentId)
      await updateDoc(assignmentRef, {
        grade: updateData.grade,
        feedback: updateData.feedback,
        status: 'graded'
      })

      setGradingSubmission(null)
      setGradingData({ grade: '', feedback: '' })
      setAiGradingError('')
      await loadAssignments()
    } catch (err) {
      console.error('Error saving grade:', err)
      setError('Unable to save grade')
    }
  }

  const handleCancelGrade = () => {
    setGradingSubmission(null)
    setGradingData({ grade: '', feedback: '' })
    setAiGradingError('')
    setAiGrading(false)
  }

  const handleAiGrade = async () => {
    if (!gradingSubmission) return

    const assignment = assignments.find(a => a.id === gradingSubmission.assignmentId)
    if (!assignment) {
      setAiGradingError('Unable to load assignment details for AI grading.')
      return
    }

    setAiGrading(true)
    setAiGradingError('')

    try {
      const result = await aiGradeSubmission(gradingSubmission, assignment)
      setGradingData({
        grade: result.grade ?? gradingData.grade,
        feedback: result.feedback ?? gradingData.feedback
      })

      // Refresh the UI to show the newly AI graded result
      await loadAssignments()
      setGradingSubmission(null)
    } catch (err) {
      console.error('AI grading failed:', err)
      setAiGradingError(err.message || 'AI grading failed. Please try again.')
    } finally {
      setAiGrading(false)
    }
  }

  const handleSubmitAssignment = async (assignmentId) => {
    if (!submissionFile) {
      setSubmissionError('Please select a file to submit')
      return
    }

    setSubmittingAssignmentId(assignmentId)
    setSubmissionError('')
    setSubmissionProgress(0)

    try {
      // Validate file size (max 50MB)
      const maxFileSize = 50 * 1024 * 1024
      if (submissionFile.size > maxFileSize) {
        throw new Error('File size exceeds 50MB limit')
      }

      // Upload file
      setSubmissionProgress(50)
      const fileUrl = await uploadSubmissionFile(submissionFile, assignmentId, user.uid)

      // Create submission record
      setSubmissionProgress(75)
      await createSubmission({
        assignmentId: assignmentId,
        studentId: user.uid,
        studentEmail: user.email,
        studentName: userProfile?.displayName || user.email,
        fileName: submissionFile.name,
        fileUrl: fileUrl,
        fileSize: submissionFile.size
      })

      setSubmissionProgress(100)
      
      // Reload assignments and submissions
      await loadAssignments()
      setSubmissionFile(null)
      setSubmittingAssignmentId(null)
      setSubmissionProgress(0)
    } catch (err) {
      console.error('Error submitting assignment:', err)
      let errorMsg = err.message || 'Failed to submit assignment'
      
      // Provide specific error messages
      if (errorMsg.includes('permission')) {
        errorMsg = 'Permission denied. Please contact your instructor.'
      } else if (errorMsg.includes('quota')) {
        errorMsg = 'Storage quota exceeded. Please try a smaller file.'
      }
      
      setSubmissionError(errorMsg)
      setSubmittingAssignmentId(null)
    }
  }

  const getStudentSubmission = (assignmentId) => {
    const assignmentSubmissions = submissions[assignmentId] || []
    return assignmentSubmissions.find(sub => sub.studentId === user.uid) || null
  }

  const formatDate = (value) => {
    if (!value) return 'No date'
    const date = value.toDate ? value.toDate() : new Date(value)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const groupedAssignments = assignments.reduce((groups, assignment) => {
    const studentId = assignment.studentId || 'unknown'
    if (!groups[studentId]) {
      groups[studentId] = []
    }
    groups[studentId].push(assignment)
    return groups
  }, {})

  const pendingGradingCount = getAllSubmissions().filter(submission => !submission.graded).length

  if (loading) {
    return <div className="assignments-loading">Loading assignments...</div>
  }

  if (error) {
    return <div className="assignments-error">{error}</div>
  }

  return (
    <div className="assignment-list-container">
      <div className="assignment-list-header">
        <h2>Assignments</h2>
        <p className="assignment-list-subtitle">
          {userProfile?.role === ROLES.ADMIN || userProfile?.role === ROLES.TEACHER
            ? 'View every student and their assignments.'
            : 'Review your assignments and due dates.'}
        </p>
      </div>

      {(userProfile?.role === ROLES.ADMIN || userProfile?.role === ROLES.TEACHER) ? (
        <>
          {gradingSubmission && (
            <div className="grading-modal">
              <div className="grading-modal-content">
                <h3>Grade Submission</h3>
                <div className="grading-details">
                  <p><strong>Student:</strong> {gradingSubmission.studentName || gradingSubmission.studentEmail}</p>
                  <p><strong>Assignment:</strong> {gradingSubmission.assignmentTitle || ''}</p>
                  <p><strong>File:</strong> {gradingSubmission.fileName}</p>
                </div>
                <div className="grading-fields">
                  <label>
                    Grade (points):
                    <input
                      type="number"
                      min="0"
                      max={gradingSubmission.maxPoints || 100}
                      value={gradingData.grade}
                      onChange={(e) => setGradingData(prev => ({ ...prev, grade: e.target.value }))}
                    />
                  </label>
                  <label>
                    Feedback:
                    <textarea
                      rows="4"
                      value={gradingData.feedback}
                      onChange={(e) => setGradingData(prev => ({ ...prev, feedback: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="grading-actions">
                  <button className="grade-ai-btn" onClick={handleAiGrade} disabled={aiGrading}>
                    {aiGrading ? 'Running AI grading...' : 'AI Grade Submission'}
                  </button>
                  <button className="grade-save-btn" onClick={handleSaveGrade} disabled={aiGrading}>Save Grade</button>
                  <button className="grade-cancel-btn" onClick={handleCancelGrade} disabled={aiGrading}>Cancel</button>
                </div>
                {aiGradingError && <div className="ai-grading-error">❌ {aiGradingError}</div>}
              </div>
            </div>
          )}

          <div className="teacher-view-tabs">
            <button
              className={`tab-btn ${activeView === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveView('overview')}
            >
              Assignment Overview
            </button>
            <button
              className={`tab-btn ${activeView === 'grading' ? 'active' : ''}`}
              onClick={() => setActiveView('grading')}
            >
              Grading
              {pendingGradingCount > 0 && (
                <span className="tab-badge">{pendingGradingCount}</span>
              )}
            </button>
          </div>

          {activeView === 'overview' ? (
            <div className="assignments-group-list">
              {Object.keys(groupedAssignments).length === 0 ? (
                <div className="no-assignments">No assignments have been created yet.</div>
              ) : (
                Object.entries(groupedAssignments).map(([studentId, studentAssignments]) => {
                  const student = getStudentInfo(studentId)
                  return (
                    <div key={studentId} className="student-assignments-card">
                      <div className="student-card-header">
                        <div>
                          <h3>{student.displayName || student.email}</h3>
                          <p>{student.email}</p>
                        </div>
                        <span className="assignment-count">{studentAssignments.length} assignment{studentAssignments.length !== 1 ? 's' : ''}</span>
                      </div>

                      <div className="student-assignments-table">
                        <div className="table-row header-row">
                          <div>Title</div>
                          <div>Type</div>
                          <div>Due</div>
                          <div>Status</div>
                          <div>Submissions</div>
                          <div>Grade</div>
                          <div>Actions</div>
                        </div>
                        {studentAssignments.map(assignment => {
                          const assignmentSubs = submissions[assignment.id] || []
                          const latestSubmission = assignmentSubs[0] || null
                          return (
                            <div key={assignment.id} className="table-row">
                              <div>{assignment.title}</div>
                              <div>{assignment.assignmentType || 'Other'}</div>
                              <div>{formatDate(assignment.dueDate)}</div>
                              <div>{assignment.status || 'assigned'}</div>
                              <div className="submission-count" title={assignmentSubs.length > 0 ? 'View submissions in Submissions panel' : 'No submissions yet'}>{assignmentSubs.length} submitted</div>
                              <div>{assignment.grade != null ? `${assignment.grade}/${assignment.maxPoints}` : 'Not graded'}</div>
                              <div className="actions">
                                {latestSubmission ? (
                                  <button
                                    className="grade-btn"
                                    onClick={() => handleGradeSubmission({
                                      ...latestSubmission,
                                      assignmentTitle: assignment.title,
                                      maxPoints: assignment.maxPoints,
                                      studentName: student.displayName || student.email
                                    })}
                                  >
                                    ✏️ Grade
                                  </button>
                                ) : (
                                  <span className="no-action">No submission</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="grading-section">
              {getAllSubmissions().length === 0 ? (
                <div className="no-assignments">No submissions available for grading.</div>
              ) : (
                <div className="grading-table">
                  <div className="table-row header-row">
                    <div>Student</div>
                    <div>Assignment</div>
                    <div>File</div>
                    <div>Submitted</div>
                    <div>Status</div>
                    <div>Grade</div>
                    <div>Actions</div>
                  </div>
                  {getAllSubmissions().map(submission => {
                    const assignment = assignments.find(a => a.id === submission.assignmentId)
                    const studentLabel = submission.studentName || submission.studentEmail
                    const status = getSubmissionStatus(submission)
                    return (
                      <div key={submission.id} className="table-row">
                        <div>{studentLabel}</div>
                        <div>{assignment?.title || 'Unknown Assignment'}</div>
                        <div>
                          <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                            {submission.fileName}
                          </a>
                        </div>
                        <div>{formatDate(submission.createdAt)}</div>
                        <div className={`status-badge ${status.badge}`}>{status.icon} {status.status}</div>
                        <div>{submission.graded ? `${submission.grade}/${assignment?.maxPoints || 0}` : '-'}</div>
                        <div className="actions">
                          <button
                            className="grade-btn"
                            onClick={() => handleGradeSubmission({
                              ...submission,
                              assignmentTitle: assignment?.title || '',
                              maxPoints: assignment?.maxPoints || 100,
                            })}
                          >
                            ✏️ Grade
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="student-assignments-list">
          {assignments.length === 0 ? (
            <div className="no-assignments">You have no assignments yet.</div>
          ) : (
            assignments.map(assignment => {
              const studentSubmission = getStudentSubmission(assignment.id)
              return (
                <div key={assignment.id} className="student-assignment-card">
                  <div className="assignment-card-header">
                    <div>
                      <h3>{assignment.title}</h3>
                      <p>{assignment.assignmentType || 'Assignment'}</p>
                    </div>
                    <span className={`status-badge ${studentSubmission ? 'submitted' : assignment.status}`}>
                      {studentSubmission ? '✓ Submitted' : (assignment.status || 'assigned')}
                    </span>
                  </div>
                  <div className="assignment-card-body">
                    <p>{assignment.description || assignment.instructions || 'No description provided.'}</p>
                    <div className="assignment-meta">
                      <span>Due: {formatDate(assignment.dueDate)}</span>
                      <span>Points: {assignment.maxPoints}</span>
                      <span>Grade: {assignment.grade != null ? `${assignment.grade}/${assignment.maxPoints}` : 'Not graded'}</span>
                    </div>

                    {studentSubmission ? (
                      <div className="submission-info">
                        <h4>📤 Your Submission</h4>
                        <div className="submission-detail">
                          <span><strong>File:</strong> {studentSubmission.fileName}</span>
                          <span><strong>Submitted:</strong> {formatDate(studentSubmission.createdAt)}</span>
                          {studentSubmission.graded && (
                            <>
                              <span><strong>Grade:</strong> {studentSubmission.grade}/{assignment.maxPoints}</span>
                              {studentSubmission.feedback && <p className="feedback"><strong>Feedback:</strong> {studentSubmission.feedback}</p>}
                            </>
                          )}
                        </div>
                        <a href={studentSubmission.fileUrl} target="_blank" rel="noopener noreferrer" className="view-submission-btn">
                          📄 View Submitted File
                        </a>
                      </div>
                    ) : (
                      <div className="submission-form">
                        <h4>📝 Submit Assignment</h4>
                        {submittingAssignmentId === assignment.id && (
                          <div className="submission-progress">
                            <div className="progress-bar" style={{ width: `${submissionProgress}%` }}></div>
                            <span>Uploading... {submissionProgress}%</span>
                          </div>
                        )}
                        {submissionError && <div className="submission-error">❌ {submissionError}</div>}
                        <div className="file-input-group">
                          <input
                            type="file"
                            id={`file-${assignment.id}`}
                            onChange={(e) => setSubmissionFile(e.target.files[0])}
                            disabled={submittingAssignmentId === assignment.id}
                            className="file-input"
                          />
                          <label htmlFor={`file-${assignment.id}`} className="file-label">
                            {submissionFile ? submissionFile.name : 'Choose file...'}
                          </label>
                        </div>
                        <button
                          className="submit-btn"
                          onClick={() => handleSubmitAssignment(assignment.id)}
                          disabled={!submissionFile || submittingAssignmentId === assignment.id}
                        >
                          {submittingAssignmentId === assignment.id ? 'Submitting...' : 'Submit Assignment'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default AssignmentList
