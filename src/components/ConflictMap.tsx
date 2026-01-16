
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
            if (lat !== undefined && lng !== undefined) {
                map.flyTo([lat, lng], zoom || 8, { duration: 2 });
            }
        };

        window.addEventListener('map-fly-to', handleFlyTo);
        return () => window.removeEventListener('map-fly-to', handleFlyTo);
    }, [map])

    return null;
}



export default function ConflictMap({ conflicts = [], onClusterClick }: ConflictMapProps) {
    console.log("ConflictMap received conflicts:", conflicts);

    // Handle cluster click (Legacy/Unused but kept for reference if needed, or delete)
    // We are using robustClusterClick below.
    const handleClusterClick = (cluster: any) => {
        if (!onClusterClick) return;

        const markers = cluster.getAllChildMarkers();
        const claimedIds = new Set<string>();

        const clusterConflicts = markers.map((marker: any) => {
            const markerPos = marker.getLatLng();
            const match = conflicts.find(c =>
                !claimedIds.has(c.id) &&
                Math.abs(c.latitude - markerPos.lat) < 0.0005 &&
                Math.abs(c.longitude - markerPos.lng) < 0.0005
            );

            if (match) {
                claimedIds.add(match.id);
                return match;
            }
            return null;
        }).filter(Boolean) as Conflict[];

        clusterConflicts.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        onClusterClick(clusterConflicts);
    };

    // Robust ID-based Handlers
    const robustClusterClick = (e: any) => {
        const cluster = e.layer;
        const markers = cluster.getAllChildMarkers();
        const markerIds = new Set(markers.map((m: any) => m.options.title));

        const clusterConflicts = conflicts
            .filter(c => markerIds.has(c.id))
            .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

        if (onClusterClick) onClusterClick(clusterConflicts);

        const map = cluster._map;
        map.flyTo(cluster.getLatLng(), map.getZoom() + 2, { duration: 1 });
    };

    const createClusterIcon = (cluster: any) => {
        const markers = cluster.getAllChildMarkers();
        const count = cluster.getChildCount();
        const stats: Record<string, number> = { 'Armed Conflict': 0, 'Protest': 0, 'Political Unrest': 0, 'Other': 0 };

        markers.forEach((marker: any) => {
            const id = marker.options.title;
            const match = conflicts.find(c => c.id === id);
            if (match) {
                const cat = ['Armed Conflict', 'Protest', 'Political Unrest'].includes(match.category) ? match.category : 'Other';
                stats[cat] = (stats[cat] || 0) + 1;
            } else {
                stats['Other'] = (stats['Other'] || 0) + 1;
            }
        });

        const colors: Record<string, string> = {
            'Armed Conflict': '#dc2626', 'Protest': '#f59e0b', 'Political Unrest': '#ea580c', 'Other': '#3b82f6'
        };

        const radius = 16;
        const circumference = 2 * Math.PI * radius;
        let svgSegments = '';
        let accumulatedPercent = 0;

        Object.entries(stats).forEach(([cat, catCount]) => {
            if (catCount === 0) return;
            const percent = catCount / count;
            const dashArray = `${percent * circumference} ${circumference}`;
            const dashOffset = -1 * accumulatedPercent * circumference;
            svgSegments += `<circle r="${radius}" cx="20" cy="20" fill="transparent" stroke="${colors[cat]}" stroke-width="6" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}" class="transition-all duration-300" />`;
            accumulatedPercent += percent;
        });

        const dominantCat = Object.keys(stats).reduce((a, b) => stats[a] > stats[b] ? a : b);
        const glowColor = colors[dominantCat] + '66';
        const baseSize = 40;
        const bonus = Math.min(Math.log10(count) * 15, 30);
        const size = baseSize + bonus;
        const fontSize = Math.floor(size * 0.45);

        return new DivIcon({
            html: `
                <div style="width: ${size}px; height: ${size}px;" class="relative flex items-center justify-center group hover:scale-110 transition-transform duration-300">
                    <!-- Glow -->
                    <div class="absolute inset-0 rounded-full blur-md transition-all duration-500 group-hover:blur-lg" style="background: ${glowColor}; opacity: 0.6; transform: scale(1.1);"></div>
                    
                    <!-- SVG Chart (Absolute Background) -->
                    <svg width="${size}" height="${size}" viewBox="0 0 40 40" class="absolute inset-0 transform -rotate-90 drop-shadow-2xl z-10 pointer-events-none">
                        <circle r="${radius}" cx="20" cy="20" fill="#0f172a" stroke="#0f172a" stroke-width="6" />
                        ${svgSegments}
                        <circle r="${radius - 3.5}" cx="20" cy="20" fill="#0f172a" />
                    </svg>

                    <!-- Count Label (Relative Foreground) -->
                    <span style="font-size: ${fontSize}px; color: white !important; font-weight: 800; line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.9);" class="relative z-50 font-sans select-none pointer-events-none">
                        ${count}
                    </span>
                </div>
            `,
            className: 'bg-transparent',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
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
            {/* ZoomOutButton removed as functionality moved to Timeline */}
            {/* Dark themed tiles */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Single Cluster Group with Donut Chart Visualization */}
            <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
                spiderfyOnMaxZoom={true}
                maxClusterRadius={60}
                zoomToBoundsOnClick={false}
                onClick={robustClusterClick}
                iconCreateFunction={createClusterIcon}
            >
                {conflicts.map(conflict => (
                    <ConflictMarker key={conflict.id} conflict={conflict} />
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    )
}
