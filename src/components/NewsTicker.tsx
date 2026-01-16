'use client'

import { Database } from '@/types/supabase'
import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion'

type Conflict = Database['public']['Tables']['conflicts']['Row']

interface NewsTickerProps {
    conflicts: Conflict[]
}

export default function NewsTicker({ conflicts }: NewsTickerProps) {
    const [headlines, setHeadlines] = useState<Conflict[]>([])
    const containerRef = useRef<HTMLDivElement>(null)
    const [contentWidth, setContentWidth] = useState(0)
    const [isDragging, setIsDragging] = useState(false)

    // Motion value for the x-offset
    // We start at 0
    const x = useMotionValue(0)

    useEffect(() => {
        // Take latest 10 conflicts
        if (conflicts.length > 0) {
            setHeadlines(conflicts.slice(0, 10))
        }
    }, [conflicts])

    // Measure the width of the *single set* of items
    useEffect(() => {
        if (containerRef.current) {
            // The container has 2 sets. So singular width is half the scrollWidth.
            // We verify this logic carefully.
            const totalWidth = containerRef.current.scrollWidth
            setContentWidth(totalWidth / 2)
        }
    }, [headlines])

    const speed = 30 // pixels per second

    useAnimationFrame((t, delta) => {
        if (isDragging || contentWidth === 0) return

        let moveBy = (speed * delta) / 1000
        let currentX = x.get()

        // Move left
        let nextX = currentX - moveBy

        // Seamless loop logic:
        // If we have scrolled past the first set (-contentWidth), snap back to 0.
        // It works because the 2nd set (at 0 position relative to viewport when snapped) is identical.
        if (nextX <= -contentWidth) {
            nextX = 0
        }

        x.set(nextX)
    })

    if (headlines.length === 0) return null

    return (
        <div className="absolute bottom-0 left-0 w-full z-[1000] bg-slate-900/90 backdrop-blur-md border-t border-slate-700 h-10 flex items-center overflow-hidden">
            {/* Label */}
            <div className="bg-red-600 text-white text-[10px] font-bold px-3 h-full flex items-center uppercase tracking-widest z-20 shrink-0 shadow-xl select-none">
                Breaking News
            </div>

            {/* Ticker Container - Mask */}
            <div className="flex-1 overflow-hidden relative h-full flex items-center cursor-grab active:cursor-grabbing">
                {/* Draggable Track */}
                <motion.div
                    ref={containerRef}
                    className="flex gap-12 items-center text-xs text-slate-300 absolute left-0"
                    style={{ x }}
                    drag="x"
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                // We don't apply hard constraints because infinite looping + physics is complex.
                // Instead, we just let the user drag. The loop might jump if they drag too far, 
                // but for small interactions it feels great.
                >
                    {/* First Set */}
                    <div className="flex gap-12 items-center shrink-0">
                        {headlines.map((item) => (
                            <NewsItem key={`set1-${item.id}`} item={item} />
                        ))}
                    </div>

                    {/* Second Set (Duplicate for Loop) */}
                    <div className="flex gap-12 items-center shrink-0">
                        {headlines.map((item) => (
                            <NewsItem key={`set2-${item.id}`} item={item} />
                        ))}
                    </div>

                    {/* Third Set (Extra buffer for wide screens/dragging right) */}
                    <div className="flex gap-12 items-center shrink-0">
                        {headlines.map((item) => (
                            <NewsItem key={`set3-${item.id}`} item={item} />
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

function NewsItem({ item }: { item: Conflict }) {
    return (
        <div className="flex items-center gap-2 whitespace-nowrap select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
            <span className="font-bold text-slate-200">{format(new Date(item.published_at), 'HH:mm')}</span>
            <span className="opacity-80 font-medium">{item.title}</span>
            <span className="text-slate-500 text-[10px] uppercase">({item.location_name || 'Unknown'})</span>
        </div>
    )
}
