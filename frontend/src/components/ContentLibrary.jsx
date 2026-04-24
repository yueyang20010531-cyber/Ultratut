import { useState, useEffect, useRef } from 'react'
import { storage, db } from '../firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { getUserProfile, ROLES } from '../utils/userRoles'
import './ContentLibrary.css'

function ContentLibrary({ user }) {
  const [files, setFiles] = useState([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const fileInputRef = useRef(null)

  const canEditLibrary = userProfile?.role === ROLES.TEACHER || userProfile?.role === ROLES.ADMIN

  useEffect(() => {
    loadUserProfile()
  }, [user])

  useEffect(() => {
    if (userProfile) {
      loadFiles()
    }
  }, [currentPath, userProfile])

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const loadFiles = async () => {
    if (!userProfile || !user) {
      console.log('loadFiles: No user or profile, skipping load')
      return
    }

    setLoading(true)
    try {
      console.log('loadFiles: Loading files for user:', user.uid, 'in path:', currentPath)

      // Load from Firestore for metadata
      const filesRef = collection(db, 'files')

      // Everyone sees shared library content in the current folder
      const q = query(filesRef, where('path', '==', currentPath))
      console.log('loadFiles: Executing query for path:', currentPath)

      const querySnapshot = await getDocs(q)
      console.log('loadFiles: Query returned', querySnapshot.size, 'documents')

      const filesData = []
      querySnapshot.forEach((doc) => {
        filesData.push({ id: doc.id, ...doc.data() })
      })

      console.log('loadFiles: Processed', filesData.length, 'files')
      setFiles(filesData)
    } catch (error) {
      console.error('Error loading files:', error)
      console.error('Error details:', error.message)
      console.error('Error code:', error.code)
      setFiles([]) // Clear files on error
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    setUploading(true)
    try {
      for (const file of files) {
        // Create storage reference
        const fileRef = ref(storage, `content/${user.uid}/${currentPath}${file.name}`)

        // Upload file
        await uploadBytes(fileRef, file)

        // Get download URL
        const downloadURL = await getDownloadURL(fileRef)

        // Save metadata to Firestore
        await addDoc(collection(db, 'files'), {
          name: file.name,
          path: currentPath,
          fullPath: `${currentPath}${file.name}`,
          url: downloadURL,
          size: file.size,
          type: file.type,
          uploadedBy: user.uid,
          uploaderEmail: userProfile?.email || user.email,
          uploadedAt: new Date(),
          isFolder: false
        })
      }

      await loadFiles()
      setShowUpload(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const folderPath = currentPath + newFolderName + '/'

      // Check if folder already exists
      const existingFolder = files.find(f => f.name === newFolderName && f.isFolder)
      if (existingFolder) {
        alert('Folder already exists')
        return
      }

      // Create folder entry in Firestore
      await addDoc(collection(db, 'files'), {
        name: newFolderName,
        path: currentPath,
        fullPath: folderPath,
        uploadedBy: user.uid,
        uploadedAt: new Date(),
        isFolder: true
      })

      await loadFiles()
      setNewFolderName('')
      setShowNewFolder(false)
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Error creating folder: ' + error.message)
    }
  }

  const handleDelete = async (file) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return

    try {
      if (file.isFolder) {
        // Delete folder and all contents
        const folderPath = file.fullPath

        // Get all files in this folder and subfolders
        const filesRef = collection(db, 'files')
        const q = query(filesRef, where('path', '>=', folderPath), where('path', '<', folderPath + '\uf8ff'))
        const querySnapshot = await getDocs(q)

        // Delete all files in storage and database
        for (const docSnap of querySnapshot.docs) {
          const fileData = docSnap.data()
          if (!fileData.isFolder) {
            const fileRef = ref(storage, `content/${fileData.uploadedBy}/${fileData.fullPath}`)
            try {
              await deleteObject(fileRef)
            } catch (error) {
              console.log('File not found in storage:', error)
            }
          }
          await deleteDoc(docSnap.ref)
        }

        // Delete the folder itself
        await deleteDoc(doc(db, 'files', file.id))
      } else {
        // Delete single file
        const fileRef = ref(storage, `content/${file.uploadedBy}/${file.fullPath}`)
        await deleteObject(fileRef)
        await deleteDoc(doc(db, 'files', file.id))
      }

      await loadFiles()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Error deleting: ' + error.message)
    }
  }

  const handleDownload = async (file) => {
    try {
      // Create a temporary anchor element
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.name
      link.target = '_blank' // Fallback for browsers that don't support download attribute

      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Error downloading file: ' + error.message)
    }
  }

  const navigateToFolder = (folder) => {
    setCurrentPath(folder.fullPath)
  }

  const navigateUp = () => {
    const pathParts = currentPath.split('/').filter(p => p)
    pathParts.pop()
    setCurrentPath(pathParts.length > 0 ? pathParts.join('/') + '/' : '')
  }

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(p => p)
    return parts
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file) => {
    if (file.isFolder) return '📁'
    const ext = file.name.split('.').pop().toLowerCase()
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      txt: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      mp4: '🎥',
      mp3: '🎵',
      zip: '📦'
    }
    return icons[ext] || '📄'
  }

  return (
    <div className="content-library">
      <div className="library-header">
        <div className="breadcrumbs">
          <button
            className="breadcrumb-home"
            onClick={() => setCurrentPath('')}
            disabled={currentPath === ''}
          >
            🏠 Home
          </button>
          {getBreadcrumbs().map((part, index) => (
            <span key={index} className="breadcrumb-separator">/</span>
          ))}
          {getBreadcrumbs().map((part, index) => (
            <span key={index} className="breadcrumb-part">{part}</span>
          ))}
        </div>

        <div className="library-actions">
          {canEditLibrary ? (
            <>
              <button
                className="action-btn upload-btn"
                onClick={() => setShowUpload(!showUpload)}
              >
                📤 Upload Files
              </button>
              <button
                className="action-btn folder-btn"
                onClick={() => setShowNewFolder(!showNewFolder)}
              >
                📁 New Folder
              </button>
            </>
          ) : (
            <div className="view-only-note">👀 You can view the shared library. Upload and edit access is for teachers and admins only.</div>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
          />
          {uploading && <p>Uploading...</p>}
        </div>
      )}

      {showNewFolder && (
        <div className="new-folder-section">
          <input
            type="text"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <button onClick={handleCreateFolder}>Create</button>
          <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>Cancel</button>
        </div>
      )}

      <div className="files-list">
        {loading ? (
          <p>Loading files...</p>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <p>📂 This folder is empty</p>
            <p>Upload files or create folders to get started</p>
          </div>
        ) : (
          <div className="files-grid">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-icon">
                  {getFileIcon(file)}
                </div>
                <div className="file-info">
                  <div className="file-name">
                    {file.isFolder ? (
                      <button
                        className="folder-link"
                        onClick={() => navigateToFolder(file)}
                      >
                        {file.name}
                      </button>
                    ) : (
                      <span>{file.name}</span>
                    )}
                  </div>
                  {!file.isFolder && (
                    <div className="file-meta">
                      <span>{formatFileSize(file.size || 0)}</span>
                      <span>{file.type || 'Unknown'}</span>
                      {file.uploaderEmail && <span className="uploader-email">Uploaded by: {file.uploaderEmail}</span>}
                    </div>
                  )}
                </div>
                <div className="file-actions">
                  {!file.isFolder && (
                    <button
                      className="action-btn download-btn"
                      onClick={() => handleDownload(file)}
                      title="Download"
                    >
                      ⬇️
                    </button>
                  )}
                  {canEditLibrary && (
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(file)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ContentLibrary
