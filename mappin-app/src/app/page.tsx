
'use client'

import MapWrapper from '@/components/MapWrapper'
import Timeline from '@/components/Timeline'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { Search, Loader2, X, Maximize2, Minimize2 } from 'lucide-react'
import { format } from 'date-fns'

type Conflict = Database['public']['Tables']['conflicts']['Row']

import { toast } from 'sonner'
import { useRef } from 'react'
import NewsTicker from '@/components/NewsTicker'
import NotificationCenter from '@/components/NotificationCenter'
import JudgeCenter from '@/components/JudgeCenter'
import packageJson from '../../package.json'

import AIAnalysisPanel from '@/components/AIAnalysisPanel'
import { ExternalLink } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

export default function Home() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [allConflicts, setAllConflicts] = useState<Conflict[]>([])
  const [notifications, setNotifications] = useState<Conflict[]>([]) // State for custom notification center
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // EFFECT: Sync theme to document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Track seen IDs to detect new items for notifications
  // Using <any> to be safe against ID type (number vs string) mismatches
  const seenIdsRef = useRef<Set<any>>(new Set())
  // Use a strictly local ref to avoid re-triggering effects, 
  // but wait... invalidating strict mode might double toast. 
  // We'll trust the Set to deduplicate.

  const categories = ['All', 'Armed Conflict', 'Protest', 'Political Unrest', 'Other']

  // Fetch data function
  const fetchConflicts = async () => {
    const { data, error } = await supabase
      .from('conflicts')
      .select('*')
      .order('published_at', { ascending: false })

    if (data) {
      // Filter out ANY test alerts (case insensitive)
      const conflicts = (data as Conflict[]).filter(c => !c.title.toUpperCase().includes("TEST"));

      /* 
      // NOTIFICATION LOGIC DISABLED PER USER REQUEST
      // 1. Identify which IDs are new (not in our seen set)
      const newItems = conflicts.filter(c => !seenIdsRef.current.has(c.id));

      // 2. Determine "Freshness" threshold (e.g. items created in last 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Collect items that should trigger a notification
      const itemsToNotify: Conflict[] = [];

      newItems.forEach(item => {
        // Condition A: It's a subsequent update (we already have seen IDs, so this is definitely new arrival)
        const isSubsequentUpdate = seenIdsRef.current.size > 0;

        // Condition B: It's a "Fresh" item (created recently), so we notify even on first load
        const isFresh = new Date(item.created_at) > oneHourAgo;

        if (isSubsequentUpdate || isFresh) {
          itemsToNotify.push(item);
        }
      });

      // If we have new items to notify, update the state
      // We prepend them to the existing list and keep max 5
      if (itemsToNotify.length > 0) {
        setNotifications(prev => {
          // Combine new items + previous items
          const combined = [...itemsToNotify, ...prev];
          // Ensure uniqueness just in case (by ID)
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          // Sort by published_at desc just to be sure, or keep order of arrival? 
          // Usually newest on top.
          return unique.slice(0, 5);
        });
      }
      */

      // 3. Update seen IDs
      conflicts.forEach(c => seenIdsRef.current.add(c.id));

      setAllConflicts(conflicts)

      // Calculate date range from data
      if (conflicts.length > 0) {
        const dates = conflicts.map(c => new Date(c.published_at))

        // Normalize to midnight to ensure slider steps align correctly
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
        minDate.setHours(0, 0, 0, 0)

        const dataMaxDate = new Date(Math.max(...dates.map(d => d.getTime())))
        dataMaxDate.setHours(0, 0, 0, 0)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const maxDate = dataMaxDate > today ? dataMaxDate : today
        setDateRange({ min: minDate, max: maxDate })

        // Only set current date on first load if null
        if (!currentDate) setCurrentDate(new Date())
      }
    }
    if (error) console.error('Error fetching conflicts:', error)
    setLoading(false)
  }

  // Initial Fetch
  useEffect(() => {
    fetchConflicts()
  }, [])

  // Auto-refresh RSS feeds in background on page load (Throttled)
  useEffect(() => {
    const triggerFeedRefresh = async () => {
      // 1. Check Session Storage to prevent multiple tabs/reloads from hammering the API
      const lastRefresh = sessionStorage.getItem('last_feed_refresh');
      const now = Date.now();
      const COOLDOWN = 5 * 60 * 1000; // 5 Minutes

      if (lastRefresh && (now - parseInt(lastRefresh)) < COOLDOWN) {
        console.log('Skipping RSS refresh (Cooldown active)');
        return;
      }

      try {
        console.log('Triggering RSS feed refresh (Batch)...')
        const response = await fetch('/api/ingest')
        const result = await response.json()
        console.log('Feed refresh result:', result)

        if (result.success) {
          // Update timestamp
          sessionStorage.setItem('last_feed_refresh', Date.now().toString());

          // If new items were processed, re-fetch conflicts
          if (result.processed > 0 || result.inserted > 0) {
            console.log("New items found, refreshing map...");
            fetchConflicts();
          }
        }
      } catch (error) {
        console.error('Error refreshing feed:', error)
      }
    }

    // Initial call (will be blocked by check if recently done)
    triggerFeedRefresh()

    // Poll every 5 minutes (5 * 60 * 1000)
    // Small offset to ensure cooldown passes
    const interval = setInterval(triggerFeedRefresh, 5 * 60 * 1000 + 1000);

    return () => clearInterval(interval);
  }, [])



  // Auto-advance date when playing
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentDate(prev => {
          if (!prev) return new Date()
          const next = new Date(prev)
          next.setDate(next.getDate() + 1)
          // Stop if we reach today/future
          if (next > new Date()) {
            setIsPlaying(false)
            return prev
          }
          return next
        })
      }, 500 / playbackSpeed) // Speed up based on playbackSpeed
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, playbackSpeed])

  // Auto-expand article analysis when there's only 1 item in sidebar
  useEffect(() => {
    if (showClusterSidebar && clusterConflicts.length === 1) {
      setSelectedArticleId(clusterConflicts[0].id)
    }
  }, [showClusterSidebar, clusterConflicts])

  // Filter conflicts based on selected date, search text, and category
  const filteredConflicts = useMemo(() => {
    // Pre-calculate filter values to avoid re-calculating
    const now = new Date();
    // 1. Filter by DATE (Day granularity)
    // Convert both to YYYY-MM-DD for comparison
    const targetDateStr = currentDate ? currentDate.toDateString() : "";
    const isTargetToday = currentDate && currentDate.toDateString() === now.toDateString();

    let filtered = allConflicts.filter(c => {
      const cDate = new Date(c.published_at)
      return cDate.toDateString() === targetDateStr
    })

    // Calculate 24h threshold for "Ingested Recently" logic
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const searchLower = searchTerm.toLowerCase();

    return allConflicts.filter(c => {
      // 1. Hybrid Date Filter (The "Freshness" Logic)
      if (targetDateStr) {
        const pubDate = new Date(c.published_at);

        // If user selected TODAY: Show items published today OR ingested in last 24h
        if (isTargetToday) {
          const isPublishedToday = pubDate.toDateString() === targetDateStr;
          const ingestDate = new Date(c.created_at); // When we fetched it
          const isIngestedRecently = ingestDate > twentyFourHoursAgo;

          if (!isPublishedToday && !isIngestedRecently) {
            return false;
          }
        }
        // For past dates: Strict publication date match
        else if (pubDate.toDateString() !== targetDateStr) {
          return false;
        }
      }

      // 2. Category Check (Fastest first)
      if (selectedCategory !== 'All' && c.category !== selectedCategory) {
        return false;
      }

      // 3. Search Check (Slowest)
      if (searchTerm !== '') {
        const titleMatch = c.title.toLowerCase().includes(searchLower);
        const locMatch = c.location_name && c.location_name.toLowerCase().includes(searchLower);
        if (!titleMatch && !locMatch) return false;
      }

      return true;
    })
  }, [allConflicts, currentDate, searchTerm, selectedCategory])

  // Stats calculation:
  // - If Live (Today): Show only last 24h
  // - If Timeline (Past): Show conflicts for that day (same as map)
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

  // Today's conflicts (midnight to midnight in user's local timezone)
  const todayConflicts = useMemo(() => {
    // Get start of today in user's local timezone
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return allConflicts.filter(c => new Date(c.published_at) >= startOfToday);
  }, [allConflicts]);

  // Ensure safe max date for timeline
  const timelineMaxDate = useMemo(() => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Normalize to midnight

      if (!dateRange.max) return now;

      // Ensure dateRange.max is also normalized (it should be from state, but double check)
      const max = new Date(dateRange.max);
      max.setHours(0, 0, 0, 0);

      return max > now ? max : now;
    } catch (e) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now;
    }
  }, [dateRange.max]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-[1000] pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="relative pointer-events-auto">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 drop-shadow-sm">
              Global Conflict Tracker
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real-time situational awareness <span className="text-xs text-emerald-400 ml-2">v{packageJson.version}</span></p>


            {/* Stats Panel - Compact standalone box */}
            <div className="mt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg inline-block transition-colors">
              <div className="flex gap-5 items-end">
                {/* 24H Activity */}
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">24h</div>
                  <div className="text-3xl font-bold text-blue-400 leading-none">{statsConflicts.length}</div>
                </div>
                {/* Today's Activity */}
                <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Today</div>
                  <div className="text-3xl font-bold text-emerald-500 dark:text-emerald-400 leading-none">{todayConflicts.length}</div>
                </div>
              </div>
              <div className="mt-1.5 flex gap-1.5 text-[10px]">
                <span className="bg-red-600/20 text-red-400 px-2 py-0.5 rounded">
                  ⚔️ {statsConflicts.filter(c => c.category === 'Armed Conflict').length}
                </span>
                <span className="bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded">
                  📣 {statsConflicts.filter(c => c.category === 'Protest').length}
                </span>
                <span className="bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded">
                  ⚠️ {statsConflicts.filter(c => c.category === 'Political Unrest').length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto items-center">
            <ThemeToggle theme={theme} toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} />
            <button className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm transition-all shadow-lg font-medium">
              About
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters Overlay (Top Right) - Compact */}
      <div className="absolute top-20 right-6 z-[1000] flex flex-col gap-2 items-end pointer-events-none">

        {/* Filter Controls */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl pointer-events-auto flex flex-col gap-2 w-64 transition-all">
          {/* Search Input with Icon */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search location or keyword..."
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg pl-8 pr-8 py-2 text-sm text-slate-900 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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

          {/* Category Filters */}
          <div>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1.5">Filter by Category</div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => {
                // Define dynamic styles
                const isSelected = selectedCategory === cat;
                let styleClass = '';

                if (cat === 'Armed Conflict') {
                  styleClass = isSelected
                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-red-900/20 border-red-800 text-red-500 hover:bg-red-900/40 hover:border-red-600';
                } else if (cat === 'Protest') {
                  styleClass = isSelected
                    ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-amber-900/20 border-amber-800 text-amber-500 hover:bg-amber-900/40 hover:border-amber-600';
                } else if (cat === 'Political Unrest') {
                  styleClass = isSelected
                    ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-orange-900/20 border-orange-800 text-orange-500 hover:bg-orange-900/40 hover:border-orange-600';
                } else { // Other
                  styleClass = isSelected
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-blue-900/20 border-blue-800 text-blue-500 hover:bg-blue-900/40 hover:border-blue-600';
                }

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-all font-medium ${styleClass}`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results Count */}
          <div className="text-[10px] text-slate-500 dark:text-slate-500 font-mono pt-1.5 border-t border-slate-200 dark:border-slate-700">
            Showing {filteredConflicts.length} of {allConflicts.length} conflicts
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
        />
      </div>

      {/* Timeline Controls */}
      {currentDate && (
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

      {/* Cluster Sidebar: Situation Report */}
      {showClusterSidebar && (
        <div
          className={`absolute right-0 top-0 h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-700 z-[2000] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 transition-colors ease-out`}
          style={{ width: sidebarExpanded ? '700px' : '400px' }}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-900 transition-colors">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-blue-600 dark:text-blue-400 font-bold mb-1">Situation Report</div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {clusterConflicts[0]?.location_name || 'Multiple Locations'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full bg-green-500`}></span>
                Live Monitoring Active • {clusterConflicts.length} Reports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-600 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:border-blue-500"
                title={sidebarExpanded ? "Collapse panel" : "Expand panel"}
              >
                {sidebarExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowClusterSidebar(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center border border-slate-200 dark:border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Intel Stats */}
          <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 transition-colors">
              <div className="text-[10px] text-slate-500 uppercase">Primary Threat</div>
              <div className="text-sm font-bold text-red-400 mt-0.5">
                {/* Find most common category */}
                {Object.entries(clusterConflicts.reduce((acc, curr) => {
                  acc[curr.category] = (acc[curr.category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 transition-colors">
              <div className="text-[10px] text-slate-500 uppercase">Intensity Level</div>
              <div className="text-sm font-bold text-orange-400 mt-0.5">
                {/* Max Severity */}
                {Math.max(...clusterConflicts.map(c => c.severity)) >= 4 ? 'CRITICAL' : 'ELEVATED'}
              </div>
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-white/95 dark:bg-slate-900/95 py-2 backdrop-blur z-10 border-b border-slate-100 dark:border-slate-800 transition-colors">
              Latest Updates
            </div>

            {clusterConflicts.slice(0, 50).map((conflict, i) => (
              <div
                key={conflict.id}
                className="relative pl-6 pb-2 border-l border-slate-200 dark:border-slate-800 transition-colors group"
              >
                {/* Timeline dot */}
                <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-50 dark:border-slate-900 ${i === 0 ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                  }`}></div>

                <div
                  className={`bg-slate-100/50 dark:bg-slate-800/30 hover:bg-slate-200/50 dark:hover:bg-slate-800 border ${selectedArticleId === conflict.id ? 'border-blue-500 shadow-blue-500/10 shadow-lg' : 'border-slate-200 dark:border-slate-700/50 hover:border-blue-500/50'} rounded-lg transition-all cursor-pointer overflow-hidden`}
                  onClick={() => setSelectedArticleId(selectedArticleId === conflict.id ? null : conflict.id)}
                >
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${conflict.severity >= 4 ? 'bg-red-600' : 'bg-slate-400 dark:bg-slate-600'
                        }`}>
                        {conflict.category}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {format(new Date(conflict.published_at), 'HH:mm')}
                      </span>
                    </div>

                    <h4 className={`text-sm font-medium transition-colors leading-snug mb-1 ${selectedArticleId === conflict.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                      {conflict.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-500 line-clamp-2 leading-relaxed">
                      {conflict.description?.replace(/<[^>]*>/g, '') || 'No description available'}
                    </p>

                    {/* Source Link (Only visible if expanded or hover?) - Always visible now for utility */}
                    <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <a href={conflict.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-blue-400 flex items-center gap-1">
                        Read Source <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* AI Panel Expansion */}
                  {selectedArticleId === conflict.id && (
                    <AIAnalysisPanel conflict={conflict} />
                  )}
                </div>
              </div>
            ))}

            {clusterConflicts.length > 50 && (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                + {clusterConflicts.length - 50} more reports not shown for clarity
              </div>
            )}
          </div>
        </div>
      )
      }

      {/* Custom Notification Center + Judge Center (shifts left when sidebar expanded) */}
      <div
        className="fixed top-6 z-[3000] flex items-center gap-3 transition-all duration-500 ease-out"
        style={{
          left: sidebarExpanded && showClusterSidebar ? 'calc(50% - 175px)' : '50%',
          transform: 'translateX(-50%)'
        }}
      >
        <NotificationCenter
          notifications={notifications}
          onLocate={(item) => {
            setCurrentDate(new Date(item.published_at))
          }}
          onDismiss={(id) => {
            setNotifications(prev => prev.filter(n => n.id !== id))
          }}
          onClearAll={() => setNotifications([])}
        />
        <JudgeCenter
          conflicts={allConflicts}
          onLocate={(conflict) => {
            setCurrentDate(new Date(conflict.published_at))
            // Open cluster sidebar with this conflict
            setClusterConflicts([conflict])
            setShowClusterSidebar(true)
          }}
        />
      </div>

      {/* News Ticker */}
      <NewsTicker conflicts={filteredConflicts} />

      {/* Loading Indicator */}
      {
        loading && (
          <div className="absolute inset-0 z-[2000] bg-slate-950 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )
      }

    </main >
  )
}
