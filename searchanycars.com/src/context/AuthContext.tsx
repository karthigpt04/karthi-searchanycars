import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'

interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'user'
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe() as { user: User }
      setUser(data.user)
    } catch {
      // Try refresh
      try {
        const data = await api.refreshToken() as { user: User }
        setUser(data.user)
      } catch {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshUser() }, [refreshUser])

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password) as { user: User }
    setUser(data.user)
  }

  const register = async (email: string, password: string, name: string) => {
    const data = await api.register(email, password, name) as { user: User }
    setUser(data.user)
  }

  const logout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.role === 'admin', login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
