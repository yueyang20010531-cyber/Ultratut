import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { collection, getDocs } from 'firebase/firestore'
import { functions, db } from '../firebase'
import { getUserProfile } from '../utils/userRoles'
import './Messages.css'

function Messages({ user }) {
  const [activeTab, setActiveTab] = useState('inbox')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [composeData, setComposeData] = useState({
    recipientId: '',
    recipientName: '',
    subject: '',
    content: ''
  })
  const [users, setUsers] = useState([])
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Load messages when tab changes
  useEffect(() => {
    loadMessages()
  }, [activeTab])

  // Load users when component mounts
  useEffect(() => {
    loadUsers()
  }, [])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const getMessagesFn = httpsCallable(functions, 'getMessages')
      const result = await getMessagesFn({ type: activeTab })

      if (result.data.success) {
        setMessages(result.data.messages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      // Load all users from Firestore
      const usersSnapshot = await getDocs(collection(db, 'users'))

      const usersList = usersSnapshot.docs
        .map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            email: data.email || 'Unknown',
            displayName: data.displayName || data.name || data.email || 'Unknown User',
            role: data.role || 'student',
            ...data
          }
        })
        .filter(u => u.id !== user.uid) // Don't include current user

      console.log('Users loaded:', usersList)
      setUsers(usersList)
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([]) // Set empty array on error
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!composeData.recipientId || !composeData.subject || !composeData.content) {
      alert('Please fill in all fields')
      return
    }

    try {
      const sendMessageFn = httpsCallable(functions, 'sendMessage')
      const result = await sendMessageFn({
        recipientId: composeData.recipientId,
        subject: composeData.subject,
        content: composeData.content
      })

      if (result.data.success) {
        alert('Message sent successfully!')
        setShowCompose(false)
        setComposeData({ recipientId: '', recipientName: '', subject: '', content: '' })
        loadMessages()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  const handleMarkAsRead = async (messageId) => {
    try {
      const markAsReadFn = httpsCallable(functions, 'markMessageAsRead')
      await markAsReadFn({ messageId })
      loadMessages()
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const handleRecipientSelect = (user) => {
    setComposeData({
      ...composeData,
      recipientId: user.id,
      recipientName: user.displayName || user.email || 'Unknown'
    })
  }

  const filteredUsers = users.filter(u =>
    (u.displayName || u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="messages-container">
      <div className="messages-header">
        <h2>Messages</h2>
        <button
          className="compose-btn"
          onClick={() => setShowCompose(true)}
        >
          ✏️ Compose
        </button>
      </div>

      <div className="messages-tabs">
        <button
          className={`tab-btn ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          📥 Inbox ({messages.filter(m => !m.read && m.recipientId === user.uid).length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          📤 Sent
        </button>
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📋 All Messages
        </button>
      </div>

      <div className="messages-content">
        {loading ? (
          <div className="loading">Loading messages...</div>
        ) : (
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages found.</p>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={`message-item ${!message.read && message.recipientId === user.uid ? 'unread' : ''}`}
                  onClick={() => {
                    setSelectedMessage(message)
                    if (!message.read && message.recipientId === user.uid) {
                      handleMarkAsRead(message.id)
                    }
                  }}
                >
                  <div className="message-header">
                    <div className="message-sender">
                      <strong>
                        {message.senderId === user.uid ? 'To: ' : 'From: '}
                        {message.senderId === user.uid ? message.recipientName : message.senderName}
                      </strong>
                      <span className="message-role">({message.senderRole})</span>
                    </div>
                    <div className="message-date">
                      {formatDate(message.createdAt)}
                    </div>
                  </div>
                  <div className="message-subject">{message.subject}</div>
                  <div className="message-preview">
                    {message.content.substring(0, 100)}...
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {selectedMessage && (
          <div className="message-detail">
            <div className="message-detail-header">
              <h3>{selectedMessage.subject}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedMessage(null)}
              >
                ✕
              </button>
            </div>
            <div className="message-meta">
              <p><strong>From:</strong> {selectedMessage.senderName} ({selectedMessage.senderRole})</p>
              <p><strong>To:</strong> {selectedMessage.recipientId === user.uid ? 'You' : selectedMessage.recipientName}</p>
              <p><strong>Date:</strong> {formatDate(selectedMessage.createdAt)}</p>
            </div>
            <div className="message-content">
              {selectedMessage.content}
            </div>
          </div>
        )}
      </div>

      {showCompose && (
        <div className="compose-modal">
          <div className="compose-content">
            <div className="compose-header">
              <h3>Compose Message</h3>
              <button
                className="close-btn"
                onClick={() => setShowCompose(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendMessage}>
              <div className="form-group">
                <label>To:</label>
                <div className="recipient-selector">
                  <input
                    type="text"
                    placeholder="Search for recipient... (start typing to see options)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <div className="user-list">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.slice(0, 5).map(u => (
                          <div
                            key={u.id}
                            className="user-option"
                            onClick={() => {
                              handleRecipientSelect(u)
                              setSearchTerm('') // Clear search after selection
                            }}
                          >
                            {u.displayName} ({u.role})
                            {u.email && <span className="user-email">{u.email}</span>}
                          </div>
                        ))
                      ) : (
                        <div className="user-option disabled">
                          No users found matching "{searchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                  {composeData.recipientName && (
                    <div className="selected-recipient">
                      ✓ Selected: {composeData.recipientName}
                      <button
                        type="button"
                        onClick={() => setComposeData({...composeData, recipientId: '', recipientName: ''})}
                        className="clear-selection"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {!composeData.recipientName && !searchTerm && users.length === 0 && (
                    <div className="no-users-message">
                      Loading users...
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Subject:</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Message:</label>
                <textarea
                  value={composeData.content}
                  onChange={(e) => setComposeData({...composeData, content: e.target.value})}
                  rows={6}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCompose(false)}>
                  Cancel
                </button>
                <button type="submit" className="send-btn">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Messages