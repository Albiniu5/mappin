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
    isAlienMode?: boolean
}

export default function NotificationCenter({ notifications, onLocate, onDismiss, onClearAll, isAlienMode = false }: NotificationCenterProps) {
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

    const buttonClass = isAlienMode
        ? `relative inline-flex items-center gap-2 h-8 px-3 rounded-full transition-all duration-300 ${isOpen
            ? 'bg-green-900/40 text-green-400'
            : hasUnread
                ? 'bg-green-900/40 text-green-400 animate-pulse'
                : 'hover:bg-green-900/40 text-green-400'
        }` // Alien Style
        : `relative inline-flex items-center gap-2 h-8 px-3 rounded-full transition-colors duration-300 ${isOpen
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            : hasUnread
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 animate-pulse'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
        }`; // Normal Style

    const dropdownClass = isAlienMode
        ? "w-80 sm:w-96 bg-black/95 backdrop-blur-2xl border border-green-500/50 rounded-none shadow-[0_0_30px_rgba(34,197,94,0.3)] overflow-hidden origin-top font-mono"
        : "w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-600/80 rounded-2xl shadow-3xl overflow-hidden origin-top font-sans";

    const headerClass = isAlienMode
        ? "p-4 border-b border-green-900/50 flex justify-between items-center bg-black"
        : "p-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30";

    return (
        <div ref={containerRef} className="relative flex flex-col items-center">
            {/* Toggle Button / Icon */}
            <motion.button
                layout
                onClick={toggleOpen}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={buttonClass}
            >
                <div className="relative">
                    {/* Shake animation */}
                    <motion.div
                        animate={isNew ? { rotate: [0, -20, 20, -10, 10, 0] } : {}}
                        transition={{ duration: 0.5 }}
                    >
                        <Bell size={16} />
                    </motion.div>

                    {/* Badge */}
                    {notifications.length > 0 && hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAlienMode ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span className={`relative inline-flex h-2 w-2 rounded-full ${isAlienMode ? 'bg-green-400' : 'bg-red-500'}`}></span>
                        </span>
                    )}
                </div>

                {/* Count Label */}
                {notifications.length > 0 && (
                    <span className={`text-sm font-semibold ${isAlienMode ? 'text-green-400 font-mono' : 'text-slate-700 dark:text-slate-200'}`}>
                        {notifications.length}
                    </span>
                )}
            </motion.button>

            {/* Dropdown List */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95, height: 0 }}
                        animate={{ opacity: 1, y: 12, scale: 1, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, scale: 0.95, height: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className={dropdownClass}
                    >
                        <div className={headerClass}>
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${isAlienMode ? 'text-green-600' : 'text-slate-400'}`}>
                                {isAlienMode ? 'INCOMING TRANSMISSIONS' : 'Latest Updates'}
                            </span>
                            {notifications.length > 0 && (
                                <button onClick={onClearAll} className={`text-[11px] font-bold transition-colors uppercase tracking-wide ${isAlienMode ? 'text-green-600 hover:text-green-400' : 'text-blue-400 hover:text-blue-300'}`}>
                                    {isAlienMode ? 'PURGE DATA' : 'Clear All'}
                                </button>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center flex flex-col items-center justify-center opacity-40">
                                    <Bell size={32} className={`mb-3 ${isAlienMode ? 'text-green-900' : 'text-slate-500'}`} />
                                    <span className={`text-sm font-medium ${isAlienMode ? 'text-green-800' : 'text-slate-400'}`}>
                                        {isAlienMode ? 'NO SIGNAL DETECTED' : 'No new alerts'}
                                    </span>
                                </div>
                            ) : (
                                notifications.map(item => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className={`p-3 mb-1 transition-all group relative cursor-pointer border ${isAlienMode
                                            ? 'rounded-none hover:bg-green-900/20 border-transparent hover:border-green-500/50'
                                            : 'rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-transparent hover:border-slate-200 dark:hover:border-slate-700/50'
                                            }`}
                                        onClick={() => onLocate(item)}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`w-2 h-2 animate-pulse ${isAlienMode ? 'bg-green-500 rounded-none shadow-[0_0_8px_#22c55e]' : 'bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`}></span>
                                                    <span className={`text-[11px] font-mono font-medium ${isAlienMode ? 'text-green-700' : 'text-slate-400'}`}>
                                                        {format(new Date(item.published_at), 'HH:mm')}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 border flex items-center gap-1 truncate max-w-[140px] ${isAlienMode
                                                        ? 'text-green-400 bg-green-900/30 border-green-800 rounded-none'
                                                        : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20 rounded-md'
                                                        }`}>
                                                        <MapPin size={9} /> {item.location_name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <h4 className={`text-sm font-semibold line-clamp-2 leading-relaxed transition-colors ${isAlienMode
                                                    ? 'text-green-500 group-hover:text-green-300'
                                                    : 'text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-white'
                                                    }`}>
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
                                                        className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all ${isAlienMode
                                                            ? 'text-green-800 hover:text-green-400 hover:bg-green-900/30 rounded-none'
                                                            : 'text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg'
                                                            }`}
                                                        title="Read Source"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
                                                    className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all ${isAlienMode
                                                        ? 'text-green-800 hover:text-green-400 hover:bg-red-900/30 rounded-none'
                                                        : 'text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700/50 rounded-lg'
                                                        }`}
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
