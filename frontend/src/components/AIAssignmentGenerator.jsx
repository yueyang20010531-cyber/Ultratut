import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import './AIAssignmentGenerator.css'

function AIAssignmentGenerator({ onAssignmentGenerated }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedAssignment, setGeneratedAssignment] = useState(null)
  const [formData, setFormData] = useState({
    prompt: '',
    subject: '',
    gradeLevel: '',
    difficulty: 'medium'
  })
  const [copySuccess, setCopySuccess] = useState(false)

  const subjects = [
    'Mathematics', 'Science', 'English', 'History', 'Geography',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art',
    'Music', 'Physical Education', 'Foreign Language', 'Economics',
    'Psychology', 'Sociology', 'Literature', 'Writing', 'Research'
  ]

  const gradeLevels = [
    'Elementary (K-5)', 'Middle School (6-8)', 'High School (9-12)',
    'College Freshman', 'College Sophomore', 'College Junior', 'College Senior',
    'Graduate Level'
  ]

  const difficulties = [
    { value: 'easy', label: 'Easy - Basic concepts, straightforward tasks' },
    { value: 'medium', label: 'Medium - Moderate challenge, some analysis required' },
    { value: 'hard', label: 'Hard - Complex analysis, advanced application' },
    { value: 'advanced', label: 'Advanced - Expert level, research-intensive' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleGenerate = async (e) => {
    e.preventDefault()

    if (!formData.prompt || !formData.subject || !formData.gradeLevel) {
      alert('Please fill in all required fields')
      return
    }

    setIsGenerating(true)
    setGeneratedAssignment(null)

    try {
      const generateAssignmentFn = httpsCallable(functions, 'generateAssignment')
      const result = await generateAssignmentFn({
        prompt: formData.prompt,
        subject: formData.subject,
        gradeLevel: formData.gradeLevel,
        difficulty: formData.difficulty
      })

      if (result.data.success) {
        setGeneratedAssignment(result.data.assignment)
        if (onAssignmentGenerated) {
          onAssignmentGenerated(result.data.assignment)
        }
      } else {
        alert('Failed to generate assignment. Please try again.')
      }
    } catch (error) {
      console.error('Error generating assignment:', error)
      alert('Error generating assignment. Please check your connection and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyToClipboard = async () => {
    if (!generatedAssignment) return

    try {
      await navigator.clipboard.writeText(generatedAssignment.content)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = generatedAssignment.content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const handleDownloadWord = () => {
    if (!generatedAssignment) return

    // Create a simple HTML document that can be opened in Word
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${generatedAssignment.title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        h3 { color: #666; margin-top: 20px; }
        ul, ol { margin-left: 20px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
        .assignment-meta { background: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="assignment-meta">
        <strong>Subject:</strong> ${generatedAssignment.subject}<br>
        <strong>Grade Level:</strong> ${generatedAssignment.gradeLevel}<br>
        <strong>Difficulty:</strong> ${generatedAssignment.difficulty}<br>
        <strong>Generated:</strong> ${new Date().toLocaleDateString()}
    </div>

    <div style="white-space: pre-wrap;">
${generatedAssignment.content.replace(/`/g, '').replace(/\*\*/g, '')}
    </div>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${generatedAssignment.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCreateAssignment = () => {
    if (!generatedAssignment) return

    // This would integrate with the existing CreateAssignment component
    // For now, we'll just copy the content to clipboard
    handleCopyToClipboard()
    alert('Assignment content copied! You can now paste it into your assignment creation form.')
  }

  return (
    <div className="ai-assignment-generator">
      <div className="generator-header">
        <h2>🤖 AI Assignment Generator</h2>
        <p>Create custom assignments using AI. Simply describe what you want, and get a complete, ready-to-use assignment.</p>
      </div>

      <div className="generator-content">
        <form onSubmit={handleGenerate} className="assignment-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="subject">Subject *</label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a subject</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="gradeLevel">Grade Level *</label>
              <select
                id="gradeLevel"
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleInputChange}
                required
              >
                <option value="">Select grade level</option>
                {gradeLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="difficulty">Difficulty Level</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
              >
                {difficulties.map(diff => (
                  <option key={diff.value} value={diff.value}>{diff.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prompt">Assignment Description *</label>
            <textarea
              id="prompt"
              name="prompt"
              value={formData.prompt}
              onChange={handleInputChange}
              placeholder="Describe the assignment you want to create. For example: 'Create a research paper on climate change impacts' or 'Design a math problem set on quadratic equations' or 'Write an essay prompt about the American Revolution'"
              rows={6}
              required
            />
          </div>

          <button
            type="submit"
            className="generate-btn"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="spinner"></div>
                Generating Assignment...
              </>
            ) : (
              '🚀 Generate Assignment'
            )}
          </button>
        </form>

        {generatedAssignment && (
          <div className="generated-assignment">
            <div className="assignment-header">
              <h3>{generatedAssignment.title}</h3>
              <div className="assignment-meta">
                <span className="meta-item">📚 {generatedAssignment.subject}</span>
                <span className="meta-item">🎓 {generatedAssignment.gradeLevel}</span>
                <span className="meta-item">⚡ {generatedAssignment.difficulty}</span>
              </div>
            </div>

            <div className="assignment-actions">
              <button
                onClick={handleCopyToClipboard}
                className="action-btn copy-btn"
              >
                📋 {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handleDownloadWord}
                className="action-btn download-btn"
              >
                📄 Download as Word Doc
              </button>
              <button
                onClick={handleCreateAssignment}
                className="action-btn create-btn"
              >
                ➕ Create Assignment
              </button>
            </div>

            <div className="assignment-content">
              <pre>{generatedAssignment.content}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIAssignmentGenerator