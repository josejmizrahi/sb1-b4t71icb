import { useState } from 'react';
import { Download, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { VerificationRequestWithProfile } from '@/types/verification';

interface BulkActionsProps {
  selectedRequests: VerificationRequestWithProfile[];
  onBulkStatusUpdate: (status: 'approved' | 'rejected', notes?: string) => Promise<void>;
  onExport: () => void;
}

export function BulkActions({ selectedRequests, onBulkStatusUpdate, onExport }: BulkActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!actionType) return;
    
    setLoading(true);
    try {
      await onBulkStatusUpdate(actionType, notes);
      setShowDialog(false);
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  if (selectedRequests.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
        <span className="text-sm text-muted-foreground">
          {selectedRequests.length} requests selected
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActionType('approved');
            setShowDialog(true);
          }}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Selected
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActionType('rejected');
            setShowDialog(true);
          }}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject Selected
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Selected
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' ? 'Approve' : 'Reject'} {selectedRequests.length} Requests
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Add notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={loading}
              variant={actionType === 'approved' ? 'default' : 'destructive'}
            >
              {loading ? 'Processing...' : actionType === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}