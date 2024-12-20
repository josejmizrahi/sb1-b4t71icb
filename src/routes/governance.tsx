import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProposalCard } from '@/components/governance/ProposalCard';
import { ProposalForm } from '@/components/governance/ProposalForm';
import { ProposalFilters } from '@/components/governance/ProposalFilters';
import { VoteDialog } from '@/components/governance/VoteDialog';
import { getProposals } from '@/lib/api/governance';
import { filterProposals } from '@/lib/utils/proposalFilters';
import type { ProposalWithVotes } from '@/types/governance';

export default function GovernancePage() {
  const [proposals, setProposals] = useState<ProposalWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<ProposalWithVotes | null>(null);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    loadProposals();
  }, []);

  async function loadProposals() {
    try {
      const data = await getProposals();
      setProposals(data);
    } catch (error) {
      console.error('Failed to load proposals:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProposals = filterProposals(proposals, {
    search,
    status,
    category,
    sortBy,
  });

  if (loading) return <div>Loading...</div>;

  return (
    <Container className="py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Community Governance</h1>
            <p className="text-muted-foreground mt-2">
              Participate in shaping our community's future through democratic decision-making
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Proposal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Proposal</DialogTitle>
              </DialogHeader>
              <ProposalForm onSuccess={loadProposals} />
            </DialogContent>
          </Dialog>
        </div>

        <ProposalFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          category={category}
          onCategoryChange={setCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onVote={() => setSelectedProposal(proposal)}
            />
          ))}
        </div>

        {selectedProposal && (
          <VoteDialog
            proposal={selectedProposal}
            open={!!selectedProposal}
            onOpenChange={(open) => !open && setSelectedProposal(null)}
            onVoteSubmitted={loadProposals}
          />
        )}
      </div>
    </Container>
  );
}