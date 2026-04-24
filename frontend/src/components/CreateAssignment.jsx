import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { ROLES, getUserProfile } from '../utils/userRoles'
import './CreateAssignment.css'

function CreateAssignment({ user, onAssignmentCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignmentType: 'homework',
    selectedStudents: [],
    instructions: '',
    maxPoints: 100,
    attachmentUrl: ''
  })

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Check user role
      const profile = await getUserProfile(user.uid)
      setUserRole(profile?.role)

      // Load students
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const studentsData = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(u => u.role === ROLES.STUDENT || !u.role) // Include students and users without defined role
      
      setStudents(studentsData)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleStudentToggle = (studentId) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter(id => id !== studentId)
        : [...prev.selectedStudents, studentId]
    }))
  }

  const handleSelectAllStudents = () => {
    if (formData.selectedStudents.length === students.length) {
      setFormData(prev => ({
        ...prev,
        selectedStudents: []
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        selectedStudents: students.map(s => s.id)
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.title.trim()) {
      setError('Assignment title is required')
      return
    }

    if (!formData.dueDate) {
      setError('Due date is required')
      return
    }

    if (formData.selectedStudents.length === 0) {
      setError('Please select at least one student')
      return
    }

    setSubmitting(true)

    try {
      // Create assignment document for each selected student
      const assignmentPromises = formData.selectedStudents.map(studentId => {
        return addDoc(collection(db, 'assignments'), {
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          assignmentType: formData.assignmentType,
          dueDate: new Date(formData.dueDate),
          maxPoints: parseInt(formData.maxPoints),
          attachmentUrl: formData.attachmentUrl,
          studentId: studentId,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          status: 'assigned',
          submitted: false,
          grade: null,
          feedback: ''
        })
      })

      await Promise.all(assignmentPromises)

      setSuccess(`Assignment created and assigned to ${formData.selectedStudents.length} student(s)!`)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        assignmentType: 'homework',
        selectedStudents: [],
        instructions: '',
        maxPoints: 100,
        attachmentUrl: ''
      })

      // Call callback if provided
      if (onAssignmentCreated) {
        onAssignmentCreated()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error creating assignment:', error)
      setError('Failed to create assignment: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Only admins and teachers can create assignments
  if (userRole && userRole !== ROLES.ADMIN && userRole !== ROLES.TEACHER) {
    return (
      <div className="create-assignment-container">
        <div className="permission-denied">
          <p>❌ You don't have permission to create assignments</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="create-assignment-container">
      <div className="create-assignment-form-wrapper">
        <h2>📝 Create New Assignment</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="assignment-form">
          {/* Assignment Title */}
          <div className="form-group">
            <label htmlFor="title">Assignment Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Chapter 5 Homework"
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description of the assignment"
              rows="3"
            />
          </div>

          {/* Instructions */}
          <div className="form-group">
            <label htmlFor="instructions">Instructions</label>
            <textarea
              id="instructions"
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              placeholder="Detailed instructions for completing the assignment"
              rows="4"
            />
          </div>

          <div className="form-row">
            {/* Assignment Type */}
            <div className="form-group">
              <label htmlFor="assignmentType">Assignment Type</label>
              <select
                id="assignmentType"
                name="assignmentType"
                value={formData.assignmentType}
                onChange={handleInputChange}
              >
                <option value="homework">Homework</option>
                <option value="quiz">Quiz</option>
                <option value="project">Project</option>
                <option value="essay">Essay</option>
                <option value="presentation">Presentation</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="form-group">
              <label htmlFor="dueDate">Due Date *</label>
              <input
                type="datetime-local"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Max Points */}
            <div className="form-group">
              <label htmlFor="maxPoints">Max Points</label>
              <input
                type="number"
                id="maxPoints"
                name="maxPoints"
                value={formData.maxPoints}
                onChange={handleInputChange}
                min="1"
              />
            </div>
          </div>

          {/* Attachment URL */}
          <div className="form-group">
            <label htmlFor="attachmentUrl">Attachment URL (optional)</label>
            <input
              type="url"
              id="attachmentUrl"
              name="attachmentUrl"
              value={formData.attachmentUrl}
              onChange={handleInputChange}
              placeholder="https://..."
            />
          </div>

          {/* Select Students */}
          <div className="form-group">
            <label>Assign to Students *</label>
            <div className="select-all-button">
              <button
                type="button"
                onClick={handleSelectAllStudents}
                className="toggle-all-btn"
              >
                {formData.selectedStudents.length === students.length && students.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              <span className="selection-count">
                {formData.selectedStudents.length} of {students.length} selected
              </span>
            </div>

            <div className="students-list">
              {students.length === 0 ? (
                <p className="no-students">No students found in the system</p>
              ) : (
                students.map(student => (
                  <div key={student.id} className="student-checkbox">
                    <input
                      type="checkbox"
                      id={`student-${student.id}`}
                      checked={formData.selectedStudents.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                    />
                    <label htmlFor={`student-${student.id}`}>
                      {student.displayName || student.email}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              disabled={submitting}
              className="submit-btn"
            >
              {submitting ? 'Creating Assignment...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateAssignment
