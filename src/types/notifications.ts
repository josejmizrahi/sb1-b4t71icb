export type NotificationType = 
  | 'message'
  | 'achievement'
  | 'event'
  | 'governance'
  | 'system';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  description: string;
  link?: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}