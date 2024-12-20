import { useEffect, useState } from 'react';
import { Container } from '@/components/layout/Container';
import { RequestList } from '@/components/admin/verification/RequestList';
import { RequestFilters } from '@/components/admin/verification/RequestFilters';
import { BulkActions } from '@/components/admin/verification/BulkActions';
import { getVerificationRequests, updateVerificationStatus, bulkUpdateVerificationStatus } from '@/lib/api/admin';
import { filterRequests } from '@/lib/utils/requestFilters';
import { exportRequestsToCSV } from '@/lib/utils/export';
import type { VerificationRequestWithProfile } from '@/types/verification';
import { useToast } from '@/components/ui/use-toast';

export default function AdminVerificationPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<VerificationRequestWithProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const data = await getVerificationRequests();
      setRequests(data);
    } catch (error) {
      toast({
        title: "Error loading requests",
        description: "Failed to load verification requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (
    id: number,
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      await updateVerificationStatus(id, status, notes);
      await loadRequests();
      toast({
        title: "Status updated",
        description: `Request ${status} successfully`
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update request status",
        variant: "destructive"
      });
    }
  };

  const handleBulkStatusUpdate = async (
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      await bulkUpdateVerificationStatus(selectedIds, status, notes);
      await loadRequests();
      setSelectedIds([]);
      toast({
        title: "Bulk update complete",
        description: `${selectedIds.length} requests ${status} successfully`
      });
    } catch (error) {
      toast({
        title: "Bulk update failed",
        description: "Failed to update request statuses",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    const selectedRequests = requests.filter(r => selectedIds.includes(r.id));
    exportRequestsToCSV(selectedRequests);
  };

  const filteredRequests = filterRequests(requests, {
    search,
    status,
    type,
    sortBy,
  });

  if (loading) return <div>Loading...</div>;

  return (
    <Container className="py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Verification Requests</h1>
          <p className="text-sm text-muted-foreground">
            {filteredRequests.length} requests
          </p>
        </div>

        <RequestFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          type={type}
          onTypeChange={setType}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <BulkActions
          selectedRequests={requests.filter(r => selectedIds.includes(r.id))}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onExport={handleExport}
        />

        <RequestList
          requests={filteredRequests}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onStatusUpdate={handleStatusUpdate}
        />
      </div>
    </Container>
  );
}