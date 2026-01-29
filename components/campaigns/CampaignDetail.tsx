'use client';

/**
 * Campaign Detail Component (BS-703)
 *
 * View and manage individual campaign
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Send, Users, Mail, TrendingUp } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  email_subject: string;
  email_content: string;
  preview_text: string;
  segment_ids: string[];
  send_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  sent_at: string | null;
  created_at: string;
}

interface Props {
  campaignId: string;
}

export function CampaignDetail({ campaignId }: Props) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/campaigns/${campaignId}`);
        if (!response.ok) throw new Error('Failed to fetch campaign');

        const data = await response.json();
        setCampaign(data.campaign);
      } catch (error) {
        console.error('Error fetching campaign:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  const handleSend = async () => {
    try {
      setSending(true);
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to send campaign');

      const data = await response.json();
      alert(`Campaign sent to ${data.sent_count} recipients!`);

      // Refresh campaign data
      const refreshResponse = await fetch(`/api/campaigns/${campaignId}`);
      const refreshData = await refreshResponse.json();
      setCampaign(refreshData.campaign);
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campaign not found</p>
        <Button onClick={() => router.push('/admin/campaigns')} className="mt-4">
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const getStatusBadge = () => {
    const variants: Record<Campaign['status'], string> = {
      draft: 'secondary',
      sending: 'default',
      sent: 'default',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[campaign.status] as any}>
        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-muted-foreground">{campaign.description}</p>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Campaign
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send the campaign to{' '}
                    {campaign.segment_ids.length} segment(s). This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSend}>
                    Confirm Send
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {campaign.status === 'sent' && (
            <Button disabled>
              <Send className="mr-2 h-4 w-4" />
              Campaign Sent
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/admin/campaigns')}>
            Back
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {campaign.status === 'sent' && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.send_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.delivered_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opened</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.opened_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clicked</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.clicked_count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Subject
              </h4>
              <p className="font-medium">{campaign.email_subject}</p>
            </div>
            {campaign.preview_text && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Preview Text
                </h4>
                <p className="text-sm">{campaign.preview_text}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Content
              </h4>
              <p className="text-sm whitespace-pre-wrap">{campaign.email_content}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Target Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {campaign.segment_ids.length} recipient(s)
              </p>
              <Button variant="outline" size="sm">
                Preview Audience
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {campaign.sent_at && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Created: </span>
                <span>
                  {new Date(campaign.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Sent: </span>
                <span>
                  {new Date(campaign.sent_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
