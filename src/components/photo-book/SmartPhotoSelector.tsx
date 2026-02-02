/**
 * Smart Photo Selector Component (PB-024)
 *
 * UI for AI-powered photo selection and quality analysis
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { PhotoQualityScore, PhotoSelectionResult } from '@/lib/ai/photo-selection';

interface SmartPhotoSelectorProps {
  projectId: string;
  images: Array<{ id: string; url: string }>;
  onSelectionComplete: (selectedIds: string[]) => void;
}

export function SmartPhotoSelector({
  projectId,
  images,
  onSelectionComplete,
}: SmartPhotoSelectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PhotoSelectionResult | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setProgress(0);

    try {
      // Call AI analysis API
      const response = await fetch(`/api/photo-book/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setResult(data.result);

      // Pre-select recommended images
      const recommended = new Set(
        data.result.recommendedImages.map((img: PhotoQualityScore) => img.imageId)
      );
      setSelectedImages(recommended);
    } catch (error) {
      console.error('Error analyzing photos:', error);
      alert('Failed to analyze photos. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setProgress(100);
    }
  };

  const toggleImage = (imageId: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onSelectionComplete(Array.from(selectedImages));
  };

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Smart Photo Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Let AI analyze your photos and automatically remove blurry images and
            duplicates to create the perfect photo book.
          </p>

          {isAnalyzing ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Analyzing {images.length} photos...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          ) : (
            <Button onClick={startAnalysis} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Photos
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Photos</p>
              <p className="text-2xl font-bold">{result.totalImages}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recommended</p>
              <p className="text-2xl font-bold text-green-600">
                {result.recommendedImages.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issues Found</p>
              <p className="text-2xl font-bold text-amber-600">
                {result.rejectedImages.length}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm">
              {selectedImages.size} of {result.totalImages} photos selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedImages(
                    new Set(result.recommendedImages.map((img) => img.imageId))
                  )
                }
              >
                Select Recommended
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedImages(new Set(images.map((img) => img.id)))}
              >
                Select All
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="w-4 h-4 mr-2" />
                Confirm Selection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      <div className="space-y-4">
        {/* Recommended Photos */}
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Recommended Photos ({result.recommendedImages.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {result.recommendedImages.map((photo) => (
              <PhotoCard
                key={photo.imageId}
                photo={photo}
                isSelected={selectedImages.has(photo.imageId)}
                onToggle={() => toggleImage(photo.imageId)}
              />
            ))}
          </div>
        </section>

        {/* Rejected Photos */}
        {result.rejectedImages.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Photos with Issues ({result.rejectedImages.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {result.rejectedImages.map((photo) => (
                <PhotoCard
                  key={photo.imageId}
                  photo={photo}
                  isSelected={selectedImages.has(photo.imageId)}
                  onToggle={() => toggleImage(photo.imageId)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

interface PhotoCardProps {
  photo: PhotoQualityScore;
  isSelected: boolean;
  onToggle: () => void;
}

function PhotoCard({ photo, isSelected, onToggle }: PhotoCardProps) {
  return (
    <div
      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-transparent hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      {/* Image */}
      <div className="aspect-square relative bg-gray-100">
        <img
          src={photo.url}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Selected Indicator */}
        {isSelected ? (
          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
            <Check className="w-4 h-4" />
          </div>
        ) : (
          <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-4 h-4" />
          </div>
        )}

        {/* Quality Score */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="flex items-center justify-between text-white text-xs">
            <span>Quality: {photo.scores.overall.toFixed(0)}%</span>
            {photo.issues.length > 0 && (
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            )}
          </div>
        </div>
      </div>

      {/* Issues */}
      {photo.issues.length > 0 && (
        <div className="p-1 bg-amber-50 flex flex-wrap gap-1">
          {photo.issues.slice(0, 2).map((issue) => (
            <Badge key={issue} variant="outline" className="text-xs">
              {issue}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
