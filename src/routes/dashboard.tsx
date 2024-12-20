import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { HomeFeed } from '@/components/home/HomeFeed';
import { FeedFilters } from '@/components/home/FeedFilters';
import { useAuth } from '@/lib/auth/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [sortBy, setSortBy] = useState('recent');

  return (
    <Container className="py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {profile?.display_name || 'Friend'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with the latest community activities
          </p>
        </div>

        {/* Filters */}
        <FeedFilters
          selectedTypes={selectedTypes}
          onTypeChange={setSelectedTypes}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Feed */}
        <HomeFeed
          selectedTypes={selectedTypes}
          sortBy={sortBy}
        />
      </div>
    </Container>
  );
}