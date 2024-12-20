import { ProposalWithVotes } from '@/types/governance';

export function filterProposals(
  proposals: ProposalWithVotes[],
  filters: {
    search: string;
    status: string;
    category: string;
    sortBy: string;
  }
): ProposalWithVotes[] {
  return proposals
    .filter((proposal) => {
      const searchMatch = filters.search
        ? proposal.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          proposal.description.toLowerCase().includes(filters.search.toLowerCase())
        : true;

      const statusMatch = filters.status === 'all' || proposal.status === filters.status;
      const categoryMatch = filters.category === 'all' || proposal.category === filters.category;

      return searchMatch && statusMatch && categoryMatch;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'votes':
          return b.votes.length - a.votes.length;
        default: // newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
}