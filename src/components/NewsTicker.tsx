'use client'

import { Database } from '@/types/supabase'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'

type Conflict = Database['public']['Tables']['conflicts']['Row']

interface NewsTickerProps {
    conflicts: Conflict[]
}

export default function NewsTicker({ conflicts }: NewsTickerProps) {
    const [headlines, setHeadlines] = useState<Conflict[]>([])

    useEffect(() => {
        // Take latest 10 conflicts
        if (conflicts.length > 0) {
            setHeadlines(conflicts.slice(0, 10))
        }
    }, [conflicts])

    if (headlines.length === 0) return null

    return (
        <div className="absolute bottom-0 left-0 w-full z-[1000] bg-slate-900/90 backdrop-blur-md border-t border-slate-700 h-10 flex items-center overflow-hidden">
            <div className="bg-red-600 text-white text-[10px] font-bold px-3 h-full flex items-center uppercase tracking-widest z-10 shrink-0 shadow-xl">
                Breaking News
            </div>

            <div className="flex-1 overflow-hidden relative h-full flex items-center">
                <div className="animate-marquee whitespace-nowrap flex gap-12 items-center text-xs text-slate-300">
                    {headlines.map((item, i) => (
                        <div key={item.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="font-bold text-slate-200">{format(new Date(item.published_at), 'HH:mm')}</span>
                            <span className="opacity-80 font-medium">{item.title}</span>
                            <span className="text-slate-500 text-[10px] uppercase">({item.location_name || 'Unknown'})</span>
                        </div>
                    ))}
                    {/* Duplicate for seamless loop */}
                    {headlines.map((item, i) => (
                        <div key={`dup-${item.id}`} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="font-bold text-slate-200">{format(new Date(item.published_at), 'HH:mm')}</span>
                            <span className="opacity-80 font-medium">{item.title}</span>
                            <span className="text-slate-500 text-[10px] uppercase">({item.location_name || 'Unknown'})</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
