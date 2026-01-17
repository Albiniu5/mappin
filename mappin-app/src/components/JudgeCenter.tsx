'use client'

import { useState, useEffect, useRef } from 'react'
import { Gavel, X, MapPin, ExternalLink, Scale } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import type { Database } from '@/types/supabase'

type Conflict = Database['public']['Tables']['conflicts']['Row']

interface JudgeCenterProps {
    conflicts: Conflict[]
    onLocate: (conflict: Conflict) => void
}

export default function JudgeCenter({ conflicts, onLocate }: JudgeCenterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Filter only conflicts with Judge verdicts
    const judgedConflicts = conflicts.filter(c =>
        c.narrative_analysis && c.narrative_analysis.trim() !== ''
    )

    // Click outside listener
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [containerRef]);

    const toggleOpen = () => {
        setIsOpen(!isOpen)
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Judge Button */}
            <motion.button
                onClick={toggleOpen}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center justify-center h-12 px-4 rounded-full border transition-all duration-300 gap-2 ${isOpen
                    ? 'bg-indigo-600 dark:bg-indigo-900 border-indigo-400 text-white dark:text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                    : judgedConflicts.length > 0
                        ? 'bg-white dark:bg-slate-900/90 border-indigo-200 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-400 shadow-lg'
                        : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                title="The Judge - AI Verdict Comparisons"
            >
                <Gavel size={18} />
                <span className="text-sm font-bold">
                    {judgedConflicts.length}
                </span>
                {judgedConflicts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500 border-2 border-slate-900"></span>
                    </span>
                )}
            </motion.button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 8, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="absolute top-full right-0 mt-2 w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-indigo-200 dark:border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-indigo-100 dark:border-indigo-500/20 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/30 dark:to-purple-900/30">
                            <div className="flex items-center gap-2">
                                <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                                    The Judge
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                AI-compared narratives from multiple sources
                            </p>
                        </div>

                        {/* Content */}
                        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {judgedConflicts.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center justify-center opacity-50">
                                    <Gavel size={32} className="mb-3 text-indigo-500" />
                                    <span className="text-sm font-medium text-slate-400">No verdicts yet</span>
                                    <span className="text-xs text-slate-500 mt-1">Waiting for multi-source reports...</span>
                                </div>
                            ) : (
                                judgedConflicts.slice(0, 20).map(conflict => (
                                    <motion.div
                                        key={conflict.id}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 hover:border-indigo-500/50 transition-all cursor-pointer group"
                                        onClick={() => {
                                            onLocate(conflict)
                                            setIsOpen(false)
                                        }}
                                    >
                                        {/* Header Row */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-mono text-slate-500">
                                                    {format(new Date(conflict.published_at), 'MMM dd, HH:mm')}
                                                </span>
                                                {conflict.location_name && (
                                                    <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                                        <MapPin size={9} />
                                                        {conflict.location_name}
                                                    </span>
                                                )}
                                            </div>
                                            <a
                                                href={conflict.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-slate-500 hover:text-blue-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>

                                        {/* Title */}
                                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2">
                                            {conflict.title}
                                        </h4>

                                        {/* Verdict Preview */}
                                        <div className="relative pl-3 border-l-2 border-indigo-500/50">
                                            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Verdict:</span>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 italic">
                                                "{conflict.narrative_analysis}"
                                            </p>
                                        </div>
                                    </motion.div>
                                ))
                            )}

                            {judgedConflicts.length > 20 && (
                                <div className="text-center py-3 text-xs text-slate-500">
                                    + {judgedConflicts.length - 20} more verdicts
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
