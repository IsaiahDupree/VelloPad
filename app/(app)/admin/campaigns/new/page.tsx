/**
 * Create New Campaign Page (BS-703)
 *
 * Multi-step wizard for creating broadcast campaigns
 */

import { Metadata } from 'next';
import { CampaignWizard } from '@/components/campaigns/CampaignWizard';

export const metadata: Metadata = {
  title: 'New Campaign | Admin | VelloPad',
  description: 'Create a new broadcast email campaign',
};

export default async function NewCampaignPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Campaign</h1>
        <p className="text-muted-foreground mt-1">
          Send targeted emails to user segments
        </p>
      </div>

      <CampaignWizard />
    </div>
  );
}
