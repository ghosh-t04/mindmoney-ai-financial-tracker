import { ApiResponse, QuizResponse, SpendingEntry, SavingsGoal, ChatMessage, DailyAnalysis } from '@/types'

// Mock data for development
const mockQuizResponse: QuizResponse = {
  id: 'mock-quiz-1',
  userId: 'mock-user-1',
  answers: [
    { questionId: 'q1', answer: 'A' },
    { questionId: 'q2', answer: 'B' },
    { questionId: 'q3', answer: 'C' }
  ],
  analysis: 'Based on your responses, you show strong financial awareness and good spending habits. You tend to be cautious with money and prefer to save rather than spend impulsively. This is a great foundation for building wealth over time.',
  createdAt: new Date().toISOString()
}

const mockSpendingEntries: SpendingEntry[] = [
  {
    id: 'entry-1',
    userId: 'mock-user-1',
    date: '2025-09-13',
    amount: 25.50,
    description: 'Coffee and breakfast',
    category: 'Food & Dining',
    isNecessary: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'entry-2',
    userId: 'mock-user-1',
    date: '2025-09-13',
    amount: 120.00,
    description: 'Grocery shopping',
    category: 'Food & Dining',
    isNecessary: true,
    createdAt: new Date().toISOString()
  }
]

const mockSavingsGoal: SavingsGoal = {
  id: 'goal-1',
  userId: 'mock-user-1',
  monthlyIncome: 5000,
  monthlySavingsGoal: 1000,
  savingsPlan: 'Based on your income and spending patterns, you can save $1000 per month by reducing discretionary spending by 20% and increasing your emergency fund contributions.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

const mockChatMessages: ChatMessage[] = [
  {
    id: 'chat-1',
    userId: 'mock-user-1',
    message: 'How can I save more money?',
    isUser: true,
    timestamp: new Date().toISOString()
  },
  {
    id: 'chat-2',
    userId: 'mock-user-1',
    message: 'Great question! Based on your spending patterns, I recommend focusing on reducing discretionary expenses like dining out and entertainment. You could save an additional $200-300 per month by cooking more at home and finding free entertainment options.',
    isUser: false,
    timestamp: new Date().toISOString()
  }
]

const mockDailyAnalysis: DailyAnalysis = {
  date: '2025-09-13',
  totalSpent: 145.50,
  necessarySpent: 120.00,
  unnecessarySpent: 25.50,
  onTrack: true,
  analysis: 'Today you spent $145.50 total, with $120 on necessary expenses (groceries) and $25.50 on discretionary items (coffee). This is a good balance - you\'re meeting your needs while still allowing for some treats. Consider reducing coffee purchases to save an extra $15-20 per week.',
  recommendations: [
    'Consider making coffee at home 2-3 times per week to save $15-20',
    'Set a daily spending limit of $30 for discretionary items',
    'Track your spending in real-time to avoid overspending',
    'Consider meal planning to reduce grocery costs'
  ]
}

// Mock API client that simulates the real API
export const mockApiClient = {
  // Quiz endpoints
  submitQuiz: async (answers: any[]): Promise<ApiResponse<QuizResponse>> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Generate dynamic analysis based on answers
    const analysisTemplates = [
      "Based on your responses, you demonstrate excellent financial awareness and strong money management skills. Your approach to budgeting and saving shows you're well-prepared for long-term financial success.",
      "Your answers indicate a balanced approach to personal finance. You show good understanding of spending priorities while maintaining healthy saving habits. Consider automating your savings to build wealth more consistently.",
      "You have a solid foundation in financial literacy. Your responses suggest you're thoughtful about money decisions. Focus on building an emergency fund and diversifying your investment portfolio for better financial security.",
      "Your financial mindset shows careful consideration of money matters. You understand the importance of budgeting and saving. Work on reducing any high-interest debt and consider consulting a financial advisor for advanced strategies.",
      "Based on your responses, you're developing strong financial habits. Your awareness of spending patterns is good. Focus on creating specific financial goals and tracking your progress regularly to achieve them."
    ]
    
    const randomAnalysis = analysisTemplates[Math.floor(Math.random() * analysisTemplates.length)]
    
    return {
      success: true,
      data: {
        ...mockQuizResponse,
        answers,
        analysis: randomAnalysis
      }
    }
  },

  getQuizAnalysis: async (userId: string): Promise<ApiResponse<QuizResponse>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // For new users (not mock-user-1), return empty result to indicate no quiz completed
    if (userId !== 'mock-user-1') {
      return {
        success: false,
        error: 'Quiz not found'
      }
    }
    
    return {
      success: true,
      data: mockQuizResponse
    }
  },

  // Spending entries
  addSpendingEntry: async (entry: Omit<SpendingEntry, 'id' | 'createdAt'>): Promise<ApiResponse<SpendingEntry>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const newEntry: SpendingEntry = {
      ...entry,
      id: `entry-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    mockSpendingEntries.push(newEntry)
    return {
      success: true,
      data: newEntry
    }
  },

  getSpendingEntries: async (userId: string, date?: string): Promise<ApiResponse<SpendingEntry[]>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    let entries = mockSpendingEntries
    if (date) {
      entries = entries.filter(entry => entry.date === date)
    }
    return {
      success: true,
      data: entries
    }
  },

  updateSpendingEntry: async (id: string, entry: Partial<SpendingEntry>): Promise<ApiResponse<SpendingEntry>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const index = mockSpendingEntries.findIndex(e => e.id === id)
    if (index === -1) {
      throw new Error('Entry not found')
    }
    mockSpendingEntries[index] = { ...mockSpendingEntries[index], ...entry }
    return {
      success: true,
      data: mockSpendingEntries[index]
    }
  },

  deleteSpendingEntry: async (id: string): Promise<ApiResponse<void>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    const index = mockSpendingEntries.findIndex(e => e.id === id)
    if (index !== -1) {
      mockSpendingEntries.splice(index, 1)
    }
    return {
      success: true,
      data: undefined
    }
  },

  // Savings goals
  setSavingsGoal: async (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<SavingsGoal>> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const newGoal: SavingsGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      savingsPlan: `Based on your income of $${goal.monthlyIncome} and savings goal of $${goal.monthlySavingsGoal}, I recommend creating a budget that allocates 20% to savings, 50% to necessities, and 30% to discretionary spending.`
    }
    Object.assign(mockSavingsGoal, newGoal)
    return {
      success: true,
      data: newGoal
    }
  },

  getSavingsGoal: async (userId: string): Promise<ApiResponse<SavingsGoal>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // For new users (not mock-user-1), return empty result to indicate no savings goal set
    if (userId !== 'mock-user-1') {
      return {
        success: false,
        error: 'Savings goal not found'
      }
    }
    
    return {
      success: true,
      data: mockSavingsGoal
    }
  },

  updateSavingsGoal: async (userId: string, goal: Partial<SavingsGoal>): Promise<ApiResponse<SavingsGoal>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    Object.assign(mockSavingsGoal, goal, { updatedAt: new Date().toISOString() })
    return {
      success: true,
      data: mockSavingsGoal
    }
  },

  // Chat
  sendChatMessage: async (message: string, userId: string): Promise<ApiResponse<ChatMessage>> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const userMessage: ChatMessage = {
      id: `chat-${Date.now()}`,
      userId,
      message,
      isUser: true,
      timestamp: new Date().toISOString()
    }
    mockChatMessages.push(userMessage)
    
    // Generate a mock response
    const botMessage: ChatMessage = {
      id: `chat-${Date.now() + 1}`,
      userId,
      message: `I understand you're asking about "${message}". Based on your financial profile, here's my advice: Focus on building an emergency fund of 3-6 months expenses, then work on increasing your savings rate to 20% of your income.`,
      isUser: false,
      timestamp: new Date().toISOString()
    }
    mockChatMessages.push(botMessage)
    
    return {
      success: true,
      data: botMessage
    }
  },

  getChatHistory: async (userId: string): Promise<ApiResponse<ChatMessage[]>> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      success: true,
      data: mockChatMessages
    }
  },

  // Daily analysis
  getDailyAnalysis: async (userId: string, date: string): Promise<ApiResponse<DailyAnalysis>> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      success: true,
      data: {
        ...mockDailyAnalysis,
        date,
        analysis: `Analysis for ${date}: You spent $145.50 today. This is ${145.50 > 100 ? 'above' : 'below'} your daily budget target. Consider ${145.50 > 100 ? 'reducing' : 'maintaining'} discretionary spending.`,
        recommendations: [
          'Consider making coffee at home 2-3 times per week to save $15-20',
          'Set a daily spending limit of $30 for discretionary items',
          'Track your spending in real-time to avoid overspending',
          'Consider meal planning to reduce grocery costs'
        ]
      }
    }
  },

  // LLM integration
  generateSavingsPlan: async (income: number, savingsGoal: number, spendingHistory: SpendingEntry[]): Promise<ApiResponse<string>> => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return {
      success: true,
      data: `Based on your income of $${income} and savings goal of $${savingsGoal}, here's a personalized savings plan: 1) Create an emergency fund of $${Math.round(income * 3)}, 2) Allocate 20% of income to savings, 3) Track daily expenses to identify savings opportunities.`
    }
  },

  analyzeSpendingHabits: async (quizAnswers: any[]): Promise<ApiResponse<string>> => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    return {
      success: true,
      data: `Your spending habits analysis: You show ${quizAnswers.length > 2 ? 'strong' : 'moderate'} financial discipline. Focus on ${quizAnswers[0] === 'A' ? 'maintaining' : 'improving'} your budgeting skills and consider automating your savings.`
    }
  },

  getFinancialAdvice: async (message: string, userContext: any): Promise<ApiResponse<string>> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return {
      success: true,
      data: `Financial advice for "${message}": Start by building an emergency fund, then focus on high-yield savings accounts and consider low-cost index funds for long-term growth.`
    }
  }
}

export default mockApiClient
