import type { Profile } from '@/types/profiles';

interface MemberFilters {
  search: string;
  interest: string;
  sortBy: string;
}

export function filterMembers(members: Profile[], filters: MemberFilters): Profile[] {
  return members
    .filter((member) => {
      const searchMatch = filters.search
        ? (member.display_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
           member.username.toLowerCase().includes(filters.search.toLowerCase()) ||
           member.bio?.toLowerCase().includes(filters.search.toLowerCase()))
        : true;

      const interestMatch = filters.interest === 'all' ||
        member.interests?.includes(filters.interest);

      return searchMatch && interestMatch;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'recently_active':
          return (new Date(b.last_active || 0)).getTime() - 
                 (new Date(a.last_active || 0)).getTime();
        case 'newest':
          return (new Date(b.join_date)).getTime() - 
                 (new Date(a.join_date)).getTime();
        case 'points':
          return (b.total_points || 0) - (a.total_points || 0);
        default:
          return 0;
      }
    });
}