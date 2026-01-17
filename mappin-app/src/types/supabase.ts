
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
            conflicts: {
                Row: {
                    id: string
                    title: string
                    description: string | null
                    source_url: string
                    published_at: string
                    latitude: number
                    longitude: number
                    location_name: string | null
                    category: string
                    severity: number
                    created_at: string
                    related_reports: Json | null
                    narrative_analysis: string | null
                }
                Insert: {
                    id?: string
                    title: string
                    description?: string | null
                    source_url: string
                    published_at: string
                    latitude: number
                    longitude: number
                    location_name?: string | null
                    category: string
                    severity: number
                    created_at?: string
                    related_reports?: Json | null
                    narrative_analysis?: string | null
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string | null
                    source_url?: string
                    published_at?: string
                    latitude?: number
                    longitude?: number
                    location_name?: string | null
                    category?: string
                    severity?: number
                    created_at?: string
                    related_reports?: Json | null
                    narrative_analysis?: string | null
                }
            }
        }
    }
}
