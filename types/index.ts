export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface QuizAnswer {
  questionId: string
  answer: string
  category: string
}

export interface QuizResponse {
  id: string
  userId: string
  answers: QuizAnswer[]
  analysis: string
  createdAt: string
}

export interface SpendingEntry {
  id: string
  userId: string
  date: string
  amount: number
  description: string
  category: string
  isNecessary: boolean
  createdAt: string
}

export interface SavingsGoal {
  id: string
  userId: string
  monthlyIncome: number
  monthlySavingsGoal: number
  savingsPlan: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  userId: string
  message: string
  isUser: boolean
  timestamp: string
}

export interface DailyAnalysis {
  date: string
  totalSpent: number
  necessarySpent: number
  unnecessarySpent: number
  onTrack: boolean
  analysis: string
  recommendations: string[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  category: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
