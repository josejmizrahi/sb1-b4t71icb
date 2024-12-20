import { PointsDisplay } from './PointsDisplay';
import { PointsHistory } from './PointsHistory';

export function PointsOverview() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">JNS Points</h2>
        <PointsDisplay />
      </div>
      <PointsHistory />
    </div>
  );
}