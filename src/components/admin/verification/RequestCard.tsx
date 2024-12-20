import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DocumentList } from '@/components/verification/DocumentList';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { VerificationRequestWithProfile } from '@/types/verification';

interface RequestCardProps {
  request: VerificationRequestWithProfile;
  onStatusUpdate: (id: number, status: 'approved' | 'rejected', notes?: string) => void;
}

export function RequestCard({ request, onStatusUpdate }: RequestCardProps) {
  const [notes, setNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
    await onStatusUpdate(request.id, status, notes);
    setIsReviewing(false);
    setNotes('');
  };

  return (
    <div className="border rounded-lg p-6 space-y-4 bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={request.profile.avatar_url ?? undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">
              {request.profile.display_name || request.profile.email}
            </h3>
            <p className="text-sm text-muted-foreground">
              Submitted {format(new Date(request.submitted_at), 'PPP')}
            </p>
          </div>
        </div>
        <Badge>{request.verification_type}</Badge>
      </div>

      <DocumentList
        documents={request.documents_url.map(url => ({
          url,
          name: url.split('/').pop() || 'Document'
        }))}
      />

      {request.rabbinical_reference && (
        <div>
          <h4 className="text-sm font-medium mb-1">Rabbinical Reference</h4>
          <p className="text-sm text-muted-foreground">{request.rabbinical_reference}</p>
        </div>
      )}

      {request.notes && (
        <div>
          <h4 className="text-sm font-medium mb-1">Additional Notes</h4>
          <p className="text-sm text-muted-foreground">{request.notes}</p>
        </div>
      )}

      {isReviewing ? (
        <div className="space-y-4">
          <Textarea
            placeholder="Add review notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex space-x-2">
            <Button
              variant="destructive"
              onClick={() => handleStatusUpdate('rejected')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              variant="default"
              onClick={() => handleStatusUpdate('approved')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsReviewing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setIsReviewing(true)}>
          Review Request
        </Button>
      )}
    </div>
  );
}