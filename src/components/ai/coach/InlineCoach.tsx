'use client';

/**
 * AI-002: Inline Coach
 *
 * Detects when users are stuck and provides contextual next-step suggestions.
 * This is a real-time guidance system integrated into the book editor.
 *
 * Features:
 * - Analyze book progress and identify incomplete areas
 * - Generate contextual suggestions based on current state
 * - Dismiss suggestions and track user preferences
 * - Non-intrusive sidebar component
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BookProgress {
  totalChapters: number;
  completedChapters: number;
  totalWords: number;
  hasOutline: boolean;
  hasCover: boolean;
  hasRendition: boolean;
  lastEditedAt?: string;
  daysSinceLastEdit: number;
  wordCountTarget: number;
}

export interface CoachSuggestion {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  reason: string; // Why this suggestion (for debugging)
}

interface InlineCoachProps {
  bookId: string;
  progress: BookProgress;
  onDismiss?: (suggestionId: string) => void;
}

/**
 * Detect stuck patterns and generate suggestions
 */
function detectStuckPatterns(progress: BookProgress): CoachSuggestion[] {
  const suggestions: CoachSuggestion[] = [];
  const progressPercent = (progress.totalWords / progress.wordCountTarget) * 100;

  // Pattern 1: User hasn't edited in 3+ days
  if (progress.daysSinceLastEdit >= 3) {
    suggestions.push({
      id: 'stalled-editing',
      priority: 'high',
      title: 'Get Back to Writing',
      description: `You haven't edited in ${progress.daysSinceLastEdit} days. Let's get you back on track!`,
      actionLabel: 'Resume Writing',
      actionUrl: `/books/${progress}`, // Will be set properly by parent
      reason: `No edits for ${progress.daysSinceLastEdit} days`,
    });
  }

  // Pattern 2: Outline exists but no chapters created
  if (progress.hasOutline && progress.totalChapters === 0) {
    suggestions.push({
      id: 'outline-to-content',
      priority: 'high',
      title: 'Start Writing Your Chapters',
      description:
        'Your outline is ready! Time to write your first chapter. Start with a rough draft—you can always edit later.',
      actionLabel: 'Create First Chapter',
      actionUrl: `/books/${progress}?action=new-chapter`,
      reason: 'Has outline but no chapters written',
    });
  }

  // Pattern 3: Progress is stalled at certain point
  if (progressPercent > 25 && progressPercent < 75 && progress.daysSinceLastEdit >= 2) {
    suggestions.push({
      id: 'mid-project-slump',
      priority: 'high',
      title: `You're ${Math.round(progressPercent)}% Done—Keep Going!`,
      description:
        'You're past the hardest part. Push through the middle and you'll have momentum for the finish.',
      actionLabel: 'View Progress',
      actionUrl: `/books/${progress}`,
      reason: `Mid-project progress (${Math.round(progressPercent)}%) with recent inactivity`,
    });
  }

  // Pattern 4: Book is nearly complete but no cover
  if (progressPercent > 85 && !progress.hasCover) {
    suggestions.push({
      id: 'missing-cover',
      priority: 'medium',
      title: 'Design Your Cover',
      description:
        'Your manuscript is nearly ready! A great cover is the final touch to make it print-ready.',
      actionLabel: 'Create Cover',
      actionUrl: `/books/${progress}?action=create-cover`,
      reason: 'Book is 85%+ complete but has no cover',
    });
  }

  // Pattern 5: Book is complete but no rendition
  if (
    progressPercent >= 100 &&
    progress.hasOutline &&
    progress.totalChapters > 0 &&
    !progress.hasRendition
  ) {
    suggestions.push({
      id: 'ready-to-publish',
      priority: 'high',
      title: 'Generate Print-Ready PDF',
      description:
        'Your book looks complete! Generate a print-ready PDF so you can preview and order a proof copy.',
      actionLabel: 'Generate PDF',
      actionUrl: `/books/${progress}?action=rendition`,
      reason: 'Book is complete but no rendition generated',
    });
  }

  // Pattern 6: Rendition exists but no order
  if (progress.hasRendition && !progress.hasOrder) {
    suggestions.push({
      id: 'order-proof-copy',
      priority: 'medium',
      title: 'Order Your Proof Copy',
      description:
        "There's nothing like seeing your book in print! Order a proof copy to check quality before bulk orders.",
      actionLabel: 'Order Now',
      actionUrl: `/books/${progress}?action=order`,
      reason: 'Has rendition but no orders placed',
    });
  }

  // Pattern 7: Empty book (needs direction)
  if (progress.totalWords === 0 && progress.totalChapters === 0) {
    suggestions.push({
      id: 'get-started',
      priority: 'high',
      title: 'Let's Get Started',
      description:
        'Every great book starts with an outline. Create chapters first, then write. You've got this!',
      actionLabel: 'Create First Chapter',
      actionUrl: `/books/${progress}?action=new-chapter`,
      reason: 'Brand new empty book',
    });
  }

  return suggestions.slice(0, 2); // Show top 2 suggestions at a time
}

export function InlineCoach({ bookId, progress, onDismiss }: InlineCoachProps) {
  const [suggestions, setSuggestions] = useState<CoachSuggestion[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Generate suggestions based on progress
  const generateSuggestions = useCallback(() => {
    setLoading(true);
    try {
      const allSuggestions = detectStuckPatterns(progress);
      // Filter out dismissed suggestions
      const filtered = allSuggestions.filter((s) => !dismissedIds.has(s.id));
      setSuggestions(filtered);
    } finally {
      setLoading(false);
    }
  }, [progress, dismissedIds]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const handleDismiss = (suggestionId: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(suggestionId);
    setDismissedIds(newDismissed);
    onDismiss?.(suggestionId);
  };

  const handleAction = (actionUrl: string) => {
    // Replace placeholder with actual book ID
    const url = actionUrl.replace(progress, bookId);
    window.location.href = url;
  };

  if (suggestions.length === 0) {
    return null;
  }

  const suggestion = suggestions[0];
  const priorityColor = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-amber-50 border-amber-200',
    low: 'bg-blue-50 border-blue-200',
  };

  const priorityIcon = {
    high: AlertCircle,
    medium: Lightbulb,
    low: BookOpen,
  };

  const IconComponent = priorityIcon[suggestion.priority];

  return (
    <div className="space-y-2">
      <div className={cn('rounded-lg border p-4', priorityColor[suggestion.priority])}>
        <div className="flex items-start gap-3">
          <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm">{suggestion.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {suggestion.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(suggestion.id)}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">
                {suggestion.priority === 'high'
                  ? "Don't Miss This"
                  : suggestion.priority === 'medium'
                    ? 'Recommended'
                    : 'Optional'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(suggestion.actionUrl)}
                className="text-xs h-7"
              >
                {suggestion.actionLabel}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {suggestions.length > 1 && (
        <div className="text-xs text-muted-foreground text-center">
          {suggestions.length - 1} more suggestion{suggestions.length - 1 !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
}
