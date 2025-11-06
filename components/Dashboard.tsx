'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QuizComponent } from './QuizComponent'
import { JournalTracker } from './JournalTracker'
import { ChatInterface } from './ChatInterface'
import { Header } from './Header'
import { LoadingSpinner } from './LoadingSpinner'
import { apiClient } from '@/lib/api'
import { QuizResponse, SavingsGoal } from '@/types'
import toast from 'react-hot-toast'

interface DashboardProps {
  user: any // AWS Amplify user object
  onSignOut: () => void
}

type DashboardStep = 'quiz' | 'journal' | 'complete'

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [currentStep, setCurrentStep] = useState<DashboardStep>('quiz')
  const [isLoading, setIsLoading] = useState(true)
  const [quizResponse, setQuizResponse] = useState<QuizResponse | null>(null)
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal | null>(null)

  useEffect(() => {
    checkUserProgress()
  }, [user])

  const checkUserProgress = async () => {
    try {
      setIsLoading(true)
      
      // Debug: Log user object to understand its structure
      console.log('User object:', user)
      
      // Get the user ID from Cognito user object
      const userId = user.username || user.sub || user.userId
      console.log('Extracted userId:', userId)
      
      // Check if user has completed quiz
      const quizResult = await apiClient.getQuizAnalysis(userId)
      console.log('Quiz result:', quizResult)
      
      if (quizResult.success && quizResult.data) {
        setQuizResponse(quizResult.data)
        setCurrentStep('journal')
      }

      // Check if user has set savings goal
      const savingsResult = await apiClient.getSavingsGoal(userId)
      console.log('Savings result:', savingsResult)
      
      if (savingsResult.success && savingsResult.data) {
        setSavingsGoal(savingsResult.data)
      }
    } catch (error) {
      console.error('Error checking user progress:', error)
      toast.error('Failed to load user data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuizComplete = (response: QuizResponse) => {
    setQuizResponse(response)
    setCurrentStep('journal')
    toast.success('Quiz completed! Let\'s start tracking your expenses.')
  }

  const handleSavingsGoalSet = (goal: SavingsGoal) => {
    setSavingsGoal(goal)
    toast.success('Savings goal set successfully!')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onSignOut={onSignOut} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'quiz' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to MindMoney! 💰
              </h1>
              <p className="text-xl text-gray-600">
                Let's start by understanding your spending habits with a quick quiz
              </p>
            </div>
            <QuizComponent 
              userId={user.username || user.sub || user.userId} 
              onComplete={handleQuizComplete}
            />
          </div>
        )}

        {currentStep === 'journal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <JournalTracker 
                userId={user.username || user.sub || user.userId}
                quizResponse={quizResponse}
                savingsGoal={savingsGoal}
                onSavingsGoalSet={handleSavingsGoalSet}
              />
            </div>
            <div className="lg:col-span-1">
              <ChatInterface 
                userId={user.username || user.sub || user.userId}
                userContext={{
                  quizResponse,
                  savingsGoal,
                  name: user.signInDetails?.loginId || 'User'
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
