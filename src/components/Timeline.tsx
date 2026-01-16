
'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, FastForward, Calendar, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface TimelineProps {
    date: Date
    setDate: (date: Date) => void
    minDate?: Date
    maxDate?: Date
    isPlaying: boolean
    onPlayToggle: () => void
    playbackSpeed?: number
    setPlaybackSpeed?: (speed: number) => void
}

export default function Timeline({ date, setDate, minDate, maxDate, isPlaying, onPlayToggle, playbackSpeed = 1, setPlaybackSpeed }: TimelineProps) {
    const [mounted, setMounted] = useState(false)
    const [showCalendar, setShowCalendar] = useState(false)
    const [internalDate, setInternalDate] = useState<Date>(date) // Local state for smooth dragging
    const [isDragging, setIsDragging] = useState(false)

    // Sync internal state when prop changes (unless dragging)
    useEffect(() => {
        if (!isDragging) {
            setInternalDate(date)
        }
    }, [date, isDragging])

    const [range, setRange] = useState({
        start: minDate || new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    })

    useEffect(() => {
        setMounted(true)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Normalize props to be safe
        const safeMax = maxDate ? new Date(maxDate) : today
        safeMax.setHours(0, 0, 0, 0)

        const newEnd = safeMax > today ? safeMax : today
        console.log(`🎚️ Timeline Range (Normalized): MaxProp=${maxDate?.toLocaleDateString()}, CalculatedEnd=${newEnd.toLocaleDateString()}`)

        const start = minDate ? new Date(minDate) : new Date(new Date().setDate(new Date().getDate() - 30))
        start.setHours(0, 0, 0, 0)

        setRange({
            start: start,
            end: newEnd
        })
    }, [minDate, maxDate])

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(Number(e.target.value))
        setInternalDate(newDate) // Update UI immediately
        if (!isDragging) setIsDragging(true)
    }

    const commitDateChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        const finalDate = new Date(Number(target.value))
        setInternalDate(finalDate)
        setDate(finalDate) // Commit to parent
        setIsDragging(false)
    }

    const handleSpeedChange = () => {
        if (!setPlaybackSpeed) return;
        const speeds = [1, 2, 5];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
        setPlaybackSpeed(nextSpeed);
    }

    const handlePrevDay = () => {
        const newDate = new Date(internalDate);
        newDate.setDate(newDate.getDate() - 1);

        // Normalize for comparison
        const compareDate = new Date(newDate);
        compareDate.setHours(0, 0, 0, 0);
        const startCompare = new Date(range.start);
        startCompare.setHours(0, 0, 0, 0);

        if (compareDate >= startCompare) {
            setInternalDate(newDate);
            setDate(newDate);
        }
    };

    const handleNextDay = () => {
        const newDate = new Date(internalDate);
        newDate.setDate(newDate.getDate() + 1);

        // Normalize for comparison
        const compareDate = new Date(newDate);
        compareDate.setHours(0, 0, 0, 0);
        const endCompare = new Date(range.end);
        endCompare.setHours(0, 0, 0, 0);

        if (compareDate <= endCompare) {
            setInternalDate(newDate);
            setDate(newDate);
        }
    };

    // Calculate progress percentage using internal date for smoothness
    const progress = range.start && range.end
        ? ((internalDate.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100
        : 0;

    if (!mounted) {
        return null
    }

    return (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl z-[1000] flex items-center gap-4">

            {/* Controls Group */}
            <div className="flex items-center gap-2">
                <button
                    onClick={handlePrevDay}
                    className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-600"
                    title="Previous Day"
                >
                    <ChevronLeft size={16} />
                </button>

                <button
                    onClick={onPlayToggle}
                    className={`p-3 rounded-full ${isPlaying ? 'bg-orange-600 hover:bg-orange-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} text-white transition-all shadow-lg`}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                <button
                    onClick={handleNextDay}
                    className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-600"
                    title="Next Day"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Playback speed control */}
            {setPlaybackSpeed && (
                <button
                    onClick={handleSpeedChange}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors border border-slate-600 min-w-[50px]"
                    title="Change playback speed"
                >
                    <FastForward size={14} className="inline mr-1" />
                    {playbackSpeed}x
                </button>
            )}

            <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-mono uppercase tracking-wider flex justify-between items-center">
                    <span>{internalDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {isPlaying && <span className="text-orange-400 animate-pulse">● Playing</span>}
                </label>

                {/* Progress bar background */}
                <div className="relative w-full">
                    {/* Animated progress fill */}
                    <div
                        className="absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-500 to-orange-500 rounded-lg transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />

                    {/* Slider */}
                    <input
                        type="range"
                        min={range.start.getTime()}
                        max={range.end.getTime()}
                        value={internalDate.getTime()}
                        onChange={handleSliderChange}
                        onMouseUp={commitDateChange}
                        onTouchEnd={commitDateChange}
                        step={24 * 60 * 60 * 1000} // 1 day steps
                        className="relative w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                        suppressHydrationWarning
                    />
                </div>
                <div className="flex items-center justify-between gap-2">
                    {/* Jump to Today */}
                    <button
                        onClick={() => {
                            const now = new Date();
                            setInternalDate(now);
                            setDate(now);
                            // Reset map view to global
                            window.dispatchEvent(new CustomEvent('map-fly-to', {
                                detail: { lat: 20, lng: 0, zoom: 2.5 }
                            }));
                        }}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-blue-600 transition-all duration-300 group"
                        title="Jump to Today & Reset View"
                    >
                        <RotateCcw className="w-5 h-5 text-blue-400 group-hover:text-white" />
                    </button>

                    {/* Calendar Picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="p-2 rounded-lg bg-slate-700 hover:bg-purple-600 transition-all duration-300 group"
                            title="Pick Date"
                        >
                            <Calendar className="w-5 h-5 text-purple-400 group-hover:text-white" />
                        </button>
                        {showCalendar && (
                            <div className="absolute bottom-12 left-0 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-2xl z-50">
                                <input
                                    type="date"
                                    value={internalDate.toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        const [y, m, d] = e.target.value.split('-').map(Number);
                                        const newDate = new Date(y, m - 1, d);
                                        setInternalDate(newDate);
                                        setDate(newDate);
                                        setShowCalendar(false);
                                    }}
                                    min={range.start.toISOString().split('T')[0]}
                                    max={range.end.toISOString().split('T')[0]}
                                    className="bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono flex-1">
                        <span suppressHydrationWarning>{range.start.toLocaleDateString('en-US')}</span>
                        <span suppressHydrationWarning>{range.end.toLocaleDateString('en-US')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
