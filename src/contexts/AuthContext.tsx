import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getUserProfile } from '../services/userService'
import { UserProfile } from '../types'
import {
  AuthUser,
  getCurrentUser,
  subscribeToAuthStateWithEvent,
  signOut,
} from '../services/authService'

interface AuthContextType {
  currentUser: AuthUser | null
  userProfile: UserProfile | null
  loading: boolean
  profileLoading: boolean
  isPasswordRecovery: boolean
  refreshProfile: (user?: AuthUser | null) => Promise<UserProfile | null>
  setUserProfileDirectly: (profile: UserProfile | null) => void
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  profileLoading: false,
  isPasswordRecovery: false,
  refreshProfile: async () => null,
  setUserProfileDirectly: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  // True when Supabase has signalled a PASSWORD_RECOVERY event.
  // While true, AuthContext will NOT load profiles or auto-redirect.
  // PasswordSetupPage is solely responsible for this session.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

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

    const handleUserWithEvent = async (event: string, user: AuthUser | null) => {
      if (!mounted) return

      // PASSWORD_RECOVERY means Supabase has processed the reset link and
      // created a temporary recovery session. We must NOT load a profile or
      // auto-redirect — the PasswordSetupPage handles the entire flow.
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
        setCurrentUser(user)
        if (mounted) setLoading(false)
        return
      }

      // After the password is updated, PasswordSetupPage calls signOut().
      // That fires SIGNED_OUT. Clear recovery flag and treat normally.
      if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false)
        setCurrentUser(null)
        setUserProfile(null)
        if (mounted) setLoading(false)
        return
      }

      setCurrentUser(user)
      if (user) await loadProfile(user)
      else setUserProfile(null)
      if (mounted) setLoading(false)
    }

    // Initialise: restore any existing session (non-recovery).
    // getSession() never returns a PASSWORD_RECOVERY event directly —
    // that only comes through onAuthStateChange — so we treat the initial
    // session as a normal SIGNED_IN or null.
    getCurrentUser().then(user => {
      if (!mounted) return
      handleUserWithEvent('INITIAL_SESSION', user)
    }).catch(error => {
      console.error('Failed to restore authentication session:', error)
      if (mounted) handleUserWithEvent('INITIAL_SESSION', null)
    })

    const unsubscribe = subscribeToAuthStateWithEvent(handleUserWithEvent)
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
        isPasswordRecovery,
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
