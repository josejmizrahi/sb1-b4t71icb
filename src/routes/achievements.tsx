import { Container } from '@/components/layout/Container';
import { AchievementList } from '@/components/achievements/AchievementList';

export default function AchievementsPage() {
  return (
    <Container className="py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-muted-foreground mt-2">
            Track your progress and unlock achievements as you participate in the community
          </p>
        </div>

        <AchievementList />
      </div>
    </Container>
  );
}