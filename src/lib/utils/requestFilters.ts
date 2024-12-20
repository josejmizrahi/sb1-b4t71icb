import { VerificationRequestWithProfile } from '@/types/verification';

export function filterRequests(
  requests: VerificationRequestWithProfile[],
  filters: {
    search: string;
    status: string;
    type: string;
    sortBy: string;
  }
): VerificationRequestWithProfile[] {
  return requests
    .filter((request) => {
      const searchMatch = filters.search
        ? request.profile.display_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
          request.profile.email.toLowerCase().includes(filters.search.toLowerCase())
        : true;

      const statusMatch = filters.status === 'all' || request.status === filters.status;
      const typeMatch = filters.type === 'all' || request.verification_type === filters.type;

      return searchMatch && statusMatch && typeMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.submitted_at).getTime();
      const dateB = new Date(b.submitted_at).getTime();
      return filters.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
}