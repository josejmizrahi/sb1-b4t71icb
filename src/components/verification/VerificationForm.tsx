import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { submitVerificationRequest, VerificationRequest } from '@/lib/api/verification';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList } from './DocumentList';
import { useToast } from '../ui/use-toast';

interface Document {
  url: string;
  name: string;
}

export function VerificationForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verificationType, setVerificationType] = useState<VerificationRequest['verificationType']>('identity');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [rabbinicalReference, setRabbinicalReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleDocumentUpload = (url: string, fileName: string) => {
    setDocuments([...documents, { url, name: fileName }]);
  };

  const handleDocumentRemove = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (documents.length === 0) {
      toast({
        title: "Missing documents",
        description: "Please upload at least one document",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await submitVerificationRequest({
        verificationType,
        documents: documents.map(d => d.url),
        rabbinicalReference,
        notes,
      });
      
      toast({
        title: "Request submitted",
        description: "Your verification request has been submitted successfully."
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit verification request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Verification Type</label>
        <Select
          value={verificationType}
          onValueChange={(value: VerificationRequest['verificationType']) => 
            setVerificationType(value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="identity">Identity Verification</SelectItem>
            <SelectItem value="rabbinical">Rabbinical Verification</SelectItem>
            <SelectItem value="community">Community Verification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Supporting Documents</label>
        <DocumentUpload onUploadComplete={handleDocumentUpload} />
        <DocumentList documents={documents} onRemove={handleDocumentRemove} />
      </div>

      {verificationType === 'rabbinical' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Rabbinical Reference</label>
          <Input
            value={rabbinicalReference}
            onChange={(e) => setRabbinicalReference(e.target.value)}
            placeholder="Enter your rabbi's contact information"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Additional Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional information you'd like to provide"
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Verification Request'}
      </Button>
    </form>
  );
}