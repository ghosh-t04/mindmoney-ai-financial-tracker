'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { SavingsGoal } from '@/types'
import toast from 'react-hot-toast'
import { LoadingSpinner } from './LoadingSpinner'

interface SavingsGoalModalProps {
  userId: string
  currentGoal: SavingsGoal | null
  onClose: () => void
  onSave: (goal: SavingsGoal) => void
}

export function SavingsGoalModal({ userId, currentGoal, onClose, onSave }: SavingsGoalModalProps) {
  const [formData, setFormData] = useState({
    monthlyIncome: currentGoal?.monthlyIncome || 0,
    monthlySavingsGoal: currentGoal?.monthlySavingsGoal || 0
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.monthlyIncome <= 0 || formData.monthlySavingsGoal <= 0) {
      toast.error('Please enter valid income and savings goal amounts')
      return
    }

    if (formData.monthlySavingsGoal >= formData.monthlyIncome) {
      toast.error('Savings goal cannot be greater than or equal to monthly income')
      return
    }

    setIsGenerating(true)
    try {
      // Get recent spending history for context
      const spendingResponse = await apiClient.getSpendingEntries(userId)
      const spendingHistory = spendingResponse.success ? spendingResponse.data || [] : []

      // Generate savings plan using LLM
      const planResponse = await apiClient.generateSavingsPlan(
        formData.monthlyIncome,
        formData.monthlySavingsGoal,
        spendingHistory
      )

      if (planResponse.success && planResponse.data) {
        const goalData: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'> = {
          userId,
          monthlyIncome: formData.monthlyIncome,
          monthlySavingsGoal: formData.monthlySavingsGoal,
          savingsPlan: planResponse.data
        }

        const response = currentGoal 
          ? await apiClient.updateSavingsGoal(userId, goalData)
          : await apiClient.setSavingsGoal(goalData)

        if (response.success && response.data) {
          onSave(response.data)
          onClose()
          toast.success('Savings goal set successfully!')
        } else {
          toast.error(response.error || 'Failed to save savings goal')
        }
      } else {
        toast.error(planResponse.error || 'Failed to generate savings plan')
      }
    } catch (error) {
      console.error('Error setting savings goal:', error)
      toast.error('Failed to set savings goal')
    } finally {
      setIsGenerating(false)
    }
  }

  const savingsPercentage = formData.monthlyIncome > 0 
    ? (formData.monthlySavingsGoal / formData.monthlyIncome) * 100 
    : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {currentGoal ? 'Update Savings Goal' : 'Set Your Savings Goal'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Income
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.monthlyIncome}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                monthlyIncome: parseFloat(e.target.value) || 0 
              }))}
              className="input-field"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Savings Goal
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.monthlySavingsGoal}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                monthlySavingsGoal: parseFloat(e.target.value) || 0 
              }))}
              className="input-field"
              placeholder="0.00"
              required
            />
            {formData.monthlyIncome > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {savingsPercentage.toFixed(1)}% of your monthly income
              </p>
            )}
          </div>

          {/* Savings Tips */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">💡 Savings Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Aim to save 20% of your income</li>
              <li>• Start with a smaller goal and increase gradually</li>
              <li>• Consider the 50/30/20 rule: 50% needs, 30% wants, 20% savings</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary flex items-center space-x-2"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Generating Plan...</span>
                </>
              ) : (
                <span>{currentGoal ? 'Update' : 'Set'} Goal</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
