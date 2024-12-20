export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          email: string
          avatar_url: string | null
          bio: string | null
          join_date: string
          verified: boolean
          status: string
          last_active: string | null
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          email: string
          avatar_url?: string | null
          bio?: string | null
          join_date?: string
          verified?: boolean
          status?: string
          last_active?: string | null
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          email?: string
          avatar_url?: string | null
          bio?: string | null
          join_date?: string
          verified?: boolean
          status?: string
          last_active?: string | null
        }
      }
    }
  }
}