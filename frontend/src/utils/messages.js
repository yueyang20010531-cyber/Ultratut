import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

// Send a message
export const sendMessage = async (recipientId, subject, content) => {
  try {
    const sendMessageFn = httpsCallable(functions, 'sendMessage')
    const result = await sendMessageFn({
      recipientId,
      subject,
      content
    })

    if (result.data.success) {
      return { success: true, messageId: result.data.messageId }
    } else {
      throw new Error('Failed to send message')
    }
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

// Get messages for current user
export const getMessages = async (type = 'all') => {
  try {
    const getMessagesFn = httpsCallable(functions, 'getMessages')
    const result = await getMessagesFn({ type })

    if (result.data.success) {
      return result.data.messages
    } else {
      throw new Error('Failed to get messages')
    }
  } catch (error) {
    console.error('Error getting messages:', error)
    throw error
  }
}

// Mark a message as read
export const markMessageAsRead = async (messageId) => {
  try {
    const markAsReadFn = httpsCallable(functions, 'markMessageAsRead')
    const result = await markAsReadFn({ messageId })

    if (result.data.success) {
      return { success: true }
    } else {
      throw new Error('Failed to mark message as read')
    }
  } catch (error) {
    console.error('Error marking message as read:', error)
    throw error
  }
}

// Get message thread between two users
export const getMessageThread = async (otherUserId) => {
  try {
    const getThreadFn = httpsCallable(functions, 'getMessageThread')
    const result = await getThreadFn({ otherUserId })

    if (result.data.success) {
      return {
        messages: result.data.messages,
        otherUser: result.data.otherUser
      }
    } else {
      throw new Error('Failed to get message thread')
    }
  } catch (error) {
    console.error('Error getting message thread:', error)
    throw error
  }
}

// Get unread message count
export const getUnreadCount = async () => {
  try {
    const messages = await getMessages('unread')
    return messages.length
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}