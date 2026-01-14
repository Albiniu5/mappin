
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

    // Create custom icon
    const customIcon = new DivIcon({
        className: 'bg-transparent',
        html: `
      <div class="relative group">
        <div class="absolute -inset-2 rounded-full ${colorClass} opacity-20 animate-ping group-hover:opacity-40"></div>
        <div class="relative w-8 h-8 rounded-full ${colorClass} border-2 border-slate-900 shadow-lg flex items-center justify-center text-xs transform transition-transform group-hover:scale-110">
          ${iconChar}
        </div>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20]
    })

    return (
        <Marker position={[conflict.latitude, conflict.longitude]} icon={customIcon}>
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
