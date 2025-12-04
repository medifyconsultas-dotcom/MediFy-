import { create } from 'zustand'
import { User as FirebaseUser } from 'firebase/auth'
import { User, UserProfile } from '@/types'

interface AuthState {
  firebaseUser: FirebaseUser | null
  userProfile: User | null
  loading: boolean
  setFirebaseUser: (user: FirebaseUser | null) => void
  setUserProfile: (profile: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ firebaseUser: null, userProfile: null }),
}))

