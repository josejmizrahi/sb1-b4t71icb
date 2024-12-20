import { supabase } from '../supabase';
import { validateFile } from '../utils/fileValidation';

export interface UploadProgress {
  progress: number;
  fileName: string;
}

export async function uploadDocument(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
) {
  const validationError = validateFile(file);
  if (validationError) throw validationError;

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
  const filePath = `verification-documents/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      onUploadProgress: (progress) => {
        if (onProgress) {
          onProgress({
            progress: (progress.loaded / progress.total) * 100,
            fileName: file.name
          });
        }
      }
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return publicUrl;
}