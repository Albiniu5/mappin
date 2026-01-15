
'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, FastForward, Calendar, RotateCcw } from 'lucide-react'

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
    const [range, setRange] = useState({
        start: minDate || new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    })

    useEffect(() => {
        setMounted(true)
        const today = new Date()
        setRange({
            start: minDate || new Date(new Date().setDate(new Date().getDate() - 30)),
            end: maxDate && maxDate > today ? maxDate : today
        })
    }, [minDate, maxDate])

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(Number(e.target.value))
        setDate(newDate)
    }

    const handleSpeedChange = () => {
        if (!setPlaybackSpeed) return;
        const speeds = [1, 2, 5];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
        setPlaybackSpeed(nextSpeed);
    }

    // Calculate progress percentage
    const progress = range.start && range.end
        ? ((date.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100
        : 0;

    if (!mounted) {
        return null
    }

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl z-[1000] flex items-center gap-4">
            <button
                onClick={onPlayToggle}
                className={`p-3 rounded-full ${isPlaying ? 'bg-orange-600 hover:bg-orange-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} text-white transition-all shadow-lg`}
                title={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {setPlaybackSpeed && (
                <button
                    onClick={handleSpeedChange}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors border border-slate-600"
                    title="Change playback speed"
                >
                    <FastForward size={14} className="inline mr-1" />
                    {playbackSpeed}x
                </button>
            )}

            <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-mono uppercase tracking-wider flex justify-between items-center">
                    <span>{date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
                        value={date.getTime()}
                        onChange={handleSliderChange}
                        step={24 * 60 * 60 * 1000} // 1 day steps
                        className="relative w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                        suppressHydrationWarning
                    />
                </div>
                <div className="flex items-center justify-between gap-2">
                    {/* Jump to Today */}
                    <button
                        onClick={() => setDate(new Date())}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-blue-600 transition-all duration-300 group"
                        title="Jump to Today"
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
                                    value={date.toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        const [y, m, d] = e.target.value.split('-').map(Number);
                                        setDate(new Date(y, m - 1, d));
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
