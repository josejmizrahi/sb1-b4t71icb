import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface EventFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
}

export function EventFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  location,
  onLocationChange
}: EventFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>
      
      <div className="flex gap-3">
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[130px] bg-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cultural">Cultural</SelectItem>
            <SelectItem value="educational">Educational</SelectItem>
            <SelectItem value="governance">Governance</SelectItem>
            <SelectItem value="social">Social</SelectItem>
          </SelectContent>
        </Select>

        <Select value={location} onValueChange={onLocationChange}>
          <SelectTrigger className="w-[130px] bg-white">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="online">Online Only</SelectItem>
            <SelectItem value="in-person">In-Person Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}