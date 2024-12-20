import { supabase } from '../supabase';
import type { Campaign, CampaignWithCreator, Donation } from '@/types/fundraising';

export async function getCampaigns() {
  const { data, error } = await supabase
    .from('fundraising_campaigns')
    .select(`
      *,
      creator:profiles!creator_id(
        display_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CampaignWithCreator[];
}

export async function getCampaign(id: string) {
  const { data, error } = await supabase
    .from('fundraising_campaigns')
    .select(`
      *,
      creator:profiles!creator_id(
        display_name,
        avatar_url
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CampaignWithCreator;
}

export async function createCampaign(campaign: Partial<Campaign>) {
  const { data, error } = await supabase
    .from('fundraising_campaigns')
    .insert(campaign)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createDonation(donation: Partial<Donation>) {
  const { data, error } = await supabase
    .from('campaign_donations')
    .insert(donation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCampaignDonations(campaignId: string) {
  const { data, error } = await supabase
    .from('campaign_donations')
    .select(`
      *,
      donor:profiles!donor_id(
        display_name,
        avatar_url
      )
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}