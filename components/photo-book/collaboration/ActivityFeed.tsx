'use client';

/**
 * Activity Feed Component
 * Feature: PB-029
 *
 * Displays real-time activity log for a photo book project
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ImagePlus,
  Image,
  FileEdit,
  Trash2,
  ArrowUpDown,
  Layout,
  Type,
  UserPlus,
  UserMinus,
  CheckCircle2,
} from 'lucide-react';
import type { Activity } from '@/lib/collaboration';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  projectId: string;
  limit?: number;
}

export function ActivityFeed({ projectId, limit = 50 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Poll for new activities every 10 seconds
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchActivities = async () => {
    try {
      const response = await fetch(
        `/api/photo-book/projects/${projectId}/activity?limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'created':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'photo_added':
        return <ImagePlus className="h-4 w-4 text-blue-500" />;
      case 'photo_removed':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'photo_edited':
        return <Image className="h-4 w-4 text-purple-500" />;
      case 'page_created':
      case 'page_edited':
        return <FileEdit className="h-4 w-4 text-indigo-500" />;
      case 'page_deleted':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'page_reordered':
        return <ArrowUpDown className="h-4 w-4 text-orange-500" />;
      case 'cover_edited':
        return <FileEdit className="h-4 w-4 text-pink-500" />;
      case 'layout_regenerated':
        return <Layout className="h-4 w-4 text-cyan-500" />;
      case 'text_added':
      case 'text_edited':
        return <Type className="h-4 w-4 text-yellow-500" />;
      case 'text_removed':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'collaborator_added':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'collaborator_removed':
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'project_published':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <FileEdit className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityMessage = (activity: Activity) => {
    const userName = activity.userEmail?.split('@')[0] || 'Someone';

    switch (activity.activityType) {
      case 'created':
        return `${userName} created the project`;
      case 'photo_added':
        return `${userName} added ${activity.metadata.count || 1} photo(s)`;
      case 'photo_removed':
        return `${userName} removed a photo`;
      case 'photo_edited':
        return `${userName} edited a photo`;
      case 'page_created':
        return `${userName} created a new page`;
      case 'page_edited':
        return `${userName} edited page ${activity.metadata.pageNumber || ''}`;
      case 'page_deleted':
        return `${userName} deleted a page`;
      case 'page_reordered':
        return `${userName} reordered pages`;
      case 'cover_edited':
        return `${userName} updated the cover design`;
      case 'layout_regenerated':
        return `${userName} regenerated the layout`;
      case 'text_added':
        return `${userName} added text to a page`;
      case 'text_edited':
        return `${userName} edited text`;
      case 'text_removed':
        return `${userName} removed text`;
      case 'collaborator_added':
        return `${userName} invited ${activity.metadata.email || 'someone'}`;
      case 'collaborator_removed':
        return `${userName} removed a collaborator`;
      case 'project_published':
        return `${userName} published the project`;
      default:
        return `${userName} made a change`;
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity yet
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(activity.userEmail || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getActivityIcon(activity.activityType)}
                      <p className="text-sm">{getActivityMessage(activity)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
