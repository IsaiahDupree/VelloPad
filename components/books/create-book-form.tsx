'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Ruler, Layers } from 'lucide-react';

const GENRES = [
  { value: 'fiction', label: 'Fiction' },
  { value: 'non_fiction', label: 'Non-Fiction' },
  { value: 'poetry', label: 'Poetry' },
  { value: 'memoir', label: 'Memoir' },
  { value: 'children', label: "Children's Book" },
  { value: 'young_adult', label: 'Young Adult' },
  { value: 'academic', label: 'Academic' },
  { value: 'cookbook', label: 'Cookbook' },
  { value: 'other', label: 'Other' },
];

const TRIM_SIZES = [
  { value: '5x8', label: '5" × 8" (Digest)', description: 'Classic novel size' },
  { value: '5.5x8.5', label: '5.5" × 8.5" (Trade)', description: 'Standard paperback' },
  { value: '6x9', label: '6" × 9" (Trade)', description: 'Most popular' },
  { value: '7x10', label: '7" × 10"', description: 'Textbooks, workbooks' },
  { value: '8x10', label: '8" × 10"', description: 'Photo books, cookbooks' },
  { value: '8.5x11', label: '8.5" × 11" (Letter)', description: 'Manuals, guides' },
];

const BINDING_TYPES = [
  { value: 'perfect_bound', label: 'Perfect Bound (Paperback)', description: 'Most affordable' },
  { value: 'case_bound', label: 'Case Bound (Hardcover)', description: 'Premium quality' },
  { value: 'saddle_stitch', label: 'Saddle Stitch', description: 'Stapled spine' },
  { value: 'spiral', label: 'Spiral Bound', description: 'Lays flat' },
  { value: 'wire_o', label: 'Wire-O', description: 'Professional notebooks' },
];

interface CreateBookFormProps {
  workspaceId: string;
}

export function CreateBookForm({ workspaceId }: CreateBookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    author: '',
    genre: 'fiction',
    trimSize: '6x9',
    binding: 'perfect_bound',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          title: formData.title,
          subtitle: formData.subtitle || null,
          author: formData.author || null,
          genre: formData.genre,
          trimSize: formData.trimSize,
          binding: formData.binding,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create book');
      }

      const { book } = await response.json();

      // Redirect to book dashboard
      router.push(`/books/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Book Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <CardTitle>Book Details</CardTitle>
          </div>
          <CardDescription>Tell us about your book</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter your book title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle (optional)</Label>
            <Input
              id="subtitle"
              placeholder="Add a subtitle"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="author">Author Name (optional)</Label>
            <Input
              id="author"
              placeholder="Author name"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Select
              value={formData.genre}
              onValueChange={(value) => setFormData({ ...formData, genre: value })}
            >
              <SelectTrigger id="genre">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((genre) => (
                  <SelectItem key={genre.value} value={genre.value}>
                    {genre.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trim Size */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            <CardTitle>Trim Size</CardTitle>
          </div>
          <CardDescription>Choose your book dimensions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {TRIM_SIZES.map((size) => (
            <label
              key={size.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted ${
                formData.trimSize === size.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="trimSize"
                  value={size.value}
                  checked={formData.trimSize === size.value}
                  onChange={(e) => setFormData({ ...formData, trimSize: e.target.value })}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">{size.label}</div>
                  <div className="text-sm text-muted-foreground">{size.description}</div>
                </div>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Binding Type */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            <CardTitle>Binding Type</CardTitle>
          </div>
          <CardDescription>How your book will be bound</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {BINDING_TYPES.map((binding) => (
            <label
              key={binding.value}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted ${
                formData.binding === binding.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="binding"
                  value={binding.value}
                  checked={formData.binding === binding.value}
                  onChange={(e) => setFormData({ ...formData, binding: e.target.value })}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">{binding.label}</div>
                  <div className="text-sm text-muted-foreground">{binding.description}</div>
                </div>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !formData.title} className="flex-1">
          {loading ? 'Creating...' : 'Create Book'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
