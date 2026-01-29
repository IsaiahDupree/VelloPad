'use client';

/**
 * Campaign Wizard Component (BS-703)
 *
 * Multi-step form for creating broadcast campaigns
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type Step = 'details' | 'segments' | 'compose' | 'review';

export function CampaignWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    segment_ids: [] as string[],
    email_subject: '',
    preview_text: '',
    email_content: '',
  });

  const handleNext = () => {
    const steps: Step[] = ['details', 'segments', 'compose', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // TODO: Get workspace ID from context
      const workspaceId = 'placeholder-workspace-id';

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          workspace_id: workspaceId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create campaign');

      const { campaign } = await response.json();
      router.push(`/admin/campaigns/${campaign.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {['Details', 'Segments', 'Compose', 'Review'].map((label, index) => {
          const steps: Step[] = ['details', 'segments', 'compose', 'review'];
          const isActive = currentStep === steps[index];
          const isCompleted = steps.indexOf(currentStep) > index;

          return (
            <div
              key={label}
              className={`flex items-center ${index < 3 ? 'flex-1' : ''}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isActive || isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 ${
                  isActive ? 'font-semibold' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {index < 3 && (
                <div className="flex-1 h-px bg-border mx-4" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 'details' && 'Campaign Details'}
            {currentStep === 'segments' && 'Select Segments'}
            {currentStep === 'compose' && 'Compose Email'}
            {currentStep === 'review' && 'Review & Create'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Summer Book Launch 2024"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Promote new book features to active users"
                  rows={3}
                />
              </div>
            </div>
          )}

          {currentStep === 'segments' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which user segments should receive this campaign.
              </p>
              <Button variant="outline">Select Segments</Button>
              <div className="text-sm">
                {formData.segment_ids.length > 0 ? (
                  <span>{formData.segment_ids.length} recipient(s)</span>
                ) : (
                  <span className="text-muted-foreground">
                    No segments selected
                  </span>
                )}
              </div>
            </div>
          )}

          {currentStep === 'compose' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.email_subject}
                  onChange={(e) =>
                    setFormData({ ...formData, email_subject: e.target.value })
                  }
                  placeholder="Your book is ready to print!"
                />
              </div>
              <div>
                <Label htmlFor="preview_text">Preview Text</Label>
                <Textarea
                  id="preview_text"
                  name="preview_text"
                  value={formData.preview_text}
                  onChange={(e) =>
                    setFormData({ ...formData, preview_text: e.target.value })
                  }
                  placeholder="Get your professionally printed book delivered..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="email_content">Email Content</Label>
                <Textarea
                  id="email_content"
                  name="email_content"
                  value={formData.email_content}
                  onChange={(e) =>
                    setFormData({ ...formData, email_content: e.target.value })
                  }
                  placeholder="Hi {{first_name}},&#10;&#10;Your book is ready..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Available variables: {'{'}
                  {'{'}first_name{'}'}
                  {'}'}, {'{'}
                  {'{'}last_name{'}'}
                  {'}'}, {'{'}
                  {'{'}email{'}'}
                  {'}'}, {'{'}
                  {'{'}book_title{'}'}
                  {'}'}
                </p>
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Campaign Summary</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{formData.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Recipients</dt>
                    <dd className="font-medium">
                      {formData.segment_ids.length} recipient(s)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Subject</dt>
                    <dd className="font-medium">{formData.email_subject}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => {
                const steps: Step[] = ['details', 'segments', 'compose', 'review'];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1]);
                }
              }}
              disabled={currentStep === 'details'}
            >
              Back
            </Button>

            {currentStep !== 'review' ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Campaign
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
