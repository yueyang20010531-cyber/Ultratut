import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

// Generate AI assignment
export const generateAIAssignment = async (prompt, subject, gradeLevel, difficulty = 'medium') => {
  try {
    const generateAssignmentFn = httpsCallable(functions, 'generateAssignment')
    const result = await generateAssignmentFn({
      prompt,
      subject,
      gradeLevel,
      difficulty
    })

    if (result.data.success) {
      return result.data.assignment
    } else {
      throw new Error('Failed to generate assignment')
    }
  } catch (error) {
    console.error('Error generating AI assignment:', error)
    throw error
  }
}

// Copy text to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError)
      return false
    }
  }
}

// Download text as Word document
export const downloadAsWordDoc = (content, filename) => {
  // Create a simple HTML document that can be opened in Word
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${filename}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        h3 { color: #666; margin-top: 20px; }
        ul, ol { margin-left: 20px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div style="white-space: pre-wrap;">
${content.replace(/`/g, '').replace(/\*\*/g, '')}
    </div>
</body>
</html>`

  const blob = new Blob([htmlContent], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}