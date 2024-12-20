import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { uploadDocument, UploadProgress } from '@/lib/api/storage';
import { FileValidationError } from '@/lib/utils/fileValidation';
import { UploadProgress as UploadProgressBar } from './UploadProgress';
import { useToast } from '../ui/use-toast';

interface DocumentUploadProps {
  onUploadComplete: (url: string) => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const url = await uploadDocument(file, user.id, (progress) => {
        setUploadProgress(progress);
      });
      onUploadComplete(url);
      toast({
        title: "Upload complete",
        description: "Your document has been uploaded successfully."
      });
    } catch (error) {
      const message = error instanceof Error ? error.message :
        (error as FileValidationError)?.message ?? 'Upload failed';
      
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          disabled={uploading}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
        />
      </div>
      
      {uploadProgress && (
        <UploadProgressBar
          progress={uploadProgress.progress}
          fileName={uploadProgress.fileName}
        />
      )}
    </div>
  );
}