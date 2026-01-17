
'use client'

import { Marker, Popup } from 'react-leaflet'
import { DivIcon } from 'leaflet'
import { Database } from '@/types/supabase'
import { format } from 'date-fns'

type Conflict = Database['public']['Tables']['conflicts']['Row']

interface ConflictMarkerProps {
    conflict: Conflict
}

const getSeverityColor = (severity: number) => {
    if (severity >= 5) return 'bg-red-600 shadow-red-500/50'
    if (severity === 4) return 'bg-orange-600 shadow-orange-500/50'
    if (severity === 3) return 'bg-amber-500 shadow-amber-500/50'
    return 'bg-blue-500 shadow-blue-500/50'
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Armed Conflict': return '⚔️'
        case 'Protest': return '📣'
        case 'Political Unrest': return '⚠️'
        default: return '📍'
    }
}

export default function ConflictMarker({ conflict }: ConflictMarkerProps) {
    const colorClass = getSeverityColor(conflict.severity)
    const iconChar = getCategoryIcon(conflict.category)

    // Create custom icon with premium animations
    const customIcon = new DivIcon({
        className: 'bg-transparent',
        html: `
      <div class="relative group cursor-pointer flex items-center justify-center w-10 h-10">
        <!-- Outer pulsing beacon (Radar Effect) -->
        <div class="absolute w-3 h-3 rounded-full ${colorClass.replace('bg-', 'bg-').split(' ')[0]} animate-beacon opacity-75"></div>
        
        <!-- Inner glow -->
        <div class="absolute w-3 h-3 rounded-full ${colorClass.replace('bg-', 'bg-').split(' ')[0]} blur-[2px] opacity-100"></div>

        <!-- Core marker -->
        <div class="relative z-10 w-3 h-3 rounded-full ${colorClass} border-2 border-white shadow-lg transition-transform duration-300 group-hover:scale-150"></div>
        
        <!-- Hover Label (Tooltip style) -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
            <div class="bg-slate-900/90 backdrop-blur text-white text-[10px] px-2 py-1 rounded shadow-xl border border-slate-700 flex items-center gap-1">
                <span>${iconChar}</span>
                <span class="font-bold">${conflict.category}</span>
            </div>
        </div>
      </div>
    `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -10]
    })

    return (
        <Marker
            position={[conflict.latitude, conflict.longitude]}
            icon={customIcon}
            title={conflict.id} // Store ID for cluster lookup
        >
            <Popup className="leaflet-popup-dark">
                <div className="p-1 min-w-[250px]">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorClass} text-white bg-opacity-80`}>
                            {conflict.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {format(new Date(conflict.published_at), 'MMM d, yyyy')}
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1 leading-tight">{conflict.title}</h3>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-3">{conflict.description}</p>
                    <a
                        href={conflict.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-colors inline-block font-medium"
                    >
                        Read Source &rarr;
                    </a>
                </div>
            </Popup>
        </Marker>
    )
}
