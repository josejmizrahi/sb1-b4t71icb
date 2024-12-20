import { useState, useEffect } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { usePolls } from '@/hooks/usePolls';
import { useStudyGroups } from '@/hooks/useStudyGroups';
import { useCampaigns } from '@/hooks/useCampaigns';
import { FeedEvent } from './FeedEvent';
import { FeedPoll } from './FeedPoll';
import { FeedStudyGroup } from './FeedStudyGroup';
import { FeedCampaign } from './FeedCampaign';
import { LoadingSpinner } from '../ui/loading-spinner';
import { EmptyState } from '../ui/empty-state';
import { Activity } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface HomeFeedProps {
  selectedTypes: string[];
  sortBy: string;
}

export function HomeFeed({ selectedTypes, sortBy }: HomeFeedProps) {
  const { events, loading: eventsLoading } = useEvents();
  const { polls, loading: pollsLoading } = usePolls();
  const { studyGroups, loading: groupsLoading } = useStudyGroups();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const { toast } = useToast();
  const [feedItems, setFeedItems] = useState<any[]>([]);

  useEffect(() => {
    const items = [];
    const showAll = selectedTypes.includes('all');

    if (!eventsLoading && events && (showAll || selectedTypes.includes('events'))) {
      items.push(...events.map(event => ({
        type: 'event',
        data: event,
        date: new Date(event.created_at)
      })));
    }

    if (!pollsLoading && polls && (showAll || selectedTypes.includes('polls'))) {
      items.push(...polls.map(poll => ({
        type: 'poll',
        data: poll,
        date: new Date(poll.created_at)
      })));
    }

    if (!groupsLoading && studyGroups && (showAll || selectedTypes.includes('study-groups'))) {
      items.push(...studyGroups.map(group => ({
        type: 'study-group',
        data: group,
        date: new Date(group.created_at)
      })));
    }

    if (!campaignsLoading && campaigns && (showAll || selectedTypes.includes('campaigns'))) {
      items.push(...campaigns.map(campaign => ({
        type: 'campaign',
        data: campaign,
        date: new Date(campaign.created_at)
      })));
    }

    // Sort items
    items.sort((a, b) => {
      if (sortBy === 'recent') {
        return b.date.getTime() - a.date.getTime();
      }
      return 0;
    });

    setFeedItems(items);
  }, [
    selectedTypes,
    sortBy,
    events,
    polls,
    studyGroups,
    campaigns,
    eventsLoading,
    pollsLoading,
    groupsLoading,
    campaignsLoading
  ]);

  const handleShare = () => {
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard"
    });
  };

  const handleLike = () => {
    toast({
      title: "Liked!",
      description: "You liked this post"
    });
  };

  const handleComment = () => {
    toast({
      title: "Coming soon",
      description: "Comments will be available soon"
    });
  };

  if (eventsLoading || pollsLoading || groupsLoading || campaignsLoading) {
    return <LoadingSpinner />;
  }

  if (feedItems.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activities found"
        description={selectedTypes.includes('all') 
          ? "There are no recent activities to show"
          : "Try selecting different content types"
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {feedItems.map((item, index) => {
        const commonProps = {
          onLike: handleLike,
          onComment: handleComment,
          onShare: handleShare
        };

        switch (item.type) {
          case 'event':
            return <FeedEvent key={`${item.type}-${index}`} event={item.data} {...commonProps} />;
          case 'poll':
            return <FeedPoll key={`${item.type}-${index}`} poll={item.data} {...commonProps} />;
          case 'study-group':
            return <FeedStudyGroup key={`${item.type}-${index}`} group={item.data} {...commonProps} />;
          case 'campaign':
            return <FeedCampaign key={`${item.type}-${index}`} campaign={item.data} {...commonProps} />;
          default:
            return null;
        }
      })}
    </div>
  );
}