import { storage, db, functions } from '../firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { collection, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, query, where, getDocs, orderBy } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

/**
 * Upload a submission file to Cloud Storage
 * @param {File} file - The file to upload
 * @param {string} assignmentId - The assignment ID
 * @param {string} studentId - The student ID
 * @returns {Promise<string>} - Download URL of the uploaded file
 */
export const uploadSubmissionFile = async (file, assignmentId, studentId) => {
  try {
    // Create a unique filename
    const timestamp = Date.now()
    const filename = `${assignmentId}_${studentId}_${timestamp}_${file.name}`
    const fileRef = ref(storage, `submissions/${assignmentId}/${filename}`)

    // Upload the file
    const snapshot = await uploadBytes(fileRef, file)
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return downloadURL
  } catch (error) {
    console.error('Error uploading submission file:', error)
    throw new Error('Failed to upload file. Please try again.')
  }
}

/**
 * Create a submission record in Firestore
 * @param {Object} submissionData - Submission data
 * @returns {Promise<string>} - Submission document ID
 */
export const createSubmission = async (submissionData) => {
  try {
    const docRef = await addDoc(collection(db, 'submissions'), {
      ...submissionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      graded: false,
      grade: null,
      feedback: ''
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating submission:', error)
    throw new Error('Failed to create submission. Please try again.')
  }
}

/**
 * Update a submission (for grading or feedback)
 * @param {string} submissionId - The submission ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updateSubmission = async (submissionId, updateData) => {
  try {
    const submissionRef = doc(db, 'submissions', submissionId)
    await updateDoc(submissionRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating submission:', error)
    throw new Error('Failed to update submission. Please try again.')
  }
}

/**
 * Get all submissions for an assignment
 * @param {string} assignmentId - The assignment ID
 * @returns {Promise<Array>} - Array of submission documents
 */
export const getSubmissionsForAssignment = async (assignmentId) => {
  try {
    if (!assignmentId) {
      console.warn('getSubmissionsForAssignment called with empty assignmentId')
      return []
    }

    const q = query(
      collection(db, 'submissions'),
      where('assignmentId', '==', assignmentId)
    )
    const querySnapshot = await getDocs(q)
    const submissions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Sort by createdAt in descending order (most recent first)
    return submissions.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt)
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt)
      return bTime - aTime
    })
  } catch (error) {
    // Don't log permission errors as they're expected for some queries
    if (error.code === 'permission-denied') {
      console.debug(`No submissions found for assignment ${assignmentId} (permission check)`)
    } else {
      console.error('Error getting submissions:', error)
    }
    // Return empty array instead of throwing to prevent blocking the UI
    return []
  }
}

/**
 * Get all submissions for a student
 * @param {string} studentId - The student ID
 * @returns {Promise<Array>} - Array of submission documents
 */
export const getSubmissionsForStudent = async (studentId) => {
  try {
    if (!studentId) {
      console.warn('getSubmissionsForStudent called with empty studentId')
      return []
    }

    const q = query(
      collection(db, 'submissions'),
      where('studentId', '==', studentId)
    )
    const querySnapshot = await getDocs(q)
    const submissions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Sort by createdAt in descending order (most recent first)
    return submissions.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt)
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt)
      return bTime - aTime
    })
  } catch (error) {
    // Don't log permission errors as they're expected for some queries
    if (error.code === 'permission-denied') {
      console.debug(`No submissions found for student ${studentId} (permission check)`)
    } else {
      console.error('Error getting student submissions:', error)
    }
    // Return empty array instead of throwing to prevent blocking the UI
    return []
  }
}

/**
 * Get a specific submission
 * @param {string} submissionId - The submission ID
 * @returns {Promise<Object>} - Submission document
 */
export const getSubmission = async (submissionId) => {
  try {
    const docSnapshot = await getDocs(query(collection(db, 'submissions'), where('id', '==', submissionId)))
    if (docSnapshot.empty) {
      throw new Error('Submission not found')
    }
    return { id: docSnapshot.docs[0].id, ...docSnapshot.docs[0].data() }
  } catch (error) {
    console.error('Error getting submission:', error)
    throw new Error('Failed to load submission.')
  }
}

/**
 * Call Firebase AI grading function to score a submission
 * @param {Object} submission - The submission document
 * @param {Object} assignment - The assignment details
 * @returns {Promise<Object>} - AI grading result
 */
export const aiGradeSubmission = async (submission, assignment) => {
  try {
    const gradeSubmissionFn = httpsCallable(functions, 'aiGradeAssignment')
    const assignmentDescription = assignment?.description || assignment?.instructions || assignment?.title || 'No description provided.'
    const submissionText = submission?.submissionText
      ? submission.submissionText
      : `Student submitted a file: ${submission?.fileName || 'unknown file'}. URL: ${submission?.fileUrl || 'not available'}.`

    const response = await gradeSubmissionFn({
      submissionId: submission.id,
      assignmentId: assignment.id,
      assignmentDescription,
      submissionText,
      maxPoints: assignment?.maxPoints || 100
    })

    return response.data
  } catch (error) {
    console.error('AI grading request failed:', error)
    const message = error?.message || 'AI grading request failed. Please try again.'
    throw new Error(message)
  }
}

/**
 * Delete a submission and its file
 * @param {string} submissionId - The submission ID
 * @param {string} fileUrl - The file URL to delete
 * @returns {Promise<void>}
 */
export const deleteSubmission = async (submissionId, fileUrl) => {
  try {
    // Delete file from storage if URL is provided
    if (fileUrl) {
      try {
        const fileRef = ref(storage, fileUrl)
        await deleteObject(fileRef)
      } catch (error) {
        console.warn('Warning: Could not delete file from storage:', error)
      }
    }

    // Delete submission document
    const submissionRef = doc(db, 'submissions', submissionId)
    await deleteDoc(submissionRef)
  } catch (error) {
    console.error('Error deleting submission:', error)
    throw new Error('Failed to delete submission.')
  }
}

/**
 * Check if a student has already submitted an assignment
 * @param {string} assignmentId - The assignment ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object|null>} - Existing submission or null
 */
export const getExistingSubmission = async (assignmentId, studentId) => {
  try {
    const q = query(
      collection(db, 'submissions'),
      where('assignmentId', '==', assignmentId),
      where('studentId', '==', studentId)
    )
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }

    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    }
  } catch (error) {
    console.error('Error checking existing submission:', error)
    return null
  }
}
