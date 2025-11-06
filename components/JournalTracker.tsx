'use client'

import { useState, useEffect } from 'react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '@/lib/api'
import { SpendingEntry, SavingsGoal, QuizResponse, DailyAnalysis } from '@/types'
import toast from 'react-hot-toast'
import { LoadingSpinner } from './LoadingSpinner'
import { SavingsGoalModal } from './SavingsGoalModal'

interface JournalTrackerProps {
  userId: string
  quizResponse: QuizResponse | null
  savingsGoal: SavingsGoal | null
  onSavingsGoalSet: (goal: SavingsGoal) => void
}

export function JournalTracker({ userId, quizResponse, savingsGoal, onSavingsGoalSet }: JournalTrackerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState<SpendingEntry[]>([])
  const [dailyAnalysis, setDailyAnalysis] = useState<DailyAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showSavingsModal, setShowSavingsModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<SpendingEntry | null>(null)

  useEffect(() => {
    loadDailyEntries()
    loadDailyAnalysis()
  }, [selectedDate, userId])

  const loadDailyEntries = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getSpendingEntries(userId, format(selectedDate, 'yyyy-MM-dd'))
      if (response.success && response.data) {
        setEntries(response.data)
      }
    } catch (error) {
      console.error('Error loading entries:', error)
      toast.error('Failed to load spending entries')
    } finally {
      setIsLoading(false)
    }
  }

  const loadDailyAnalysis = async () => {
    try {
      const response = await apiClient.getDailyAnalysis(userId, format(selectedDate, 'yyyy-MM-dd'))
      if (response.success && response.data) {
        setDailyAnalysis(response.data)
      }
    } catch (error) {
      console.error('Error loading daily analysis:', error)
    }
  }

  const handleAddEntry = async (entryData: Omit<SpendingEntry, 'id' | 'userId' | 'createdAt'>) => {
    try {
      const response = await apiClient.addSpendingEntry({
        ...entryData,
        userId,
        date: format(selectedDate, 'yyyy-MM-dd')
      })
      
      if (response.success && response.data) {
        setEntries(prev => [...prev, response.data!])
        setShowAddEntry(false)
        toast.success('Spending entry added successfully!')
        loadDailyAnalysis() // Refresh analysis
      } else {
        toast.error(response.error || 'Failed to add entry')
      }
    } catch (error) {
      console.error('Error adding entry:', error)
      toast.error('Failed to add spending entry')
    }
  }

  const handleUpdateEntry = async (id: string, updates: Partial<SpendingEntry>) => {
    try {
      const response = await apiClient.updateSpendingEntry(id, updates)
      
      if (response.success && response.data) {
        setEntries(prev => prev.map(entry => 
          entry.id === id ? response.data! : entry
        ))
        setEditingEntry(null)
        toast.success('Entry updated successfully!')
        loadDailyAnalysis() // Refresh analysis
      } else {
        toast.error(response.error || 'Failed to update entry')
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      toast.error('Failed to update entry')
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await apiClient.deleteSpendingEntry(id)
      
      if (response.success) {
        setEntries(prev => prev.filter(entry => entry.id !== id))
        toast.success('Entry deleted successfully!')
        loadDailyAnalysis() // Refresh analysis
      } else {
        toast.error(response.error || 'Failed to delete entry')
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error('Failed to delete entry')
    }
  }

  const totalSpent = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
  const necessarySpent = entries.filter(e => e.isNecessary).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
  const unnecessarySpent = totalSpent - necessarySpent

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Journal Tracker</h2>
          <p className="text-gray-600">Track your daily expenses and stay on top of your financial goals</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowSavingsModal(true)}
            className="btn-secondary"
          >
            Set Savings Goal
          </button>
          <button
            onClick={() => setShowAddEntry(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="input-field"
          />
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${(Number(totalSpent) || 0).toFixed(2)}</p>
            </div>
            <CurrencyDollarIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Necessary</p>
              <p className="text-2xl font-bold text-success-600">${(Number(necessarySpent) || 0).toFixed(2)}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-success-400" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unnecessary</p>
              <p className="text-2xl font-bold text-danger-600">${(Number(unnecessarySpent) || 0).toFixed(2)}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-danger-400" />
          </div>
        </div>
      </div>

      {/* Daily Analysis */}
      {dailyAnalysis && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Analysis</h3>
          <div className={`p-4 rounded-lg ${
            dailyAnalysis.onTrack ? 'bg-success-50 border border-success-200' : 'bg-warning-50 border border-warning-200'
          }`}>
            <div className="flex items-start space-x-3">
              {dailyAnalysis.onTrack ? (
                <CheckCircleIcon className="w-6 h-6 text-success-600 mt-0.5" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-warning-600 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${
                  dailyAnalysis.onTrack ? 'text-success-900' : 'text-warning-900'
                }`}>
                  {dailyAnalysis.onTrack ? 'On Track!' : 'Needs Attention'}
                </p>
                <p className={`text-sm mt-1 ${
                  dailyAnalysis.onTrack ? 'text-success-700' : 'text-warning-700'
                }`}>
                  {dailyAnalysis.analysis}
                </p>
                {dailyAnalysis.recommendations.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {dailyAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className={`text-sm ${
                        dailyAnalysis.onTrack ? 'text-success-700' : 'text-warning-700'
                      }`}>
                        • {rec}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spending Entries */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Spending Entries for {format(selectedDate, 'MMMM dd, yyyy')}
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <CurrencyDollarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No spending entries for this date</p>
            <p className="text-sm text-gray-400">Add your first entry to start tracking!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{entry.description}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      entry.isNecessary 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-danger-100 text-danger-800'
                    }`}>
                      {entry.isNecessary ? 'Necessary' : 'Unnecessary'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{entry.category}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold text-gray-900">
                    ${(Number(entry.amount) || 0).toFixed(2)}
                  </span>
                  <button
                    onClick={() => setEditingEntry(entry)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1 text-gray-400 hover:text-danger-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddEntry && (
        <SpendingEntryModal
          onClose={() => setShowAddEntry(false)}
          onSave={handleAddEntry}
        />
      )}

      {editingEntry && (
        <SpendingEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={(data) => handleUpdateEntry(editingEntry.id, data)}
        />
      )}

      {showSavingsModal && (
        <SavingsGoalModal
          userId={userId}
          currentGoal={savingsGoal}
          onClose={() => setShowSavingsModal(false)}
          onSave={onSavingsGoalSet}
        />
      )}
    </div>
  )
}

// Spending Entry Modal Component
function SpendingEntryModal({ 
  entry, 
  onClose, 
  onSave 
}: { 
  entry?: SpendingEntry
  onClose: () => void
  onSave: (data: Omit<SpendingEntry, 'id' | 'userId' | 'createdAt'>) => void
}) {
  const [formData, setFormData] = useState({
    description: entry?.description || '',
    amount: entry?.amount || 0,
    category: entry?.category || '',
    isNecessary: entry?.isNecessary ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.description && formData.amount > 0) {
      onSave(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {entry ? 'Edit Entry' : 'Add Spending Entry'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input-field"
              placeholder="What did you spend on?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className="input-field"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select category</option>
              <option value="Food & Dining">Food & Dining</option>
              <option value="Transportation">Transportation</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Shopping">Shopping</option>
              <option value="Bills & Utilities">Bills & Utilities</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isNecessary"
              checked={formData.isNecessary}
              onChange={(e) => setFormData(prev => ({ ...prev, isNecessary: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isNecessary" className="text-sm font-medium text-gray-700">
              This was a necessary expense
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {entry ? 'Update' : 'Add'} Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
