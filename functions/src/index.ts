import { onRequest } from 'firebase-functions/v2/https'
import type { Response } from 'express'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'

initializeApp()

const adminAuth = getAuth()
const firestore = getFirestore()
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean),
)

interface UserProfile {
  uid: string
  name: string
  phone: string
  role: 'admin' | 'receptionist' | 'doctor' | 'patient'
  email?: string
  active: boolean
}

function setCors(response: Response, origin: string | undefined) {
  if (origin && allowedOrigins.has(origin)) {
    response.set('Access-Control-Allow-Origin', origin)
    response.set('Vary', 'Origin')
  }
  response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

export const exchangeSupabaseToken = onRequest(async (request, response) => {
  const origin = request.get('origin')
  setCors(response, origin)

  if (request.method === 'OPTIONS') {
    response.status(204).send('')
    return
  }
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  if (origin && !allowedOrigins.has(origin)) {
    response.status(403).json({ error: 'Origin is not authorized.' })
    return
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    response.status(500).json({ error: 'Authentication bridge is not configured.' })
    return
  }

  const authorization = request.get('authorization') || ''
  const accessToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
  if (!accessToken) {
    response.status(401).json({ error: 'A valid Supabase session is required.' })
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data.user || !data.user.email) {
      response.status(401).json({ error: 'The Supabase session is invalid or expired.' })
      return
    }

    const directProfile = await firestore.collection('users').doc(data.user.id).get()
    let profileSnapshot = directProfile.exists ? [directProfile] : []
    if (profileSnapshot.length === 0) {
      const matches = await firestore
        .collection('users')
        .where('email', '==', data.user.email)
        .limit(2)
        .get()
      profileSnapshot = matches.docs
    }

    if (profileSnapshot.length === 0) {
      response.status(403).json({ error: 'No approved clinic profile is associated with this account.' })
      return
    }
    if (profileSnapshot.length > 1) {
      response.status(409).json({ error: 'More than one clinic profile matches this account.' })
      return
    }

    const profileDocument = profileSnapshot[0]
    const profile = profileDocument.data() as UserProfile
    if (profile.uid !== profileDocument.id || !profile.active) {
      response.status(403).json({ error: 'The clinic profile is inactive or inconsistent.' })
      return
    }
    if (!['admin', 'receptionist', 'doctor', 'patient'].includes(profile.role)) {
      response.status(403).json({ error: 'The clinic profile has an invalid role.' })
      return
    }
    if (!profile.phone || !/^\+91[6-9]\d{9}$/.test(profile.phone)) {
      response.status(403).json({ error: 'The clinic profile has no valid verified phone number.' })
      return
    }

    const firebaseToken = await adminAuth.createCustomToken(profileDocument.id, {
      phone_number: profile.phone,
    })
    response.status(200).json({ firebaseToken })
  } catch (error) {
    console.error('Supabase to Firebase token exchange failed:', error)
    response.status(500).json({ error: 'Firebase authorization could not be established.' })
  }
})