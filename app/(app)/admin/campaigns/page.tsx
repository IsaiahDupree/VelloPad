/**
 * Admin Campaigns List Page (BS-703)
 *
 * View and manage all broadcast campaigns
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CampaignsList } from '@/components/campaigns/CampaignsList';

export const metadata: Metadata = {
  title: 'Campaigns | Admin | VelloPad',
  description: 'Manage broadcast email campaigns',
};

export default async function CampaignsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage broadcast email campaigns
          </p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      <CampaignsList />
    </div>
  );
}
