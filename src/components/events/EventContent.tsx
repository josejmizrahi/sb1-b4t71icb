import { Container } from '../layout/Container';
import { EventList } from './EventList';
import type { EventFilters } from '@/types/events';

interface EventContentProps {
  filters: EventFilters;
}

export function EventContent({ filters }: EventContentProps) {
  return (
    <Container className="py-6">
      <EventList filters={filters} />
    </Container>
  );
}