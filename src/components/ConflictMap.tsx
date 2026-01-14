
'use client'

import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import { Icon, DivIcon } from 'leaflet'
import { useEffect } from 'react'
import { Database } from '@/types/supabase'
import ConflictMarker from './ConflictMarker'

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

export default function ConflictMap({ conflicts = [], onClusterClick }: ConflictMapProps) {
    console.log("ConflictMap received conflicts:", conflicts);

    // Handle cluster click
    const handleClusterClick = (cluster: any) => {
        if (!onClusterClick) return;

        const markers = cluster.getAllChildMarkers();
        const clusterConflicts = markers.map((marker: any) => {
            const conflictId = marker.options.conflictId;
            return conflicts.find(c => c.id === conflictId);
        }).filter(Boolean) as Conflict[];

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
            {/* Dark themed tiles */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Cluster markers */}
            <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
                spiderfyOnMaxZoom={false}
                onClick={(e: any) => handleClusterClick(e.layer)}
                iconCreateFunction={(cluster: any) => {
                    const count = cluster.getChildCount();
                    let sizeClass = 'w-14 h-14 text-base';
                    if (count > 50) sizeClass = 'w-20 h-20 text-xl';
                    else if (count > 20) sizeClass = 'w-16 h-16 text-lg';

                    return new DivIcon({
                        html: `
                            <div class="relative group cursor-pointer">
                                <div class="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-600 rounded-full blur opacity-75 animate-pulse"></div>
                                <div class="relative ${sizeClass} rounded-full bg-gradient-to-br from-orange-600 to-orange-800 border-3 border-white shadow-2xl flex items-center justify-center font-bold text-white transition-transform hover:scale-110">
                                    ${count}
                                </div>
                            </div>
                        `,
                        className: 'bg-transparent',
                        iconSize: count > 50 ? [80, 80] : count > 20 ? [64, 64] : [56, 56],
                    });
                }}
            >
                {conflicts.map(conflict => (
                    <ConflictMarker key={conflict.id} conflict={conflict} />
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    )
}
