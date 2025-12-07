import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api, authApi, ApiError, User } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  login: (username: string, pin: string) => Promise<void>
  logout: () => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      const token = api.getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const result = await authApi.verify()
        setIsAuthenticated(true)
        setUser(result.user)
      } catch {
        // Token invalid, clear it
        api.setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (username: string, pin: string): Promise<void> => {
    setError(null)
    setIsLoading(true)

    try {
      const { token, user: loggedInUser } = await authApi.login(username, pin)
      api.setToken(token)
      setUser(loggedInUser)
      setIsAuthenticated(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout errors
    } finally {
      api.setToken(null)
      setUser(null)
      setIsAuthenticated(false)
    }
  }, [])

  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
