import { Container } from '@/components/layout/Container';
import { PointsDisplay } from '@/components/points/PointsDisplay';
import { PointsHistory } from '@/components/points/PointsHistory';

export default function PointsPage() {
  return (
    <Container className="py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">JNS Points</h1>
            <p className="text-muted-foreground mt-1">
              Track your contributions and achievements
            </p>
          </div>
          <PointsDisplay />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Points History</h2>
          <PointsHistory />
        </div>
      </div>
    </Container>
  );
}