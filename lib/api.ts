import axios from 'axios'
import { getCurrentUser } from 'aws-amplify/auth'
import { ApiResponse, QuizResponse, SpendingEntry, SavingsGoal, ChatMessage, DailyAnalysis } from '@/types'
import mockApiClient from './mock-api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    console.log('🔍 API Request Debug - Getting user...')
    const user = await getCurrentUser()
    console.log('👤 User object:', user)
    
    if (user) {
      console.log('🔍 Getting auth session...')
      const session = await import('aws-amplify/auth').then(auth => auth.fetchAuthSession())
      console.log('🔑 Session object:', session)
      console.log('🔑 Session tokens:', session.tokens)
      
      const token = session.tokens?.idToken?.toString()
      console.log('🎫 Extracted token:', token ? `${token.substring(0, 20)}...` : 'null')
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        console.log('✅ Token added to request headers')
      } else {
        console.warn('⚠️ No token found in session')
      }
    } else {
      console.warn('⚠️ No user found')
    }
  } catch (error) {
    console.error('❌ Failed to get auth token:', error)
  }
  return config
})

// Helper function to handle API errors and fallback to mock
const handleApiCall = async <T>(apiCall: () => Promise<T>, mockCall: () => Promise<T>): Promise<T> => {
  try {
    return await apiCall()
  } catch (error) {
    console.warn('API call failed, using mock data:', error)
    return await mockCall()
  }
}

export const apiClient = {
  // Quiz endpoints
  submitQuiz: async (answers: any[]): Promise<ApiResponse<QuizResponse>> => {
    return handleApiCall(
      async () => {
        const response = await api.post('/quiz/submit', { answers })
        return response.data
      },
      () => mockApiClient.submitQuiz(answers)
    )
  },

  getQuizAnalysis: async (userId: string): Promise<ApiResponse<QuizResponse>> => {
    return handleApiCall(
      async () => {
        const response = await api.get(`/quiz/analysis/${userId}`)
        return response.data
      },
      () => mockApiClient.getQuizAnalysis(userId)
    )
  },

  // Spending entries
  addSpendingEntry: async (entry: Omit<SpendingEntry, 'id' | 'createdAt'>): Promise<ApiResponse<SpendingEntry>> => {
    return handleApiCall(
      async () => {
        const response = await api.post('/spending/entry', entry)
        return response.data
      },
      () => mockApiClient.addSpendingEntry(entry)
    )
  },

  getSpendingEntries: async (userId: string, date?: string): Promise<ApiResponse<SpendingEntry[]>> => {
    return handleApiCall(
      async () => {
        const params = date ? { date } : {}
        const response = await api.get(`/spending/entries/${userId}`, { params })
        return response.data
      },
      () => mockApiClient.getSpendingEntries(userId, date)
    )
  },

  updateSpendingEntry: async (id: string, entry: Partial<SpendingEntry>): Promise<ApiResponse<SpendingEntry>> => {
    return handleApiCall(
      async () => {
        const response = await api.put(`/spending/entry/${id}`, entry)
        return response.data
      },
      () => mockApiClient.updateSpendingEntry(id, entry)
    )
  },

  deleteSpendingEntry: async (id: string): Promise<ApiResponse<void>> => {
    return handleApiCall(
      async () => {
        const response = await api.delete(`/spending/entry/${id}`)
        return response.data
      },
      () => mockApiClient.deleteSpendingEntry(id)
    )
  },

  // Savings goals
  setSavingsGoal: async (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<SavingsGoal>> => {
    return handleApiCall(
      async () => {
        const response = await api.post('/savings/goal', goal)
        return response.data
      },
      () => mockApiClient.setSavingsGoal(goal)
    )
  },

  getSavingsGoal: async (userId: string): Promise<ApiResponse<SavingsGoal>> => {
    return handleApiCall(
      async () => {
        const response = await api.get(`/savings/goal/${userId}`)
        return response.data
      },
      () => mockApiClient.getSavingsGoal(userId)
    )
  },

  updateSavingsGoal: async (userId: string, goal: Partial<SavingsGoal>): Promise<ApiResponse<SavingsGoal>> => {
    return handleApiCall(
      async () => {
        const response = await api.put(`/savings/goal/${userId}`, goal)
        return response.data
      },
      () => mockApiClient.updateSavingsGoal(userId, goal)
    )
  },

  // Chat
  sendChatMessage: async (message: string, userId: string): Promise<ApiResponse<ChatMessage>> => {
    return handleApiCall(
      async () => {
        const response = await api.post('/chat/message', { message, userId })
        return response.data
      },
      () => mockApiClient.sendChatMessage(message, userId)
    )
  },

  getChatHistory: async (userId: string): Promise<ApiResponse<ChatMessage[]>> => {
    return handleApiCall(
      async () => {
        const response = await api.get(`/chat/history/${userId}`)
        return response.data
      },
      () => mockApiClient.getChatHistory(userId)
    )
  },

  // Daily analysis
  getDailyAnalysis: async (userId: string, date: string): Promise<ApiResponse<DailyAnalysis>> => {
    return handleApiCall(
      async () => {
        const response = await api.get(`/analysis/daily/${userId}`, { params: { date } })
        return response.data
      },
      () => mockApiClient.getDailyAnalysis(userId, date)
    )
  },

  // LLM integration
  generateSavingsPlan: async (income: number, savingsGoal: number, spendingHistory: SpendingEntry[]): Promise<ApiResponse<string>> => {
    return handleApiCall(
      async () => {
        const response = await api.post('/llm/savings-plan', {
          income,
          savingsGoal,
          spendingHistory
        })
        return response.data
      },
      () => mockApiClient.generateSavingsPlan(income, savingsGoal, spendingHistory)
    )
  },

  analyzeSpendingHabits: async (quizAnswers: any[]): Promise<ApiResponse<string>> => {
    return handleApiCall(
      async () => {
        const response = await api.post('/llm/analyze-habits', { quizAnswers })
        return response.data
      },
      () => mockApiClient.analyzeSpendingHabits(quizAnswers)
    )
  },

  getFinancialAdvice: async (message: string, userContext: any): Promise<ApiResponse<string>> => {
    return handleApiCall(
      async () => {
        const response = await api.post('/llm/advice', { message, userContext })
        return response.data
      },
      () => mockApiClient.getFinancialAdvice(message, userContext)
    )
  }
}

export default apiClient
