'use client';

/**
 * Campaigns List Component (BS-703)
 *
 * Displays list of campaigns with filtering and status badges
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, Users } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  email_subject: string;
  segment_ids: string[];
  send_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  sent_at: string | null;
  created_at: string;
}

export function CampaignsList() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workspaceId, setWorkspaceId] = useState<string>('');

  useEffect(() => {
    // TODO: Get workspace ID from context/session
    // For now, using a placeholder
    const fetchWorkspaceId = async () => {
      // Implement workspace ID fetch logic
      setWorkspaceId('placeholder-workspace-id');
    };
    fetchWorkspaceId();
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ workspace_id: workspaceId });
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }

        const response = await fetch(`/api/campaigns?${params}`);
        if (!response.ok) throw new Error('Failed to fetch campaigns');

        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [workspaceId, statusFilter]);

  const getStatusBadge = (status: Campaign['status']) => {
    const variants: Record<Campaign['status'], string> = {
      draft: 'secondary',
      sending: 'default',
      sent: 'default',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first broadcast campaign to get started
            </p>
            <Button onClick={() => router.push('/admin/campaigns/new')}>
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {campaign.name}
                      {getStatusBadge(campaign.status)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {campaign.description || 'No description'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{campaign.email_subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {campaign.segment_ids?.length || 0} segment
                      {campaign.segment_ids?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {campaign.status === 'sent' && (
                    <div className="flex items-center gap-4 ml-auto">
                      <span>Sent: {campaign.send_count}</span>
                      <span>Opened: {campaign.opened_count}</span>
                      <span>Clicked: {campaign.clicked_count}</span>
                    </div>
                  )}
                </div>
                {campaign.sent_at && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Sent{' '}
                    {new Date(campaign.sent_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
