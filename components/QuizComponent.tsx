'use client'

import { useState } from 'react'
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { apiClient } from '@/lib/api'
import { QuizResponse, QuizQuestion } from '@/types'
import toast from 'react-hot-toast'
import { LoadingSpinner } from './LoadingSpinner'

interface QuizComponentProps {
  userId: string
  onComplete: (response: QuizResponse) => void
}

const quizQuestions: QuizQuestion[] = [
  {
    id: '1',
    question: 'How often do you track your expenses?',
    options: ['Daily', 'Weekly', 'Monthly', 'Rarely or never'],
    category: 'tracking_habits'
  },
  {
    id: '2',
    question: 'What is your biggest spending category?',
    options: ['Food & Dining', 'Entertainment', 'Shopping', 'Bills & Utilities'],
    category: 'spending_patterns'
  },
  {
    id: '3',
    question: 'How do you typically make purchasing decisions?',
    options: ['Impulse buying', 'Research and compare', 'Ask friends/family', 'Budget-based decisions'],
    category: 'decision_making'
  },
  {
    id: '4',
    question: 'What motivates you to save money?',
    options: ['Emergency fund', 'Future goals', 'Retirement', 'Major purchases'],
    category: 'savings_motivation'
  },
  {
    id: '5',
    question: 'How do you handle unexpected expenses?',
    options: ['Use credit card', 'Dip into savings', 'Cut other expenses', 'Borrow from family/friends'],
    category: 'financial_management'
  },
  {
    id: '6',
    question: 'What is your biggest financial challenge?',
    options: ['Sticking to a budget', 'Saving consistently', 'Avoiding debt', 'Planning for the future'],
    category: 'challenges'
  }
]

export function QuizComponent({ userId, onComplete }: QuizComponentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleNext = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const quizAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
        category: quizQuestions.find(q => q.id === questionId)?.category || 'general'
      }))

      const response = await apiClient.submitQuiz(quizAnswers)
      
      if (response.success && response.data) {
        onComplete(response.data)
      } else {
        toast.error(response.error || 'Failed to submit quiz')
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
      toast.error('Failed to submit quiz. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentQ = quizQuestions[currentQuestion]
  const isAnswered = answers[currentQ.id]
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestion + 1} of {quizQuestions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="card">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          {currentQ.question}
        </h2>

        <div className="space-y-3 mb-8">
          {currentQ.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(currentQ.id, option)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                answers[currentQ.id] === option
                  ? 'border-primary-500 bg-primary-50 text-primary-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option}</span>
                {answers[currentQ.id] === option && (
                  <CheckCircleIcon className="w-5 h-5 text-primary-600" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={!isAnswered || isSubmitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>{currentQuestion === quizQuestions.length - 1 ? 'Complete Quiz' : 'Next'}</span>
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quiz Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">💡 Quiz Tips</h3>
        <p className="text-sm text-blue-700">
          Be honest with your answers! This helps our AI provide more accurate insights and personalized recommendations for your financial journey.
        </p>
      </div>
    </div>
  )
}
