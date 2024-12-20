import { Container } from '@/components/layout/Container';
import { Calendar, Users, Coins, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';

const CREATE_OPTIONS = [
  {
    icon: Calendar,
    title: 'Event',
    description: 'Create a community event or gathering',
    path: '/events/new',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    icon: Users,
    title: 'Study Group',
    description: 'Start a new study group',
    path: '/study-groups/new',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
  {
    icon: Vote,
    title: 'Poll',
    description: 'Create a poll to gather community opinions',
    path: '/polls/new',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    icon: Coins,
    title: 'Fundraising Campaign',
    description: 'Start a community fundraising campaign',
    path: '/fundraising/new',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
];

export default function CreatePage() {
  return (
    <Container size="sm" className="py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-medium">Create</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose what you'd like to create
          </p>
        </div>

        <div className="grid gap-4">
          {CREATE_OPTIONS.map(({ icon: Icon, title, description, path, color, bgColor }) => (
            <Link
              key={path}
              to={path}
              className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary/20 transition-colors"
            >
              <div className={`p-2 rounded-lg ${bgColor}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  );
}