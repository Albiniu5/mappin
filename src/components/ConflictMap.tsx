
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

            {/* Single Cluster Group with Donut Chart Visualization */}
            <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
                spiderfyOnMaxZoom={true} // Allow spiderfy to see individual pins at max zoom
                maxClusterRadius={50} // Slightly larger radius to gather more points
                zoomToBoundsOnClick={false}
                onClick={(e: any) => {
                    const cluster = e.layer;
                    handleClusterClick(cluster);
                    const map = cluster._map;
                    map.flyTo(cluster.getLatLng(), map.getZoom() + 2, { duration: 1 });
                }}
                iconCreateFunction={(cluster: any) => {
                    const markers = cluster.getAllChildMarkers();
                    const count = cluster.getChildCount();

                    // 1. Tally Categories (Approximation via LatLng lookup)
                    // We assume 'conflicts' prop is available in scope.
                    const stats: Record<string, number> = {
                        'Armed Conflict': 0, 'Protest': 0, 'Political Unrest': 0, 'Other': 0
                    };

                    markers.forEach((marker: any) => {
                        const pos = marker.getLatLng();
                        // Find match (simple strict equality usually works for unchanged data)
                        // Use a small epsilon for float precision safety
                        const match = conflicts.find(c =>
                            Math.abs(c.latitude - pos.lat) < 0.00001 &&
                            Math.abs(c.longitude - pos.lng) < 0.00001
                        );
                        if (match) {
                            const cat = ['Armed Conflict', 'Protest', 'Political Unrest'].includes(match.category)
                                ? match.category
                                : 'Other';
                            stats[cat] = (stats[cat] || 0) + 1;
                        } else {
                            stats['Other'] = (stats['Other'] || 0) + 1;
                        }
                    });

                    // 2. Calculate SVG Segments
                    // Colors: Red (Armed), Amber (Protest), Orange (Unrest), Blue (Other)
                    const colors: Record<string, string> = {
                        'Armed Conflict': '#dc2626', // Red-600
                        'Protest': '#f59e0b', // Amber-500
                        'Political Unrest': '#ea580c', // Orange-600
                        'Other': '#3b82f6' // Blue-500
                    };

                    let svgSegments = '';
                    let accumulatedPercent = 0;
                    const radius = 16;
                    const circumference = 2 * Math.PI * radius; // ~100.53

                    Object.entries(stats).forEach(([cat, catCount]) => {
                        if (catCount === 0) return;
                        const percent = catCount / count;
                        const dashArray = `${percent * circumference} ${circumference}`;
                        const dashOffset = -1 * accumulatedPercent * circumference;

                        // Note: dashoffset must be negative for clockwise rotation
                        svgSegments += `
                            <circle r="${radius}" cx="20" cy="20" fill="transparent" 
                                    stroke="${colors[cat]}" stroke-width="6" 
                                    stroke-dasharray="${dashArray}" 
                                    stroke-dashoffset="${dashOffset}"
                                    class="transition-all duration-300" />
                        `;
                        accumulatedPercent += percent;
                    });

                    // 3. Determine Dominant Color for Glow
                    const dominantCat = Object.keys(stats).reduce((a, b) => stats[a] > stats[b] ? a : b);
                    const glowColor = colors[dominantCat] + '66'; // Add transparency (40% hex)

                    // 4. Size Scaling
                    const baseSize = 40;
                    const bonus = Math.min(Math.log10(count) * 15, 30);
                    const size = baseSize + bonus;
                    const fontSize = Math.round(size * 0.45); // Font is 45% of the total diameter

                    return new DivIcon({
                        html: `
                            <div class="relative flex items-center justify-center w-full h-full group hover:scale-110 transition-transform duration-300" 
                                 title="${count} conflicts">
                                <!-- Glow -->
                                <div class="absolute inset-0 rounded-full blur-md transition-all duration-500 group-hover:blur-lg" 
                                     style="background: ${glowColor}; opacity: 0.6; transform: scale(1.1);"></div>
                                
                                <!-- Chart Container -->
                                <svg width="${size}" height="${size}" viewBox="0 0 40 40" class="transform -rotate-90 drop-shadow-2xl relative z-10">
                                    <!-- Background Circle (Dark) -->
                                    <circle r="${radius}" cx="20" cy="20" fill="#0f172a" stroke="#0f172a" stroke-width="6" />
                                    
                                    <!-- Segments -->
                                    ${svgSegments}

                                    <!-- Inner Circle (Hole) -->
                                    <circle r="${radius - 3.5}" cx="20" cy="20" fill="#0f172a" />
                                </svg>

                                <!-- Count Label -->
                                <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                    <span class="text-white font-bold drop-shadow-md leading-none tracking-tighter font-sans" 
                                          style="font-size: ${fontSize}px;">
                                        ${count}
                                    </span>
                                </div>
                            </div>
                        `,
                        className: 'bg-transparent',
                        iconSize: [size, size],
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
