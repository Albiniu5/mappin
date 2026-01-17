'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, MapPin, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import type { Database } from '@/types/supabase'

type Conflict = Database['public']['Tables']['conflicts']['Row']

interface NotificationCenterProps {
    notifications: Conflict[]
    onLocate: (conflict: Conflict) => void
    onDismiss: (id: any) => void
    onClearAll: () => void
}

export default function NotificationCenter({ notifications, onLocate, onDismiss, onClearAll }: NotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isNew, setIsNew] = useState(false) // Keeps the shake animation on new arrival
    const [hasUnread, setHasUnread] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const prevCountRef = useRef(0)

    // Check for unread items on load and when notifications change
    useEffect(() => {
        if (notifications.length === 0) {
            setHasUnread(false)
            return
        }

        const latestId = notifications[0].id
        const lastSeenId = localStorage.getItem('mappin_last_seen_notification')

        // distinct check: purely based on ID comparison
        if (latestId?.toString() !== lastSeenId) {
            setHasUnread(true)
        }

        // Trigger shake only on count increase
        if (notifications.length > prevCountRef.current && prevCountRef.current > 0) {
            setIsNew(true)
            setTimeout(() => setIsNew(false), 2000)
        }
        prevCountRef.current = notifications.length
    }, [notifications])

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
        const newState = !isOpen
        setIsOpen(newState)

        if (newState && notifications.length > 0) {
            // Mark as read when opening
            setHasUnread(false)
            localStorage.setItem('mappin_last_seen_notification', notifications[0].id.toString())
        }
    }

    return (
        <div ref={containerRef} className="fixed top-6 left-1/2 -translate-x-1/2 z-[3000] flex flex-col items-center">
            {/* Toggle Button / Icon */}
            <motion.button
                layout
                onClick={toggleOpen}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center justify-center h-12 w-12 rounded-full border transition-all duration-300 group ${isOpen
                    ? 'bg-slate-900 border-slate-500 text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                    : hasUnread
                        ? 'bg-slate-900 border-red-500 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.6)] animate-pulse'
                        : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-500'
                    }`}
            >
                <div className="relative">
                    {/* Shake animation */}
                    <motion.div
                        animate={isNew ? { rotate: [0, -20, 20, -10, 10, 0] } : {}}
                        transition={{ duration: 0.5 }}
                    >
                        <Bell size={20} className="text-slate-200" />
                    </motion.div>

                    {/* Red Dot Badge */}
                    {/* Red Dot Badge */}
                    {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            {hasUnread && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-900 ${hasUnread ? 'bg-red-500' : 'bg-slate-500'}`}></span>
                        </span>
                    )}
                </div>

                {/* Count Label - Only show number if > 0, otherwise nothing */}
                <AnimatePresence mode='wait'>
                    {notifications.length > 0 && (
                        <motion.span
                            key="count"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="ml-2.5 text-sm font-bold text-white overflow-hidden whitespace-nowrap"
                        >
                            {notifications.length}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Dropdown List */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95, height: 0 }}
                        animate={{ opacity: 1, y: 12, scale: 1, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, scale: 0.95, height: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-600/80 rounded-2xl shadow-3xl overflow-hidden origin-top"
                    >
                        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Latest Updates</span>
                            {notifications.length > 0 && (
                                <button onClick={onClearAll} className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wide">
                                    Clear All
                                </button>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center justify-center opacity-40">
                                    <Bell size={32} className="mb-3 text-slate-500" />
                                    <span className="text-sm font-medium text-slate-400">No new alerts</span>
                                </div>
                            ) : (
                                notifications.map(item => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="p-3 mb-1 rounded-xl hover:bg-slate-800/80 transition-all group relative cursor-pointer border border-transparent hover:border-slate-700/50"
                                        onClick={() => onLocate(item)}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                                                    <span className="text-[11px] text-slate-400 font-mono font-medium">
                                                        {format(new Date(item.published_at), 'HH:mm')}
                                                    </span>
                                                    <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1 truncate max-w-[140px]">
                                                        <MapPin size={9} /> {item.location_name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                                                    {item.title}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {item.source_url && (
                                                    <a
                                                        href={item.source_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-slate-500 hover:text-blue-400 hover:bg-slate-700/50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Read Source"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
                                                    className="text-slate-500 hover:text-red-400 hover:bg-slate-700/50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Dismiss"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
