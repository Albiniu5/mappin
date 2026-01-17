
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
                }
            }
        }
    }
}
