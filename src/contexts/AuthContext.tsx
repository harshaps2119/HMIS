import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getUserProfile } from '../services/userService'
import { UserProfile } from '../types'
import {
  AuthUser,
  getCurrentUser,
  subscribeToAuthState,
  signOut,
} from '../services/authService'

interface AuthContextType {
  currentUser: AuthUser | null
  userProfile: UserProfile | null
  loading: boolean
  profileLoading: boolean
  refreshProfile: (user?: AuthUser | null) => Promise<UserProfile | null>
  setUserProfileDirectly: (profile: UserProfile | null) => void
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  profileLoading: false,
  refreshProfile: async () => null,
  setUserProfileDirectly: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = async (user: AuthUser): Promise<UserProfile | null> => {
    setProfileLoading(true)
    try {
      const profile = await getUserProfile(user.uid)
      if (profile && !profile.active) {
        await signOut()
        setCurrentUser(null)
        setUserProfile(null)
        return null
      }
      setUserProfile(profile)
      return profile
    } catch (err) {
      console.error('Failed to load user profile:', err)
      setUserProfile(null)
      return null
    } finally {
      setProfileLoading(false)
    }
  }

  const refreshProfile = async (user?: AuthUser | null): Promise<UserProfile | null> => {
    const targetUser = user !== undefined ? user : currentUser
    if (targetUser) {
      return await loadProfile(targetUser)
    } else {
      setUserProfile(null)
      return null
    }
  }

  const setUserProfileDirectly = (profile: UserProfile | null) => {
    setUserProfile(profile)
  }

  useEffect(() => {
    let mounted = true
    const handleUser = async (user: AuthUser | null) => {
      if (!mounted) return
      setCurrentUser(user)
      if (user) await loadProfile(user)
      else setUserProfile(null)
      if (mounted) setLoading(false)
    }

    getCurrentUser().then(handleUser).catch(error => {
      console.error('Failed to restore authentication session:', error)
      handleUser(null)
    })
    const unsubscribe = subscribeToAuthState(handleUser)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        profileLoading,
        refreshProfile,
        setUserProfileDirectly,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
