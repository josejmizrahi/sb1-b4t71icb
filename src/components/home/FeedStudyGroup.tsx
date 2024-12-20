import { BookOpen, MessageSquare, Share2, ThumbsUp, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import type { StudyGroup } from '@/types/studyGroups';

interface FeedStudyGroupProps {
  group: StudyGroup;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export function FeedStudyGroup({ group, onLike, onComment, onShare }: FeedStudyGroupProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/study-groups/${group.id}`);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card 
      className="overflow-hidden hover:border-primary/20 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      {/* Card content remains the same but with handleAction for buttons */}
      <div className="p-6">
        {/* ... existing content ... */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => handleAction(e, onLike!)}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Like
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => handleAction(e, onComment!)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => handleAction(e, onShare!)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </Card>
  );
}