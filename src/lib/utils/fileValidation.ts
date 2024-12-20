export const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
} as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationError {
  code: 'invalid_type' | 'file_too_large';
  message: string;
}

export function validateFile(file: File): FileValidationError | null {
  if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
    return {
      code: 'invalid_type',
      message: 'File type not supported. Please upload a PDF, JPG, or PNG file.'
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      code: 'file_too_large',
      message: 'File size exceeds 5MB limit.'
    };
  }

  return null;
}