import { VerificationRequestWithProfile } from '@/types/verification';
import { RequestCard } from './RequestCard';

interface RequestListProps {
  requests: VerificationRequestWithProfile[];
  onStatusUpdate: (id: number, status: 'approved' | 'rejected', notes?: string) => void;
}

export function RequestList({ requests, onStatusUpdate }: RequestListProps) {
  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          onStatusUpdate={onStatusUpdate}
        />
      ))}
    </div>
  );
}