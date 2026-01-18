
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
    isAlienMode?: boolean
}

export default function Timeline({ date, setDate, minDate, maxDate, isPlaying, onPlayToggle, playbackSpeed = 1, setPlaybackSpeed, isAlienMode = false }: TimelineProps) {
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

        // Haptic feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(5);
        }
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

    // --- ALIEN STYLES ---
    const containerClass = isAlienMode
        ? "absolute bottom-10 sm:bottom-16 left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] max-w-3xl bg-black/90 backdrop-blur-md p-2 sm:p-4 rounded-none border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)] z-[1000] flex items-center gap-2 sm:gap-4 transition-colors font-mono"
        : "absolute bottom-10 sm:bottom-16 left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] max-w-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl z-[1000] flex items-center gap-2 sm:gap-4 transition-colors";

    const btnClass = isAlienMode
        ? "p-2 rounded-none bg-black border border-green-800 text-green-600 hover:text-green-400 hover:border-green-500 transition-colors"
        : "p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-600";

    const playBtnClass = isAlienMode
        ? `p-3 rounded-none ${isPlaying ? 'bg-green-600 text-black border border-green-400 shadow-[0_0_10px_#22c55e]' : 'bg-black text-green-500 border border-green-500 hover:bg-green-900/30'} transition-all`
        : `p-3 rounded-full ${isPlaying ? 'bg-orange-600 hover:bg-orange-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} text-white transition-all shadow-lg`;

    return (
        <div className={containerClass}>

            {/* Controls Group */}
            <div className="flex items-center gap-1 sm:gap-2">
                <button
                    onClick={handlePrevDay}
                    className={`${btnClass} touch-manipulation`}
                    title="Previous Day"
                >
                    <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
                </button>

                <button
                    onClick={onPlayToggle}
                    className={`${playBtnClass} touch-manipulation p-2 sm:p-3`}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause size={16} className="sm:w-5 sm:h-5" /> : <Play size={16} className="sm:w-5 sm:h-5" />}
                </button>

                <button
                    onClick={handleNextDay}
                    className={`${btnClass} touch-manipulation`}
                    title="Next Day"
                >
                    <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                </button>
            </div>

            {/* Playback speed control */}
            {setPlaybackSpeed && (
                <button
                    onClick={handleSpeedChange}
                    className={`touch-manipulation ${isAlienMode
                        ? "px-2 sm:px-3 py-1.5 sm:py-2 rounded-none bg-black text-green-600 border border-green-800 hover:border-green-500 text-[10px] sm:text-xs font-mono font-bold transition-colors min-w-[40px] sm:min-w-[50px]"
                        : "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] sm:text-xs font-mono font-bold transition-colors border border-slate-200 dark:border-slate-600 min-w-[40px] sm:min-w-[50px]"}`}
                    title="Change playback speed"
                >
                    <FastForward size={12} className="inline mr-0.5 sm:mr-1 sm:w-3.5 sm:h-3.5" />
                    {playbackSpeed}x
                </button>
            )}

            <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0">
                <label className={isAlienMode ? "text-[10px] sm:text-xs text-green-500 font-mono uppercase tracking-widest flex justify-between items-center gap-2" : "text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider flex justify-between items-center gap-2"}>
                    <span className="truncate">{internalDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    {isPlaying && <span className={`${isAlienMode ? "text-green-400 animate-pulse drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]" : "text-orange-400 animate-pulse"} shrink-0`}>● {isAlienMode ? 'ACTIVE' : 'Play'}</span>}
                </label>

                {/* Progress bar background */}
                <div className="relative w-full">
                    {/* Animated progress fill */}
                    <div
                        className={isAlienMode ? "absolute top-0 left-0 h-2 bg-green-500 shadow-[0_0_10px_#22c55e] rounded-none transition-all duration-300" : "absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-500 to-orange-500 rounded-lg transition-all duration-300"}
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
                        className={isAlienMode
                            ? "relative w-full h-3 bg-black border border-green-900 rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_#22c55e] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
                            : "relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125 hover:[&::-webkit-slider-thumb]:scale-110"}
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
                            // Dispatch reset event for map to collapse all expansions and reset view
                            window.dispatchEvent(new CustomEvent('map-reset-view', {
                                detail: { lat: 20, lng: 0, zoom: 3 }
                            }));
                        }}
                        className={isAlienMode
                            ? "p-2 rounded-none bg-black border border-green-800 text-green-600 hover:text-green-400 hover:border-green-400 transition-all duration-300 group relative"
                            : "p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-600 transition-all duration-300 group relative"}
                        title="Reset Map View & Jump to Today"
                    >
                        <RotateCcw className={isAlienMode ? "w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" : "w-5 h-5 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-white group-hover:rotate-180 transition-transform duration-500"} />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowCalendar(!showCalendar)}
                            className={isAlienMode
                                ? "p-2 rounded-none bg-black border border-green-800 text-green-600 hover:text-green-400 hover:border-green-400 transition-all duration-300 group"
                                : "p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-purple-600 transition-all duration-300 group"}
                            title="Pick Date"
                        >
                            <Calendar className={isAlienMode ? "w-5 h-5" : "w-5 h-5 text-purple-500 dark:text-purple-400 group-hover:text-purple-600 dark:group-hover:text-white"} />
                        </button>
                        {showCalendar && (
                            <div className={isAlienMode
                                ? "absolute bottom-12 left-0 bg-black border border-green-500 rounded-none p-3 shadow-[0_0_20px_rgba(34,197,94,0.3)] z-50 font-mono"
                                : "absolute bottom-12 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-3 shadow-2xl z-50"}>
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
                                    className={isAlienMode
                                        ? "bg-black text-green-500 px-3 py-2 rounded-none border border-green-700 focus:border-green-400 focus:outline-none"
                                        : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 rounded border border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:outline-none"}
                                />
                            </div>
                        )}
                    </div>
                    <div className={isAlienMode
                        ? "flex justify-between text-[10px] text-green-800 font-mono flex-1 uppercase tracking-widest"
                        : "flex justify-between text-[10px] text-slate-500 font-mono flex-1"}>
                        <span suppressHydrationWarning>{range.start.toLocaleDateString('en-US')}</span>
                        <span suppressHydrationWarning>{range.end.toLocaleDateString('en-US')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
