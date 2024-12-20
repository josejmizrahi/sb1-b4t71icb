import { X, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { DocumentPreview } from './DocumentPreview';

interface DocumentListProps {
  documents: Array<{ url: string; name: string }>;
  onRemove: (index: number) => void;
}

export function DocumentList({ documents, onRemove }: DocumentListProps) {
  if (documents.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Uploaded Documents</label>
      <ul className="space-y-2">
        {documents.map((doc, index) => (
          <li key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
            <span className="text-sm truncate max-w-[60%]">
              {doc.name}
            </span>
            <div className="flex items-center gap-2">
              <DocumentPreview url={doc.url} fileName={doc.name} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}