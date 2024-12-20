import { MemberCard } from './MemberCard';
import type { Profile } from '@/types/profiles';

interface MemberGridProps {
  members: Profile[];
  onConnect: (memberId: string) => void;
  onMessage: (memberId: string) => void;
}

export function MemberGrid({ members, onConnect, onMessage }: MemberGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          onConnect={onConnect}
          onMessage={onMessage}
        />
      ))}
    </div>
  );
}