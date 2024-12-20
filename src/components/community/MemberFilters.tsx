import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface MemberFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  interests: string[];
  selectedInterest: string;
  onInterestChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export function MemberFilters({
  search,
  onSearchChange,
  interests,
  selectedInterest,
  onInterestChange,
  sortBy,
  onSortChange,
}: MemberFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <div className="flex gap-3">
        <Select value={selectedInterest} onValueChange={onInterestChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Interest" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interests</SelectItem>
            {interests.map((interest) => (
              <SelectItem key={interest} value={interest}>
                {interest}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recently_active">Recently Active</SelectItem>
            <SelectItem value="newest">Newest Members</SelectItem>
            <SelectItem value="points">Most Points</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}