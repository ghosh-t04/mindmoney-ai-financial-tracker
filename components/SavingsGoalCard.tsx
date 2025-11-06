'use client'

import { SavingsGoal } from '@/types'
import { 
  CurrencyDollarIcon, 
  TargetIcon, 
  TrendingUpIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface SavingsGoalCardProps {
  goal: SavingsGoal
  onEdit: () => void
}

export function SavingsGoalCard({ goal, onEdit }: SavingsGoalCardProps) {
  const savingsPercentage = (goal.monthlySavingsGoal / goal.monthlyIncome) * 100
  const remainingIncome = goal.monthlyIncome - goal.monthlySavingsGoal
  const dailyBudget = remainingIncome / 30

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Savings Goal</h3>
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mx-auto mb-2">
            <CurrencyDollarIcon className="w-6 h-6 text-primary-600" />
          </div>
          <p className="text-sm text-gray-600">Monthly Income</p>
          <p className="text-xl font-bold text-gray-900">
            ${goal.monthlyIncome.toLocaleString()}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg mx-auto mb-2">
            <TargetIcon className="w-6 h-6 text-success-600" />
          </div>
          <p className="text-sm text-gray-600">Savings Goal</p>
          <p className="text-xl font-bold text-success-600">
            ${goal.monthlySavingsGoal.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            {savingsPercentage.toFixed(1)}% of income
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
            <TrendingUpIcon className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600">Daily Budget</p>
          <p className="text-xl font-bold text-blue-600">
            ${dailyBudget.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500">Available to spend</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Your Savings Plan</h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {goal.savingsPlan}
        </p>
      </div>
    </div>
  )
}
