import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin'
}

// Get user profile from Firestore
export const getUserProfile = async (userId) => {
  try {
    console.log('=== GET USER PROFILE START ===')
    console.log('Getting profile for UID:', userId)
    const userDoc = await getDoc(doc(db, 'users', userId))
    console.log('Document exists:', userDoc.exists())
    if (userDoc.exists()) {
      const data = userDoc.data()
      console.log('Profile data:', data)
      console.log('Profile role:', data.role)
      console.log('=== GET USER PROFILE END ===')
      return data
    }
    console.log('No profile found, returning null')
    console.log('=== GET USER PROFILE END ===')
    return null
  } catch (error) {
    console.error('Error getting user profile:', error)
    console.error('Error details:', error.message)
    return null
  }
}

// Create or update user profile
export const setUserProfile = async (userId, profileData) => {
  try {
    const userRef = doc(db, 'users', userId)
    await setDoc(userRef, {
      ...profileData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true })
  } catch (error) {
    console.error('Error setting user profile:', error)
    throw error
  }
}

// Update user role
export const setUserRole = async (userId, role) => {
  try {
    await setUserProfile(userId, { role })
  } catch (error) {
    console.error('Error setting user role:', error)
    throw error
  }
}

// Check if user is admin
export const isAdmin = async (userId) => {
  try {
    const profile = await getUserProfile(userId)
    return profile?.role === ROLES.ADMIN
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Initialize user profile on signup
export const initializeUserProfile = async (user) => {
  try {
    console.log('=== INITIALIZE PROFILE START ===')
    console.log('User email:', user.email)
    console.log('User UID:', user.uid)
    
    const existingProfile = await getUserProfile(user.uid)
    console.log('Existing profile found:', existingProfile)

    const isAdminUser = user.email?.toLowerCase() === 'dannyyue@uw.edu'
    console.log('Is admin user?', isAdminUser)
    console.log('Email check: ', user.email?.toLowerCase(), '===', 'dannyyue@uw.edu')
    
    const profileData = {
      email: user.email,
      displayName: user.displayName || user.email,
      updatedAt: new Date()
    }

    if (!existingProfile) {
      console.log('No existing profile - creating new one')
      const roleToSet = isAdminUser ? ROLES.ADMIN : ROLES.STUDENT
      console.log('Setting role to:', roleToSet)
      
      await setUserProfile(user.uid, {
        ...profileData,
        role: roleToSet,
        createdAt: new Date()
      })
      console.log('Profile created successfully with role:', roleToSet)
    } else if (isAdminUser && existingProfile.role !== ROLES.ADMIN) {
      console.log('Existing profile found - updating admin role')
      await setUserProfile(user.uid, {
        ...profileData,
        role: ROLES.ADMIN
      })
      console.log('Admin role updated successfully')
    } else {
      console.log('Profile already exists, no update needed. Current role:', existingProfile?.role)
    }
    console.log('=== INITIALIZE PROFILE END ===')
  } catch (error) {
    console.error('=== ERROR IN INITIALIZE PROFILE ===')
    console.error('Error initializing user profile:', error)
    console.error('Error message:', error.message)
    console.error('=== ERROR END ===')
  }
}
