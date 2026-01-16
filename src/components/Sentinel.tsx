'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function Sentinel() {
    useEffect(() => {
        // Subscribe to INSERT events on the 'conflicts' table
        const channel = supabase
            .channel('sentinel-alert')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'conflicts' },
                (payload) => {
                    console.log('Sentinel received payload:', payload); // Debug Log
                    const newRow = payload.new as any;
                    // Filter for Severity >= 4
                    if (newRow.severity && newRow.severity >= 4) {

                        // Show Alert
                        toast.error(`⚠️ CRITICAL: ${newRow.location_name || 'Unknown Location'}`, {
                            description: newRow.title,
                            duration: 10000, // Stay for 10 seconds
                            position: 'top-center',
                            action: {
                                label: 'View',
                                onClick: () => {
                                    // Dispatch Custom Event for Map FlyTo
                                    window.dispatchEvent(new CustomEvent('map-fly-to', {
                                        detail: {
                                            lat: newRow.latitude,
                                            lng: newRow.longitude,
                                            zoom: 8
                                        }
                                    }));
                                }
                            },
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return null; // Headless component
}
