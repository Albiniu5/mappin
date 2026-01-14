
'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'

interface TimelineProps {
    date: Date
    setDate: (date: Date) => void
    minDate?: Date
    maxDate?: Date
    isPlaying: boolean
    onPlayToggle: () => void
}

export default function Timeline({ date, setDate, minDate, maxDate, isPlaying, onPlayToggle }: TimelineProps) {
    const [mounted, setMounted] = useState(false)

    // Calculate range logic for the slider interface
    // using useRef to keep it stable and avoid re-renders or hydration mismatch
    const rangeRef = useRef({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    })

    useEffect(() => {
        // Update range props if provided
        rangeRef.current = {
            start: minDate || new Date(new Date().setDate(new Date().getDate() - 30)),
            end: maxDate || new Date()
        }
        setMounted(true)
    }, [minDate, maxDate])

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(Number(e.target.value))
        setDate(newDate)
    }

    if (!mounted) {
        return null
    }

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl z-[1000] flex items-center gap-4">
            <button
                onClick={onPlayToggle}
                className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                    {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </label>
                <input
                    type="range"
                    min={rangeRef.current.start.getTime()}
                    max={rangeRef.current.end.getTime()}
                    value={date.getTime()}
                    onChange={handleSliderChange}
                    step={24 * 60 * 60 * 1000} // 1 day steps
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    suppressHydrationWarning
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span suppressHydrationWarning>{rangeRef.current.start.toLocaleDateString('en-US')}</span>
                    <span suppressHydrationWarning>{rangeRef.current.end.toLocaleDateString('en-US')}</span>
                </div>
            </div>
        </div>
    )
}
