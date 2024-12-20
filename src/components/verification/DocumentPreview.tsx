import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface DocumentPreviewProps {
  url: string;
  fileName: string;
}

export function DocumentPreview({ url, fileName }: DocumentPreviewProps) {
  const [open, setOpen] = useState(false);
  const isImage = /\.(jpg|jpeg|png)$/i.test(url);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0"
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {isImage ? (
              <img
                src={url}
                alt={fileName}
                className="max-h-[80vh] w-full object-contain"
              />
            ) : (
              <iframe
                src={url}
                title={fileName}
                className="w-full h-[80vh]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}