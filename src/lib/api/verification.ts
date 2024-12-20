import { supabase } from '../supabase';

export interface VerificationRequest {
  verificationType: 'identity' | 'rabbinical' | 'community';
  documents: string[];
  rabbinicalReference?: string;
  notes?: string;
}

export async function submitVerificationRequest(data: VerificationRequest) {
  const { error } = await supabase
    .from('verification_requests')
    .insert({
      verification_type: data.verificationType,
      documents_url: data.documents,
      rabbinical_reference: data.rabbinicalReference,
      notes: data.notes,
    });

  if (error) throw error;
}

export async function getVerificationStatus() {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('status, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}