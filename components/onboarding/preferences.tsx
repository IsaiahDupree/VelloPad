/**
 * PM-011: User Preference Self-Select
 *
 * Onboarding component for users to select their preferences
 * Enables culture-matching segmentation
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { updateUserInterests } from '@/lib/auth/signup-tenant-tracking'

export const AVAILABLE_INTERESTS = [
  { id: 'faith', label: 'Faith & Spirituality', icon: '✨' },
  { id: 'business', label: 'Business & Entrepreneurship', icon: '💼' },
  { id: 'personal-growth', label: 'Personal Growth & Development', icon: '🌱' },
  { id: 'fitness', label: 'Fitness & Health', icon: '💪' },
  { id: 'education', label: 'Education & Learning', icon: '📚' },
  { id: 'creative', label: 'Creative & Arts', icon: '🎨' },
  { id: 'family', label: 'Family & Parenting', icon: '👨‍👩‍👧‍👦' },
  { id: 'cooking', label: 'Cooking & Recipes', icon: '🍳' },
  { id: 'travel', label: 'Travel & Adventure', icon: '✈️' },
  { id: 'memoir', label: 'Memoir & Life Stories', icon: '📖' },
  { id: 'fiction', label: 'Fiction & Storytelling', icon: '📚' },
  { id: 'community', label: 'Community & Social Impact', icon: '🤝' },
]

interface UserPreferencesProps {
  userId: string
  onComplete?: (interests: string[]) => void
  isRequired?: boolean
}

export function UserPreferences({
  userId,
  onComplete,
  isRequired = false,
}: UserPreferencesProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    )
  }

  const handleSubmit = async () => {
    if (!isRequired && selectedInterests.length === 0) {
      // Allow skipping if not required
      onComplete?.([])
      return
    }

    if (selectedInterests.length === 0) {
      setError('Please select at least one interest')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const success = await updateUserInterests(userId, selectedInterests)

      if (success) {
        onComplete?.(selectedInterests)
      } else {
        setError('Failed to save preferences. Please try again.')
      }
    } catch (err) {
      console.error('[PM-011] Error saving preferences:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">What are you interested in?</h2>
        <p className="text-muted-foreground">
          {isRequired
            ? 'Select at least one interest to help us personalize your experience.'
            : 'Select your interests to help us personalize your experience (optional).'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_INTERESTS.map((interest) => (
          <label
            key={interest.id}
            className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
          >
            <Checkbox
              checked={selectedInterests.includes(interest.id)}
              onCheckedChange={() => handleToggleInterest(interest.id)}
              className="mt-0.5"
            />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xl">{interest.icon}</span>
              <span className="font-medium">{interest.label}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          variant="outline"
          onClick={() => onComplete?.(selectedInterests)}
          disabled={isLoading}
        >
          Skip
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || (isRequired && selectedInterests.length === 0)}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
