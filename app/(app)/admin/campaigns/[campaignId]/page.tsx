/**
 * Campaign Detail Page (BS-703)
 *
 * View and manage a specific campaign
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CampaignDetail } from '@/components/campaigns/CampaignDetail';

type Props = {
  params: {
    campaignId: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Campaign | Admin | VelloPad`,
    description: 'View and manage campaign details',
  };
}

export default async function CampaignPage({ params }: Props) {
  const { campaignId } = params;

  if (!campaignId) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <CampaignDetail campaignId={campaignId} />
    </div>
  );
}
