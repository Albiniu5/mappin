
'use client'

import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import { Icon, DivIcon } from 'leaflet'
import { useEffect } from 'react'
import { Database } from '@/types/supabase'
import ConflictMarker from './ConflictMarker'
import { Globe } from 'lucide-react'

// Fix default icon issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

type Conflict = Database['public']['Tables']['conflicts']['Row']

interface ConflictMapProps {
    conflicts: Conflict[]
    onClusterClick?: (conflicts: Conflict[]) => void
}

const FixLeafletIcon = () => {
    const map = useMap()
    useEffect(() => {
        (delete (Icon.Default.prototype as any)._getIconUrl);
        Icon.Default.mergeOptions({
            iconRetinaUrl: iconRetinaUrl.src,
            iconUrl: iconUrl.src,
            shadowUrl: shadowUrl.src,
        });
    }, [map])
    return null
}

const MapController = () => {
    const map = useMap()
    useEffect(() => {
        const handleFlyTo = (e: any) => {
            const { lat, lng, zoom } = e.detail;
            if (lat && lng) {
                map.flyTo([lat, lng], zoom || 8, { duration: 2 });
            }
        };

        window.addEventListener('map-fly-to', handleFlyTo);
        return () => window.removeEventListener('map-fly-to', handleFlyTo);
    }, [map])

    return null;
}

const ZoomOutButton = () => {
    const map = useMap()

    return (
        <div className="leaflet-top leaflet-right">
            <div className="leaflet-control leaflet-bar">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        map.flyTo([20, 0], 2.5, { duration: 1.5 });
                    }}
                    className="w-[30px] h-[30px] bg-white hover:bg-slate-100 flex items-center justify-center cursor-pointer border-b-2 border-slate-300"
                    title="Reset to Global View"
                >
                    <Globe className="w-4 h-4 text-slate-700" />
                </button>
            </div>
        </div>
    )
}

export default function ConflictMap({ conflicts = [], onClusterClick }: ConflictMapProps) {
    console.log("ConflictMap received conflicts:", conflicts);

    // Handle cluster click
    const handleClusterClick = (cluster: any) => {
        if (!onClusterClick) return;

        const markers = cluster.getAllChildMarkers();
        const claimedIds = new Set<string>();

        const clusterConflicts = markers.map((marker: any) => {
            // Get marker position
            const markerPos = marker.getLatLng();

            // Find matching conflict by coordinates THAT HAS NOT BEEN CLAIMED YET
            const match = conflicts.find(c =>
                !claimedIds.has(c.id) &&
                Math.abs(c.latitude - markerPos.lat) < 0.0001 &&
                Math.abs(c.longitude - markerPos.lng) < 0.0001
            );

            if (match) {
                claimedIds.add(match.id);
                return match;
            }
            return null;
        }).filter(Boolean) as Conflict[];

        // Sort by date descending (newest first)
        clusterConflicts.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

        onClusterClick(clusterConflicts);
    };

    return (
        <MapContainer
            center={[20, 0]}
            zoom={2.5}
            scrollWheelZoom={true}
            className="h-full w-full z-0 bg-slate-900"
            minZoom={2}
            maxBounds={[[-90, -180], [90, 180]]}
        >
            <FixLeafletIcon />
            <MapController />
            <ZoomOutButton />
            {/* Dark themed tiles */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Separate Cluster Groups per Category to achieve "Split by Subject" */}
            {[
                { name: 'Armed Conflict', color: 'from-red-600 to-red-800', glow: 'rgba(220, 20, 60, 0.4)', borderColor: 'border-red-500/30' },
                { name: 'Protest', color: 'from-amber-500 to-orange-700', glow: 'rgba(255, 140, 0, 0.4)', borderColor: 'border-amber-500/30' },
                { name: 'Political Unrest', color: 'from-orange-500 to-orange-800', glow: 'rgba(255, 69, 0, 0.4)', borderColor: 'border-orange-500/30' },
                { name: 'Other', color: 'from-blue-500 to-indigo-700', glow: 'rgba(30, 144, 255, 0.4)', borderColor: 'border-blue-500/30' }
            ].map((cat) => {
                const catConflicts = conflicts.filter(c =>
                    cat.name === 'Other'
                        ? !['Armed Conflict', 'Protest', 'Political Unrest'].includes(c.category)
                        : c.category === cat.name
                );

                if (catConflicts.length === 0) return null;

                return (
                    <MarkerClusterGroup
                        key={cat.name}
                        chunkedLoading
                        showCoverageOnHover={false}
                        spiderfyOnMaxZoom={true}
                        maxClusterRadius={40}
                        zoomToBoundsOnClick={false}
                        onClick={(e: any) => {
                            const cluster = e.layer;
                            handleClusterClick(cluster);
                            const map = cluster._map;
                            map.flyTo(cluster.getLatLng(), map.getZoom() + 2, { duration: 1 });
                        }}
                        iconCreateFunction={(cluster: any) => {
                            const count = cluster.getChildCount();

                            // Toned down size scaling
                            // Base 36px, variable based on log count, capped at 60px
                            const baseSize = 36;
                            const bonus = Math.min(Math.log10(count) * 12, 24);
                            const size = baseSize + bonus;
                            const fontSize = Math.max(11, size / 2.8);

                            return new DivIcon({
                                html: `
                                    <div class="relative flex items-center justify-center w-full h-full group">
                                        <!-- Subtle Outer Glow (Only on hover or very large) -->
                                        <div class="absolute inset-0 rounded-full transition-opacity duration-500 opacity-50 group-hover:opacity-100" 
                                             style="background: ${cat.glow}; filter: blur(12px);"></div>
                                        
                                        <!-- Core Ring (Analog feel) -->
                                        <div class="absolute inset-0 rounded-full border-1 ${cat.borderColor}" 
                                             style="transform: scale(1.15);"></div>

                                        <!-- Solid Core -->
                                        <div class="relative rounded-full bg-gradient-to-br ${cat.color} shadow-lg flex items-center justify-center text-white font-bold border border-white/20 z-10"
                                             style="width: ${size}px; height: ${size}px; font-size: ${fontSize}px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);">
                                            ${count}
                                        </div>
                                    </div>
                                `,
                                className: 'bg-transparent',
                                iconSize: [size + 24, size + 24],
                            });
                        }}
                    >
                        {catConflicts.map(conflict => (
                            <ConflictMarker key={conflict.id} conflict={conflict} />
                        ))}
                    </MarkerClusterGroup>
                );
            })}
        </MapContainer>
    )
}
