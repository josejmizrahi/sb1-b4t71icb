import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const CONTENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'events', label: 'Events' },
  { value: 'polls', label: 'Polls' },
  { value: 'study-groups', label: 'Study Groups' },
  { value: 'campaigns', label: 'Campaigns' },
];

interface FeedFiltersProps {
  selectedTypes: string[];
  onTypeChange: (types: string[]) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export function FeedFilters({
  selectedTypes,
  onTypeChange,
  sortBy,
  onSortChange,
}: FeedFiltersProps) {
  const toggleType = (type: string) => {
    if (type === 'all') {
      onTypeChange(['all']);
      return;
    }

    let newTypes: string[];
    if (selectedTypes.includes(type)) {
      newTypes = selectedTypes.filter(t => t !== type);
      if (newTypes.length === 0) newTypes = ['all'];
    } else {
      newTypes = selectedTypes.includes('all')
        ? [type]
        : [...selectedTypes, type];
    }
    onTypeChange(newTypes);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {CONTENT_TYPES.map(({ value, label }) => (
          <Badge
            key={value}
            variant={selectedTypes.includes(value) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleType(value)}
          >
            {label}
          </Badge>
        ))}
      </div>

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="popular">Most Popular</SelectItem>
          <SelectItem value="ending">Ending Soon</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}