'use client'

import { Database } from '@/types/supabase'
import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { motion, useAnimationFrame, useMotionValue, useMotionValueEvent } from 'framer-motion'


type Conflict = Database['public']['Tables']['conflicts']['Row']

interface NewsTickerProps {
    conflicts: Conflict[]
}

export default function NewsTicker({ conflicts }: NewsTickerProps) {
    const [headlines, setHeadlines] = useState<Conflict[]>([])
    const containerRef = useRef<HTMLDivElement>(null)
    const [contentWidth, setContentWidth] = useState(0)
    const [isDragging, setIsDragging] = useState(false)

    // Start at 0, will be adjusted once we measure width
    const x = useMotionValue(0)

    useEffect(() => {
        // Take latest 10 conflicts, or more if needed to fill width? 
        // 10 is usually enough for a long strip.
        if (conflicts.length > 0) {
            setHeadlines(conflicts.slice(0, 15)) // Increased to 15 to ensure density
        }
    }, [conflicts])

    // Measure the width of a *single set*
    useEffect(() => {
        if (containerRef.current) {
            // We have 3 sets in the container.
            // scrollWidth is total width.
            const totalWidth = containerRef.current.scrollWidth
            const singleSetWidth = totalWidth / 3
            setContentWidth(singleSetWidth)

            // Set initial position to show the MIDDLE set (Set 2)
            // This gives us buffer space on both left (Set 1) and right (Set 3)
            x.set(-singleSetWidth)
        }
    }, [headlines, x])

    const speed = 30 // pixels per second

    // 1. Auto-scroll Logic
    useAnimationFrame((t, delta) => {
        if (isDragging || contentWidth === 0) return

        let moveBy = (speed * delta) / 1000
        let currentX = x.get()
        x.set(currentX - moveBy)
    })

    // 2. Infinite Loop / Wrap Logic (Works during Drag too!)
    useMotionValueEvent(x, "change", (latest) => {
        if (contentWidth === 0) return

        // If we've scrolled past the 2nd set (viewing 3rd set), jump back to 1st set (visual equivalent of 2nd)
        // Range: [0 ... -W ... -2W]
        // Center (Set 2) starts at -W.

        // If we drag RIGHT (positive) and reach 0 (Start of Set 1),
        // we should jump to -W (Start of Set 2).
        if (latest > 0) {
            x.set(latest - contentWidth)
        }
        // If we drag/scroll LEFT (negative) and reach -2W (Start of Set 3),
        // we should jump to -W (Start of Set 2).
        else if (latest <= -2 * contentWidth) {
            x.set(latest + contentWidth)
        }
    })

    if (headlines.length === 0) return null

    return (
        <div className="absolute bottom-0 left-0 w-full z-[1000] bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 h-10 flex items-center overflow-hidden">
            {/* Label */}
            <div className="bg-red-600 text-white text-[10px] font-bold px-3 h-full flex items-center uppercase tracking-widest z-20 shrink-0 shadow-xl select-none pointer-events-none">
                Breaking News
            </div>

            {/* Ticker Container - Mask */}
            <div className="flex-1 overflow-hidden relative h-full flex items-center cursor-grab active:cursor-grabbing">
                {/* Draggable Track */}
                <motion.div
                    ref={containerRef}
                    className="flex items-center absolute left-0 will-change-transform" // Remove gap here, put padding in items if needed to be precise
                    style={{ x }}
                    drag="x"
                    dragConstraints={{ left: -Infinity, right: Infinity }} // Allow infinite drag, we handle wrapping manually
                    dragElastic={0} // No rubber banding, strict path
                    dragMomentum={false} // Instant stop on release (preference? User said "proceed like usual", maybe momentum=false is better to resume scroll immediately)
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                >
                    {/* 3 Identical Sets for Seamless Infinite Scroll + Drag */}

                    {/* Set 1 (Left Buffer) */}
                    <div className="flex gap-12 items-center shrink-0 px-6">
                        {headlines.map((item) => (
                            <NewsItem key={`set1-${item.id}`} item={item} />
                        ))}
                    </div>

                    {/* Set 2 (Primary/Center) */}
                    <div className="flex gap-12 items-center shrink-0 px-6">
                        {headlines.map((item) => (
                            <NewsItem key={`set2-${item.id}`} item={item} />
                        ))}
                    </div>

                    {/* Set 3 (Right Buffer) */}
                    <div className="flex gap-12 items-center shrink-0 px-6">
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
            <span className="font-bold text-slate-700 dark:text-slate-200">{format(new Date(item.published_at), 'HH:mm')}</span>
            <span className="opacity-80 font-medium text-slate-800 dark:text-slate-200">{item.title}</span>
            <span className="text-slate-500 text-[10px] uppercase">({item.location_name || 'Unknown'})</span>
        </div>
    )
}
