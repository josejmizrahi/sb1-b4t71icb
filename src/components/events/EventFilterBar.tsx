import { Container } from '../layout/Container';
import { EventFilters } from './EventFilters';

interface EventFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
}

export function EventFilterBar(props: EventFilterBarProps) {
  return (
    <div className="bg-gray-50 border-b">
      <Container className="py-4">
        <EventFilters {...props} />
      </Container>
    </div>
  );
}