'use client'

import { useState } from 'react'
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { QuizResponse } from '@/types'

interface QuizAnalysisModalProps {
  analysis: string
  onNext: () => void
}

export function QuizAnalysisModal({ analysis, onNext }: QuizAnalysisModalProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleNext = () => {
    setIsVisible(false)
    onNext()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 bg-success-100 rounded-full mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quiz Complete! 🎉
          </h2>
          <p className="text-gray-600">
            Here's your personalized spending analysis
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Your Analysis</h3>
          <p className="text-blue-800 leading-relaxed">
            {analysis}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">What's Next?</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Set your monthly income and savings goals</li>
            <li>• Start tracking your daily expenses</li>
            <li>• Get AI-powered insights and recommendations</li>
            <li>• Chat with your personal financial advisor</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            className="btn-primary flex items-center space-x-2"
          >
            <span>Start Tracking</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
