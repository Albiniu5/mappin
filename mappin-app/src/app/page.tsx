'use client'

import MapWrapper from '@/components/MapWrapper'
import Timeline from '@/components/Timeline'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { Search, Loader2, X, Maximize2, Minimize2, Radio } from 'lucide-react'
import { format } from 'date-fns'

type Conflict = Database['public']['Tables']['conflicts']['Row']

import { toast } from 'sonner'
import { useRef } from 'react'
import NewsTicker from '@/components/NewsTicker'
// import NotificationCenter from '@/components/NotificationCenter'
import JudgeCenter from '@/components/JudgeCenter'
import packageJson from '../../package.json'

import AIAnalysisPanel from '@/components/AIAnalysisPanel'
import { ExternalLink } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle';
import { AboutModal } from '@/components/AboutModal';

export default function Home() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [allConflicts, setAllConflicts] = useState<Conflict[]>([])
  const [notifications, setNotifications] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isPlaying, setIsPlaying] = useState(false)
  const [dateRange, setDateRange] = useState({ min: new Date(), max: new Date() })
  const [clusterConflicts, setClusterConflicts] = useState<Conflict[]>([])
  const [showClusterSidebar, setShowClusterSidebar] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showAbout, setShowAbout] = useState(false);
  const [isAlienMode, setIsAlienMode] = useState(false);
  const [alienSubFilter, setAlienSubFilter] = useState('All');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const seenIdsRef = useRef<Set<any>>(new Set())

  const categories = ['All', 'Armed Conflict', 'Protest', 'Political Unrest', 'Other']

  const fetchConflicts = async () => {
    const { data, error } = await supabase
      .from('conflicts')
      .select('*')
      .order('published_at', { ascending: false })

    if (data) {
      const conflicts = (data as Conflict[]).filter(c => !c.title.toUpperCase().includes("TEST"));
      conflicts.forEach(c => seenIdsRef.current.add(c.id));
      setAllConflicts(conflicts)

      if (conflicts.length > 0) {
        const dates = conflicts.map(c => new Date(c.published_at))
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
        minDate.setHours(0, 0, 0, 0)
        const dataMaxDate = new Date(Math.max(...dates.map(d => d.getTime())))
        dataMaxDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const maxDate = dataMaxDate > today ? dataMaxDate : today
        setDateRange({ min: minDate, max: maxDate })
        if (!currentDate) setCurrentDate(new Date())
      }
    }
    if (error) console.error('Error fetching conflicts:', error)
    setLoading(false)
  }

  useEffect(() => {
    fetchConflicts()
  }, [])

  useEffect(() => {
    const triggerFeedRefresh = async () => {
      const lastRefresh = sessionStorage.getItem('last_feed_refresh');
      const now = Date.now();
      const COOLDOWN = 5 * 60 * 1000;

      if (lastRefresh && (now - parseInt(lastRefresh)) < COOLDOWN) {
        return;
      }
      try {
        const response = await fetch('/api/ingest')
        const result = await response.json()
        if (result.success) {
          sessionStorage.setItem('last_feed_refresh', Date.now().toString());
          if (result.processed > 0 || result.inserted > 0) {
            fetchConflicts();
          }
        }
      } catch (error) {
        console.error('Error refreshing feed:', error)
      }
    }
    triggerFeedRefresh()
    const interval = setInterval(triggerFeedRefresh, 5 * 60 * 1000 + 1000);
    return () => clearInterval(interval);
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentDate(prev => {
          if (!prev) return new Date()
          const next = new Date(prev)
          next.setDate(next.getDate() + 1)
          if (next > new Date()) {
            setIsPlaying(false)
            return prev
          }
          return next
        })
      }, 500 / playbackSpeed)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, playbackSpeed])

  useEffect(() => {
    if (showClusterSidebar && clusterConflicts.length === 1) {
      setSelectedArticleId(clusterConflicts[0].id)
    }
  }, [showClusterSidebar, clusterConflicts])

  const filteredConflicts = useMemo(() => {
    const now = new Date();
    const targetDateStr = currentDate ? currentDate.toDateString() : "";
    const isTargetToday = currentDate && currentDate.toDateString() === now.toDateString();

    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const searchLower = searchTerm.toLowerCase();

    return allConflicts.filter(c => {
      if (isAlienMode) {
        if (c.category !== 'Alien') return false;
        if (alienSubFilter !== 'All') {
          const report = c.related_reports as any;
          if (!report || report.alien_specific_type !== alienSubFilter) return false;
        }
      } else {
        if (c.category === 'Alien') return false;
      }

      // 1. Hybrid Date Filter (The "Freshness" Logic)
      // BYPASS date filter in Alien Mode to show all historical sightings
      if (!isAlienMode && targetDateStr) {
        const pubDate = new Date(c.published_at);
        if (isTargetToday) {
          const isPublishedToday = pubDate.toDateString() === targetDateStr;
          const ingestDate = new Date(c.created_at);
          const isIngestedRecently = ingestDate > twentyFourHoursAgo;
          if (!isPublishedToday && !isIngestedRecently) {
            return false;
          }
        }
        else if (pubDate.toDateString() !== targetDateStr) {
          return false;
        }
      }

      if (!isAlienMode && selectedCategory !== 'All' && c.category !== selectedCategory) {
        return false;
      }

      if (searchTerm !== '') {
        const titleMatch = c.title.toLowerCase().includes(searchLower);
        const locMatch = c.location_name && c.location_name.toLowerCase().includes(searchLower);
        if (!titleMatch && !locMatch) return false;
      }

      return true;
    })
  }, [allConflicts, currentDate, searchTerm, selectedCategory, isAlienMode, alienSubFilter])

  const statsConflicts = useMemo(() => {
    const isToday = currentDate
      ? currentDate.toDateString() === new Date().toDateString()
      : true;

    if (isToday) {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recent = allConflicts.filter(c => new Date(c.published_at) > oneDayAgo);
      return recent;
    }
    return filteredConflicts;
  }, [allConflicts, currentDate, filteredConflicts]);

  const todayConflicts = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return allConflicts.filter(c => new Date(c.published_at) >= startOfToday);
  }, [allConflicts]);

  const addedLastHour = useMemo(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return allConflicts.filter(c => new Date(c.created_at) > oneHourAgo).length;
  }, [allConflicts]);

  const timelineMaxDate = useMemo(() => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (!dateRange.max) return now;
      const max = new Date(dateRange.max);
      max.setHours(0, 0, 0, 0);
      return max > now ? max : now;
    } catch (e) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now;
    }
  }, [dateRange.max]);

  // --- ALIEN THEME VARIABLES ---
  const containerClass = isAlienMode
    ? 'relative h-screen w-screen overflow-hidden bg-black transition-colors duration-1000'
    : 'relative h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500';

  const overlayClass = isAlienMode
    ? 'pointer-events-none absolute inset-0 z-[50] mix-blend-overlay bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")] opacity-20'
    : 'hidden';

  const scanlineClass = isAlienMode
    ? 'pointer-events-none absolute inset-0 z-[51] bg-gradient-to-b from-transparent via-green-900/5 to-transparent bg-[length:100%_4px] animate-scanline'
    : 'hidden';

  const headingClass = isAlienMode
    ? 'text-3xl font-bold text-green-500 font-mono tracking-widest drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]'
    : 'text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 drop-shadow-sm';

  const statsBoxClass = isAlienMode
    ? 'mt-3 bg-black/80 backdrop-blur-md border border-green-500/50 rounded-none shadow-[0_0_15px_rgba(34,197,94,0.2)] inline-block transition-colors overflow-hidden font-mono text-green-500'
    : 'mt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg inline-block transition-colors overflow-hidden font-sans';

  const statsHeaderClass = isAlienMode
    ? 'bg-green-900/20 border-b border-green-500/30 px-3 py-1.5 flex items-center justify-between gap-6'
    : 'bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 flex items-center justify-between gap-6';

  const filterBoxClass = isAlienMode
    ? 'bg-black/90 backdrop-blur-md p-3 rounded-none border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)] pointer-events-auto flex flex-col gap-2 w-64 transition-all'
    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl pointer-events-auto flex flex-col gap-2 w-64 transition-all';

  const inputClass = isAlienMode
    ? 'w-full bg-black border border-green-700 rounded-none pl-8 pr-8 py-2 text-sm text-green-400 outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50 transition-all font-mono placeholder-green-800'
    : 'w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg pl-8 pr-8 py-2 text-sm text-slate-900 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all';


  return (
    <main className={containerClass}>

      {/* CRT / Scanline Overlays for Alien Mode */}
      <div className={overlayClass}></div>
      <div className={scanlineClass}></div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-[1000] pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="relative pointer-events-auto">
            <h1 className={headingClass}>
              {isAlienMode ? 'PLANETARY DEFENSE SYSTEM' : 'Global Conflict Tracker'}
            </h1>
            <p className={isAlienMode ? "text-green-700 text-xs font-mono mt-1 uppercase tracking-[0.2em]" : "text-slate-400 text-sm mt-1"}>
              {isAlienMode ? 'UNAUTHORIZED ACCESS DETECTED' : 'Real-time situational awareness'}
              <span className={isAlienMode ? "text-green-400 ml-2 animate-pulse" : "text-xs text-emerald-400 ml-2"}>v{packageJson.version}</span>
            </p>

            {/* Stats Panel */}
            <div className={statsBoxClass}>
              {/* Top Bar */}
              <div className={statsHeaderClass}>
                <div className={isAlienMode ? "text-[10px] text-green-600 font-bold uppercase tracking-wider" : "text-[10px] text-slate-500 font-bold uppercase tracking-wider"}>
                  {isAlienMode ? 'SIGNAL STRENGTH' : 'Updates (1h)'}
                </div>
                <div className={isAlienMode ? "text-xs font-bold text-green-400 drop-shadow-sm animate-pulse" : "text-xs font-bold text-violet-600 dark:text-violet-400 drop-shadow-sm"}>
                  +{addedLastHour} {isAlienMode ? 'sigs' : 'new'}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex px-3 py-2 items-center justify-between gap-6">
                <div className="flex flex-col">
                  <div className={isAlienMode ? "text-[10px] text-green-700 font-bold uppercase tracking-wider mb-0.5" : "text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5"}>24h</div>
                  <div className={isAlienMode ? "text-2xl font-black text-green-500 leading-none tracking-tight font-mono" : "text-2xl font-black text-blue-500 dark:text-blue-400 leading-none tracking-tight"}>{statsConflicts.length}</div>
                </div>

                <div className={isAlienMode ? "w-px h-6 bg-green-900" : "w-px h-6 bg-slate-200 dark:bg-slate-700"}></div>

                <div className="flex flex-col text-right">
                  <div className={isAlienMode ? "text-[10px] text-green-700 font-bold uppercase tracking-wider mb-0.5" : "text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5"}>Total</div>
                  <div className={isAlienMode ? "text-2xl font-black text-green-500 leading-none tracking-tight font-mono" : "text-2xl font-black text-emerald-500 dark:text-emerald-400 leading-none tracking-tight"}>{todayConflicts.length}</div>
                </div>
              </div>

              {!isAlienMode && (
                <div className="mt-1.5 flex gap-1.5 text-[10px]">
                  <span className="bg-red-600/20 text-red-400 px-2 py-0.5 rounded">
                    ⚔️ {statsConflicts.filter(c => c.category === 'Armed Conflict').length}
                  </span>
                  <span className="bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded">
                    📣 {statsConflicts.filter(c => c.category === 'Protest').length}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto items-center">
            {!isAlienMode && <ThemeToggle theme={theme} toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} />}
            <button
              onClick={() => setShowAbout(true)}
              className={isAlienMode
                ? "bg-black/80 border border-green-600 text-green-500 hover:text-green-300 hover:border-green-400 px-4 py-2 rounded-none text-sm transition-all shadow-lg font-mono tracking-widest uppercase"
                : "bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm transition-all shadow-lg font-medium"}
            >
              {isAlienMode ? 'CLASSIFIED' : 'About'}
            </button>
            <button
              onClick={() => {
                setIsAlienMode(!isAlienMode);
                setSelectedCategory('All');
                setAlienSubFilter('All');
              }}
              className={`w-10 h-10 flex items-center justify-center transition-all duration-500 shadow-lg border ${isAlienMode
                ? 'bg-green-900 border-green-400 text-green-400 shadow-[0_0_20px_#22c55e] scale-110 rounded-sm'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-green-500 hover:border-green-500 rounded-full'
                }`}
              title={isAlienMode ? "Deactivate Alien Lens" : "Activate Alien Lens"}
            >
              {isAlienMode ? '👽' : '🛰️'}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters Overlay (Top Right) */}
      <div className="absolute top-20 right-6 z-[1000] flex flex-col gap-2 items-end pointer-events-none">
        <div className={filterBoxClass}>
          {/* Search Input */}
          <div className="relative">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isAlienMode ? 'text-green-600' : 'text-slate-400 dark:text-slate-500'}`} />
            <input
              type="text"
              placeholder={isAlienMode ? "SCAN FREQUENCIES..." : "Search location or keyword..."}
              className={inputClass}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Normal Filters (Hidden in Alien Mode) */}
          {!isAlienMode && (
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1.5">Filter by Category</div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-all font-medium ${selectedCategory === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-900/20 text-blue-500 border-blue-800'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alien Sub-Filters (Visible only in Alien Mode) */}
          {isAlienMode && (
            <div className="pt-2 border-t border-green-900/50 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] text-green-600 font-mono uppercase tracking-wider mb-1.5 font-bold flex items-center gap-2">
                <Radio className="w-3 h-3 animate-pulse" /> TARGET TYPE
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Sighting', 'Abduction', 'Crop Circle', 'Military Encounter', 'Unknown'].map(type => (
                  <button
                    key={type}
                    onClick={() => setAlienSubFilter(type)}
                    className={`text-[10px] px-2 py-0.5 rounded-none border transition-all font-mono uppercase ${alienSubFilter === type
                      ? 'bg-green-600 border-green-400 text-black shadow-[0_0_10px_#22c55e] font-bold'
                      : 'bg-black border-green-800 text-green-600 hover:border-green-500 hover:text-green-400'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={isAlienMode ? "text-[10px] text-green-800 font-mono pt-1.5 border-t border-green-900/50" : "text-[10px] text-slate-500 dark:text-slate-500 font-mono pt-1.5 border-t border-slate-200 dark:border-slate-700"}>
            {isAlienMode ? `ANOMALIES DETECTED: ${filteredConflicts.length}` : `Showing ${filteredConflicts.length} of ${allConflicts.length} conflicts`}
          </div>
        </div>
      </div>

      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapWrapper
          conflicts={filteredConflicts}
          onClusterClick={(conflicts) => {
            setClusterConflicts(conflicts);
            setShowClusterSidebar(true);
          }}
          theme={theme}
          isAlienMode={isAlienMode}
        />
      </div>

      {/* Timeline Controls (Hidden in Alien Mode for now? Or styled?) */}
      {currentDate && !isAlienMode && (
        <Timeline
          date={currentDate}
          setDate={(d) => setCurrentDate(d)}
          minDate={dateRange.min}
          maxDate={timelineMaxDate}
          isPlaying={isPlaying}
          onPlayToggle={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
        />
      )}

      {/* Cluster Sidebar */}
      {showClusterSidebar && (
        <div
          className={`absolute right-0 top-0 h-full z-[2000] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 transition-colors ease-out ${isAlienMode
            ? 'bg-black/95 backdrop-blur-xl border-l border-green-500/50'
            : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-700'
            }`}
          style={{ width: sidebarExpanded ? '700px' : '400px' }}
        >
          {/* Sidebar Header */}
          <div className={`p-5 border-b flex justify-between items-start transition-colors ${isAlienMode
            ? 'bg-black border-green-900'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
            }`}>
            <div>
              <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isAlienMode ? 'text-green-600' : 'text-blue-600 dark:text-blue-400'}`}>
                {isAlienMode ? 'CONTACT REPORT' : 'Situation Report'}
              </div>
              <h3 className={`text-xl font-bold flex items-center gap-2 ${isAlienMode ? 'text-green-400 font-mono tracking-tighter' : 'text-slate-900 dark:text-white'}`}>
                {clusterConflicts[0]?.location_name || 'Multiple Locations'}
              </h3>
            </div>
            <button
              onClick={() => setShowClusterSidebar(false)}
              className={`w-8 h-8 flex items-center justify-center border transition-colors ${isAlienMode
                ? 'rounded-none bg-black border-green-800 text-green-600 hover:text-green-400 hover:border-green-400'
                : 'rounded-full bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {clusterConflicts.slice(0, 50).map((conflict, i) => (
              <div
                key={conflict.id}
                className={`relative pl-6 pb-2 border-l transition-colors group ${isAlienMode ? 'border-green-900' : 'border-slate-200 dark:border-slate-800'}`}
              >
                {/* Dot */}
                <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${isAlienMode
                  ? 'border-black bg-green-500 animate-pulse'
                  : 'border-slate-50 dark:border-slate-900 bg-blue-500'
                  }`}></div>

                <div
                  className={`border rounded-lg transition-all cursor-pointer overflow-hidden ${isAlienMode
                    ? 'bg-green-900/10 border-green-900/50 hover:bg-green-900/20 hover:border-green-500/50'
                    : 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50 hover:border-blue-500/50'
                    }`}
                  onClick={() => setSelectedArticleId(selectedArticleId === conflict.id ? null : conflict.id)}
                >
                  <div className="p-3">
                    <h4 className={`text-sm font-medium transition-colors leading-snug mb-1 ${isAlienMode ? 'text-green-400 font-mono' : 'text-slate-800 dark:text-slate-200'}`}>
                      {conflict.title}
                    </h4>
                    {/* AI Panel Expansion */}
                    {selectedArticleId === conflict.id && (
                      <AIAnalysisPanel conflict={conflict} isAlienMode={isAlienMode} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications and Ticker */}
      {/* Notifications and Ticker */}
      {/* NotificationCenter removed per user request */}


      <NewsTicker conflicts={filteredConflicts} isAlienMode={isAlienMode} />

      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

    </main >
  )
}
