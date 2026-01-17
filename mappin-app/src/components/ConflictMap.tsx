"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Database } from '@/types/supabase';

type Conflict = Database['public']['Tables']['conflicts']['Row'];

// --- Icons & Constants ---
const createCustomIcon = (color: string, size: number = 30, text: string = '') => {
    return new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${Math.max(10, size / 2.5)}px;
        ">${text}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
};

// Donut chart icon for multi-item locations
const createDonutIcon = (stats: Record<string, number>, totalCount: number) => {
    const colors: Record<string, string> = {
        'Armed Conflict': '#dc2626',
        'Protest': '#f59e0b',
        'Political Unrest': '#ea580c',
        'Other': '#3b82f6'
    };

    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    let svgSegments = '';
    let accumulatedPercent = 0;

    Object.entries(stats).forEach(([cat, catCount]) => {
        if (catCount === 0) return;
        const percent = catCount / totalCount;
        const dashArray = `${percent * circumference} ${circumference}`;
        const dashOffset = -1 * accumulatedPercent * circumference;
        svgSegments += `<circle r="${radius}" cx="20" cy="20" fill="transparent" stroke="${colors[cat]}" stroke-width="6" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}" class="transition-all duration-300" />`;
        accumulatedPercent += percent;
    });

    const dominantCat = Object.keys(stats).reduce((a, b) => stats[a] > stats[b] ? a : b);
    const glowColor = colors[dominantCat] + '66';
    const baseSize = 40;
    const bonus = Math.min(Math.log10(totalCount) * 15, 30);
    const size = baseSize + bonus;
    const fontSize = Math.floor(size * 0.45);

    return new L.DivIcon({
        html: `
            <div style="position: relative; width: ${size}px; height: ${size}px;" class="group hover:scale-110 transition-transform duration-300">
                <!-- Glow -->
                <div style="position: absolute; inset: 0; border-radius: 9999px; filter: blur(8px); background: ${glowColor}; opacity: 0.6; transform: scale(1.1);" class="transition-all duration-500 group-hover:blur-lg"></div>
                
                <!-- SVG Donut Chart -->
                <svg width="${size}" height="${size}" viewBox="0 0 40 40" style="position: absolute; top: 0; left: 0; transform: rotate(-90deg); z-index: 1;" class="drop-shadow-2xl pointer-events-none">
                    <circle r="${radius}" cx="20" cy="20" fill="#0f172a" stroke="#0f172a" stroke-width="6" />
                    ${svgSegments}
                    <circle r="${radius - 3.5}" cx="20" cy="20" fill="#0f172a" />
                </svg>

                <!-- Count Label -->
                <div style="position: absolute; top: 0; left: 0; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; z-index: 9999; pointer-events: none;">
                    <span style="font-size: ${fontSize}px; color: #ffffff; font-weight: 900; line-height: 1; text-shadow: 0 2px 6px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.9); font-family: system-ui, -apple-system, sans-serif; user-select: none;">
                        ${totalCount}
                    </span>
                </div>
            </div>
        `,
        className: 'bg-transparent',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

// Simple ring icon for single items (no count)
const createRingIcon = (color: string, size: number = 30, hasJudge: boolean = false) => {
    const radius = 16;
    return new L.DivIcon({
        html: `
            <div style="position: relative; width: ${size}px; height: ${size}px;" class="group hover:scale-110 transition-transform duration-300">
                <!-- Glow -->
                <div style="position: absolute; inset: 0; border-radius: 9999px; filter: blur(8px); background: ${color}66; opacity: 0.6; transform: scale(1.1);" class="transition-all duration-500 group-hover:blur-lg"></div>
                
                <!-- SVG Ring -->
                <svg width="${size}" height="${size}" viewBox="0 0 40 40" style="position: absolute; top: 0; left: 0; transform: rotate(-90deg); z-index: 1;" class="drop-shadow-2xl pointer-events-none">
                    <circle r="${radius}" cx="20" cy="20" fill="#0f172a" stroke="${color}" stroke-width="6" />
                    <circle r="${radius - 3.5}" cx="20" cy="20" fill="#0f172a" />
                </svg>

                <!-- Judge Badge -->
                ${hasJudge ? `
                <div style="position: absolute; top: -4px; right: -4px; width: 18px; height: 18px; background: #4f46e5; border: 2px solid #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                    <span style="font-size: 10px; line-height: 1;">⚖️</span>
                </div>
                ` : ''}
            </div>
        `,
        className: 'bg-transparent',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

// Alien Icon Generator
const createAlienIcon = (type: string = 'Unknown', size: number = 30) => {
    const icons: Record<string, string> = {
        'Sighting': '🛸',
        'Abduction': '👽',
        'Crop Circle': '🌾',
        'Cattle Mutilation': '🐄',
        'Military Encounter': '✈️',
        'Telepathic Contact': '⚡',
        'Unknown': '🛸'
    };
    const emoji = icons[type] || '🛸';

    return new L.DivIcon({
        html: `
            <div style="position: relative; width: ${size}px; height: ${size}px;" class="group hover:scale-125 transition-transform duration-300">
                <!-- Eerie Glow -->
                <div style="position: absolute; inset: 0; border-radius: 50%; filter: blur(6px); background: #22c55e; opacity: 0.7; animation: pulse 2s infinite;"></div>
                
                <div style="
                    position: absolute; 
                    inset: 0; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: ${size * 0.8}px;
                    z-index: 10;
                    filter: drop-shadow(0 0 4px #000);
                ">${emoji}</div>
            </div>
        `,
        className: 'bg-transparent',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

// Alien Cluster Icon
const createAlienClusterIcon = (count: number) => {
    const size = 40 + Math.min(Math.log10(count) * 15, 30);
    return new L.DivIcon({
        html: `
            <div style="position: relative; width: ${size}px; height: ${size}px;" class="group hover:scale-110 transition-transform duration-300">
                <!-- Alien Glow -->
                <div style="position: absolute; inset: 0; border-radius: 50%; filter: blur(8px); background: #22c55e; opacity: 0.6; animation: pulse 2s infinite;"></div>
                
                <!-- Core -->
                <div style="
                    position: absolute; 
                    inset: 0; 
                    border: 2px solid #22c55e; 
                    border-radius: 50%; 
                    background: rgba(0,0,0,0.9); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
                ">
                    <span style="color: #22c55e; font-family: monospace; font-weight: bold; font-size: ${size * 0.4}px; text-shadow: 0 0 5px #22c55e;">
                        ${count}
                    </span>
                </div>
            </div>
        `,
        className: 'bg-transparent',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};


const CATEGORY_COLORS: Record<string, string> = {
    'Armed Conflict': '#ef4444',
    'Protest': '#eab308',
    'Political Unrest': '#f97316',
    'Other': '#3b82f6'
};

// --- Helper Functions ---
function getOffsetLatLng(map: L.Map, latlng: L.LatLng, pixelsX: number, pixelsY: number): L.LatLng {
    const point = map.latLngToContainerPoint(latlng);
    const newPoint = L.point(point.x + pixelsX, point.y + pixelsY);
    return map.containerPointToLatLng(newPoint);
}

// Sub-component to handle map reset events
const MapResetHandler = () => {
    const map = useMap();

    useEffect(() => {
        const handleMapReset = (e: CustomEvent) => {
            const { lat, lng, zoom } = e.detail;
            map.setView([lat, lng], zoom, { animate: true, duration: 1 });
        };

        window.addEventListener('map-reset-view', handleMapReset as EventListener);
        return () => window.removeEventListener('map-reset-view', handleMapReset as EventListener);
    }, [map]);

    return null;
};

// --- Sub-Component: Cluster Controller ---
const ClusterController = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
    useMapEvents({
        zoomend: (e) => onZoomChange(e.target.getZoom()),
    });
    return null;
};

// --- Main Component ---
interface ConflictMapProps {
    conflicts: Conflict[];
    onClusterClick?: (conflicts: Conflict[]) => void;
    theme?: 'dark' | 'light';
    isAlienMode?: boolean;
}

export default function ConflictMap({ conflicts, onClusterClick, theme = 'dark', isAlienMode = false }: ConflictMapProps) {
    // Defines a subset of conflicts that are currently "drilled down" (expanded)
    // Key: A unique ID for the cluster (e.g. "cluster-lat-lng")
    // Value: The data needed to render the drilled-down view
    const [activeClusters, setActiveClusters] = useState<Record<string, { center: L.LatLng, conflicts: Conflict[] }>>({});

    // Track 2nd level expansion (Category -> Events)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const [currentZoom, setCurrentZoom] = useState<number>(3); // Default zoom

    // Auto-collapse logic
    const handleZoomChange = useCallback((zoom: number) => {
        setCurrentZoom(zoom);
        if (zoom < 4) {
            setActiveClusters({});
            setExpandedCategories(new Set());
        }
    }, []);

    // Listen for map reset events from reset button
    useEffect(() => {
        const handleMapReset = (e: CustomEvent) => {
            // Collapse all expansions
            setActiveClusters({});
            setExpandedCategories(new Set());
            // Note: Map will reset view via Leaflet's internal controls
        };

        window.addEventListener('map-reset-view', handleMapReset as EventListener);
        return () => window.removeEventListener('map-reset-view', handleMapReset as EventListener);
    }, []);

    // --- Event Aggregation Logic ---
    // Group identical events (same location + category + date-ish) so they count as 1 in the cluster
    const aggregatedConflicts = useMemo(() => {
        const groups: Record<string, Conflict[]> = {};

        conflicts.forEach(c => {
            if (!c.latitude || !c.longitude) return;
            // Key: Location (3 decimals ~100m) + Category
            const key = `${c.latitude.toFixed(3)}-${c.longitude.toFixed(3)}-${c.category}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });

        return Object.values(groups).map(group => {
            // DEDUPLICATION: Remove exact duplicate articles (same URL or exact title)
            const uniqueStories: Conflict[] = [];
            const seenKeys = new Set<string>();

            group.forEach(story => {
                // Use URL as primary key, fallback to Title
                const uniqueKey = story.source_url || story.title;
                if (!seenKeys.has(uniqueKey)) {
                    seenKeys.add(uniqueKey);
                    uniqueStories.push(story);
                }
            });

            // Sort by Date Descending (Newest first)
            uniqueStories.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

            const primary = uniqueStories[0];
            // Attach ALL items in this group to the primary one for the Sidebar to display
            return {
                ...primary,
                related_stories: uniqueStories, // New property to store all articles
                // Use a combined title if multiple stories? No, stick to primary for map.
                title: uniqueStories.length > 1 ? `${primary.title} (+${uniqueStories.length - 1} related)` : primary.title
            };
        });
    }, [conflicts]);

    // Filter: Only show conflicts in the ClusterGroup if they are NOT part of an active drill-down
    const visibleConflicts = useMemo(() => {
        const activeIds = new Set<string>();
        Object.values(activeClusters).forEach(cluster => {
            cluster.conflicts.forEach(c => activeIds.add(c.id));
        });
        return aggregatedConflicts.filter(c => !activeIds.has(c.id));
    }, [aggregatedConflicts, activeClusters]); // DEPEND ON AGGREGATED

    const handleClusterClick = (cluster: any) => {
        // Check if this is actually a cluster (not a single marker)
        if (!cluster.getAllChildMarkers || typeof cluster.getAllChildMarkers !== 'function') {
            return;
        }

        const children = cluster.getAllChildMarkers();

        // If only 1 child (which might be an Aggregated Event of 29 articles)
        if (children.length === 1) {
            const markerData = children[0].options.conflictData;
            // Pass ALL related stories to the Sidebar
            const stories = markerData.related_stories || [markerData];
            if (onClusterClick) {
                onClusterClick(stories);
            }
            return;
        }

        // Multi-item cluster: Explode into drill-down + Open sidebar
        const clusterConflicts: Conflict[] = children.map((marker: any) => marker.options.conflictData);
        // FLATTEN all stories for the sidebar
        const allStories = clusterConflicts.flatMap((c: any) => c.related_stories || [c]);

        const center = cluster.getLatLng();

        // IMPORTANT: Show ALL conflicts in sidebar immediately
        if (onClusterClick) {
            onClusterClick(allStories);
        }

        // Create unique key for this interaction
        const clusterKey = `${center.lat.toFixed(6)}-${center.lng.toFixed(6)}-${Date.now()}`;

        // Zoom first (Gentle)
        const map = cluster._map;
        if (map.getZoom() < 6) {
            map.flyTo(center, 6);
        }

        // Set state to "Explode" this cluster
        setActiveClusters(prev => ({
            ...prev,
            [clusterKey]: { center, conflicts: clusterConflicts }
        }));
    };

    // Toggle Category Expansion with optional zoom
    const toggleCategory = (catKey: string, position?: L.LatLng, mapInstance?: L.Map) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            const isExpanding = !next.has(catKey);

            if (next.has(catKey)) {
                next.delete(catKey);
            } else {
                next.add(catKey);

                // Small zoom on expansion for better UX
                if (isExpanding && position && mapInstance) {
                    const currentZoom = mapInstance.getZoom();
                    // Gentle zoom: +1 level, capped at 12
                    const targetZoom = Math.min(currentZoom + 1, 12);
                    mapInstance.flyTo(position, targetZoom, { duration: 0.5 });
                }
            }

            return next;
        });
    };

    // Refactored Marker Click Handler with Debugging and Strict Sequencing
    const handleMarkerClick = (e: any, c: any) => {
        console.log("📍 Marker Clicked:", c.title);
        L.DomEvent.stopPropagation(e);

        // 1. Open Sidebar immediately
        // @ts-ignore
        const stories = c.related_stories || [c];
        if (onClusterClick) {
            console.log("📝 Opening Sidebar");
            onClusterClick(stories);
        }

        const marker = e.target;
        const map = marker._map;

        if (map) {
            console.log("🗺️ Map instance found. Current Zoom:", map.getZoom());
            const isPopupOpen = marker.isPopupOpen && marker.isPopupOpen();

            if (!isPopupOpen) {
                const currentZoom = map.getZoom();
                // Cinematic Zoom Target: +3 levels, max 18
                const targetZoom = Math.min(currentZoom + 3, 18);

                console.log(`🔎 Target Zoom: ${targetZoom} (Current: ${currentZoom})`);

                if (targetZoom > currentZoom) {
                    // Close any existing popup first
                    map.closePopup();

                    console.log("🎬 Starting Cinematic Zoom (1.5s)...");
                    map.flyTo(e.latlng, targetZoom, { duration: 1.5, easeLinearity: 0.25 });

                    // Force strict wait
                    console.log("⏳ Waiting 1.6s for animation...");
                    setTimeout(() => {
                        console.log("✅ Timeout done. Opening Popup.");
                        marker.openPopup();
                    }, 1600);
                } else {
                    console.log("ℹ️ Already deep zoomed. Opening Popup.");
                    marker.openPopup();
                }
            } else {
                console.log("⚠️ Popup already open.");
                marker.openPopup();
            }
        } else {
            console.error("❌ Map instance NOT found on marker target!");
        }
    };

    return (
        <MapContainer
            center={[20, 0]}
            zoom={3}
            zoomControl={false}
            className="w-full h-full z-0"
            style={{ background: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
            minZoom={3}
            maxBounds={[[-90, -180], [90, 180]]}
        >
            <TileLayer
                className={isAlienMode ? 'filter sepia hue-rotate-[90deg] contrast-125 brightness-75 transition-all duration-1000' : 'transition-all duration-1000'}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url={theme === 'dark' || isAlienMode
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                }
            />

            <ClusterController onZoomChange={handleZoomChange} />
            <MapResetHandler />

            {/* 1. World View: Cluster Group for Unexpanded Items */}
            <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
                spiderfyOnMaxZoom={false}
                zoomToBoundsOnClick={false}
                maxClusterRadius={60}
                iconCreateFunction={(cluster: any) => {
                    const markers = cluster.getAllChildMarkers();

                    // ALIEN MODE CLUSTER
                    if (isAlienMode) {
                        return createAlienClusterIcon(markers.length);
                    }

                    // STANDARD CLUSTER
                    const stats: Record<string, number> = { 'Armed Conflict': 0, 'Protest': 0, 'Political Unrest': 0, 'Other': 0 };
                    markers.forEach((m: any) => {
                        const cat = m.options.conflictData?.category;
                        const safeCat = ['Armed Conflict', 'Protest', 'Political Unrest'].includes(cat) ? cat : 'Other';
                        stats[safeCat] = (stats[safeCat] || 0) + 1;
                    });
                    return createDonutIcon(stats, markers.length);
                }}
                // Custom styles for Alien Clusters
                polygonOptions={{
                    color: isAlienMode ? '#22c55e' : '#3b82f6',
                    fillColor: isAlienMode ? '#22c55e' : '#3b82f6',
                }}
                // CRITICAL FIX: Use eventHandlers instead of onClick
                eventHandlers={{
                    clusterclick: (e: any) => handleClusterClick(e.layer)
                }}
            >
                {visibleConflicts.map(c => (
                    <Marker
                        key={c.id}
                        position={[c.latitude!, c.longitude!]} // Assumes valid from filter
                        icon={isAlienMode
                            ? createAlienIcon((c.related_reports as any)?.alien_specific_type || 'Unknown')
                            : createRingIcon(CATEGORY_COLORS[c.category] || CATEGORY_COLORS['Other'], 30, !!c.narrative_analysis || (Array.isArray(c.related_reports) && c.related_reports.length > 0))
                        }
                        title={c.title}
                        // @ts-ignore
                        conflictData={c}
                        eventHandlers={{
                            click: (e) => {
                                L.DomEvent.stopPropagation(e);

                                // 1. Open Sidebar immediately
                                // @ts-ignore
                                const stories = c.related_stories || [c];
                                if (onClusterClick) onClusterClick(stories);

                                // @ts-ignore
                                const marker = e.target;
                                const map = marker._map;

                                if (map) {
                                    // Check if popup is currently open
                                    const isPopupOpen = marker.isPopupOpen && marker.isPopupOpen();

                                    // 2. Sequence: If needs zoom, Zoom FIRST, then Popup.
                                    if (!isPopupOpen) {
                                        const currentZoom = map.getZoom();
                                        const targetZoom = Math.min(currentZoom + 2, 16);

                                        if (targetZoom > currentZoom) {
                                            // Perform zoom
                                            map.flyTo(e.latlng, targetZoom, { duration: 0.5 });
                                            // Wait for zoom to finish before opening popup
                                            map.once('moveend', () => {
                                                marker.openPopup();
                                            });
                                        } else {
                                            // Already zoomed in? Just open popup
                                            marker.openPopup();
                                        }
                                    } else {
                                        // Popup already open? Keep it open.
                                        marker.openPopup();
                                    }
                                }
                            }
                        }}
                    >
                        <Popup className="custom-popup" minWidth={300}>
                            <div className={isAlienMode ? "p-1 font-mono" : "p-1"}>
                                <div className="flex justify-between items-start mb-3">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${isAlienMode ? 'text-black border border-green-400' : 'text-white'}`}
                                        style={{ backgroundColor: isAlienMode ? '#22c55e' : (CATEGORY_COLORS[c.category] || CATEGORY_COLORS['Other']) }}
                                    >
                                        {c.category}
                                    </span>
                                    <span className={isAlienMode ? "text-xs text-green-600 font-bold uppercase tracking-widest" : "text-xs text-slate-400 font-medium"}>
                                        {new Date(c.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                                <h3 className={isAlienMode ? "text-sm font-bold text-green-400 mb-2 leading-snug uppercase tracking-wider" : "text-sm font-bold text-slate-900 mb-2 leading-snug"}>
                                    {c.title}
                                </h3>
                                {c.description && (
                                    <p className={isAlienMode ? "text-xs text-green-700 mb-3 line-clamp-3 leading-relaxed border-l-2 border-green-900/50 pl-2" : "text-xs text-slate-600 mb-3 line-clamp-3 leading-relaxed"}>
                                        {c.description}
                                    </p>
                                )}
                                <div className={isAlienMode ? "flex justify-between items-center pt-2 border-t border-green-900/30" : "flex justify-between items-center pt-2 border-t border-slate-100"}>
                                    <a
                                        href={c.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={isAlienMode ? "text-xs font-bold text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors uppercase tracking-wider" : "text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {isAlienMode ? 'ACCESS DATA LOG' : 'Read Source'} <span className="text-[10px]">→</span>
                                    </a>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>

            {/* 2. Drill-Down View: Custom Rendering for Active Clusters */}
            <ActiveClusterLayer
                activeClusters={activeClusters}
                expandedCategories={expandedCategories}
                onToggleCategory={toggleCategory}
                onMarkerClick={handleMarkerClick}
                isAlienMode={isAlienMode}
            />

        </MapContainer>
    );
}

// Sub-component to render the "Drill-Down" state (Level 1 & 2)
function ActiveClusterLayer({
    activeClusters,
    expandedCategories,
    onToggleCategory,
    onMarkerClick,
    isAlienMode = false
}: {
    activeClusters: Record<string, { center: L.LatLng, conflicts: Conflict[] }>,
    expandedCategories: Set<string>,
    onToggleCategory: (id: string, position?: L.LatLng, map?: L.Map) => void,
    onMarkerClick: (e: any, c: any) => void,
    isAlienMode?: boolean
}) {
    const map = useMap();

    return (
        <>
            {Object.entries(activeClusters).map(([clusterKey, group]) => {
                const centerLatLng = group.center;

                // Group conflicts by category (Level 1)
                const categoryGroups: Record<string, Conflict[]> = {};
                group.conflicts.forEach(c => {
                    if (!categoryGroups[c.category]) categoryGroups[c.category] = [];
                    categoryGroups[c.category].push(c);
                });

                const categories = Object.keys(categoryGroups);
                const stepAngle = (2 * Math.PI) / categories.length;
                const PIXEL_RADIUS = 50;

                return categories.map((cat, index) => {
                    const angle = index * stepAngle - (Math.PI / 2); // Start North
                    const pixelX = Math.cos(angle) * PIXEL_RADIUS;
                    const pixelY = Math.sin(angle) * PIXEL_RADIUS;

                    const catLatLng = getOffsetLatLng(map, centerLatLng, pixelX, pixelY);
                    const catConflicts = categoryGroups[cat];
                    const catCount = catConflicts.length;
                    const catKey = `${clusterKey}-${cat}`;
                    const isCatExpanded = expandedCategories.has(catKey);

                    const connector = (
                        <Polyline
                            key={`line-${catKey}`}
                            positions={[centerLatLng, catLatLng]}
                            pathOptions={{
                                color: isAlienMode ? '#22c55e' : 'white',
                                weight: 1,
                                opacity: 0.5,
                                dashArray: '4 4'
                            }}
                        />
                    );

                    // Category Bubble (Level 1)
                    if (!isCatExpanded) {
                        return (
                            <Fragment key={`group-${catKey}`}>
                                {connector}
                                <Marker
                                    position={catLatLng}
                                    icon={isAlienMode
                                        ? createAlienClusterIcon(catCount)
                                        : createCustomIcon(CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'], 35, catCount.toString())
                                    }
                                    eventHandlers={{
                                        click: (e) => {
                                            L.DomEvent.stopPropagation(e);
                                            onToggleCategory(catKey, catLatLng, map);
                                        }
                                    }}
                                />
                            </Fragment>
                        );
                    }

                    // Events (Level 2)
                    const evtStepAngle = (2 * Math.PI) / catCount;
                    const EVT_PIXEL_RADIUS = 30;

                    return (
                        <Fragment key={`group-${catKey}`}>
                            {connector}
                            {catConflicts.map((c: any, i: number) => {
                                const evtAngle = i * evtStepAngle - (Math.PI / 2);
                                const eX = Math.cos(evtAngle) * EVT_PIXEL_RADIUS;
                                const eY = Math.sin(evtAngle) * EVT_PIXEL_RADIUS;
                                const evtLatLng = getOffsetLatLng(map, catLatLng, eX, eY);

                                const evtConnector = (
                                    <Polyline
                                        key={`line-${c.id}`}
                                        positions={[catLatLng, evtLatLng]}
                                        pathOptions={{
                                            color: isAlienMode ? '#22c55e' : (CATEGORY_COLORS[cat] || 'white'),
                                            weight: 1,
                                            opacity: 0.8
                                        }}
                                    />
                                );

                                const hasJudge = !!c.narrative_analysis || (Array.isArray(c.related_reports) && c.related_reports.length > 0);
                                return (
                                    <Fragment key={`evt-wrapper-${c.id}`}>
                                        {evtConnector}
                                        <Marker
                                            position={evtLatLng}
                                            icon={isAlienMode
                                                ? createAlienIcon((c.related_reports as any)?.alien_specific_type || 'Unknown')
                                                : createRingIcon(CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'], 20, hasJudge)
                                            }
                                            eventHandlers={{
                                                click: (e) => onMarkerClick(e, c)
                                            }}
                                        >
                                            <Popup className="custom-popup" minWidth={300}>
                                                <div className={isAlienMode ? "p-1 font-mono" : "p-1"}>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${isAlienMode ? 'text-black border border-green-400' : 'text-white'}`}
                                                            style={{ backgroundColor: isAlienMode ? '#22c55e' : (CATEGORY_COLORS[c.category] || CATEGORY_COLORS['Other']) }}
                                                        >
                                                            {c.category}
                                                        </span>
                                                        <span className={isAlienMode ? "text-xs text-green-600 font-bold uppercase tracking-widest" : "text-xs text-slate-400 font-medium"}>
                                                            {new Date(c.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <h3 className={isAlienMode ? "text-sm font-bold text-green-400 mb-2 leading-snug uppercase tracking-wider" : "text-sm font-bold text-slate-900 mb-2 leading-snug"}>
                                                        {c.title}
                                                    </h3>
                                                    {c.description && (
                                                        <p className={isAlienMode ? "text-xs text-green-700 mb-3 line-clamp-3 leading-relaxed border-l-2 border-green-900/50 pl-2" : "text-xs text-slate-600 mb-3 line-clamp-3 leading-relaxed"}>
                                                            {c.description}
                                                        </p>
                                                    )}
                                                    <div className={isAlienMode ? "flex justify-between items-center pt-2 border-t border-green-900/30" : "flex justify-between items-center pt-2 border-t border-slate-100"}>
                                                        <a
                                                            href={c.source_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={isAlienMode ? "text-xs font-bold text-green-500 hover:text-green-400 flex items-center gap-1 transition-colors uppercase tracking-wider" : "text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {isAlienMode ? 'ACCESS DATA LOG' : 'Read Source'} <span className="text-[10px]">→</span>
                                                        </a>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </Fragment>
                                );
                            })}
                        </Fragment>
                    );
                });
            })}
        </>
    );
}
