import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/ui/page-header';
import { MemberFilters } from '@/components/community/MemberFilters';
import { MemberGrid } from '@/components/community/MemberGrid';
import { useMembers } from '@/hooks/useMembers';
import { filterMembers } from '@/lib/utils/memberFilters';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { Profile } from '@/types/profiles';

function getUniqueInterests(members: Profile[]) {
  const interests = new Set<string>();
  members.forEach(member => {
    member.interests?.forEach(interest => interests.add(interest));
  });
  return Array.from(interests).sort();
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { members, loading, error } = useMembers();
  const [search, setSearch] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('all');
  const [sortBy, setSortBy] = useState('recently_active');

  const handleConnect = (memberId: string) => {
    toast({
      title: "Connection request sent",
      description: "We'll notify you when they respond"
    });
  };

  const handleMessage = (memberId: string) => {
    navigate(`/messages?user=${memberId}`);
  };

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <EmptyState
        icon={Users}
        title="Error loading members"
        description="Please try again later"
      />
    );
  }

  const filteredMembers = filterMembers(members, {
    search,
    interest: selectedInterest,
    sortBy
  });

  const interests = getUniqueInterests(members);

  return (
    <Container className="py-6">
      <PageHeader 
        title="Community" 
        description="Connect with members of the Jewish Network State"
      />
      
      <div className="mt-6 space-y-6">
        <MemberFilters
          search={search}
          onSearchChange={setSearch}
          interests={interests}
          selectedInterest={selectedInterest}
          onInterestChange={setSelectedInterest}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description="Try adjusting your filters"
          />
        ) : (
          <MemberGrid
            members={filteredMembers}
            onConnect={handleConnect}
            onMessage={handleMessage}
          />
        )}
      </div>
    </Container>
  );
}