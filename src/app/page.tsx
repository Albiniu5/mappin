
'use client'

import MapWrapper from '@/components/MapWrapper'
import Timeline from '@/components/Timeline'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { Search, Loader2, X } from 'lucide-react'
import { format } from 'date-fns'

type Conflict = Database['public']['Tables']['conflicts']['Row']

import { toast } from 'sonner'
import { useRef } from 'react'
import NewsTicker from '@/components/NewsTicker'

export default function Home() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [allConflicts, setAllConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isPlaying, setIsPlaying] = useState(false)
  const [dateRange, setDateRange] = useState({ min: new Date(), max: new Date() })
  const [clusterConflicts, setClusterConflicts] = useState<Conflict[]>([])
  const [showClusterSidebar, setShowClusterSidebar] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

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
      console.log("Supabase Data:", data);
      // Filter out test alerts
      const conflicts = (data as Conflict[]).filter(c => !c.title.startsWith("TEST ALERT"));

      // NOTIFICATION LOGIC
      // 1. Identify which IDs are new (not in our seen set)
      const newItems = conflicts.filter(c => !seenIdsRef.current.has(c.id));

      // 2. Determine "Freshness" threshold (e.g. items created in last 1 hour)
      // This allows us to notify on Page Load for *very recent* items, without spamming entire history.
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      newItems.forEach(item => {
        // Condition A: It's a subsequent update (we already have seen IDs, so this is definitely new arrival)
        const isSubsequentUpdate = seenIdsRef.current.size > 0;

        // Condition B: It's a "Fresh" item (created recently), so we notify even on first load
        const isFresh = new Date(item.created_at) > oneHourAgo;

        if (isSubsequentUpdate || isFresh) {
          // Deduplicate toasts (Sonner might handle this, but let's be safe)
          // Actually, we just rely on the loop.
          // Limit to max 5 is handled by layout, but we don't want to fire 50 toasts at once.
          // So we only fire if it's in the top 5 of *this batch*?
          // Actually, let's just fire. Layout handles the stack.

          toast.info(item.title, {
            id: `conflict-${item.id}`, // Deduplication ID
            description: `${item.location_name || 'Unknown Location'} • ${format(new Date(item.published_at), 'HH:mm')}`,
            duration: Infinity,
            dismissible: true,
            action: {
              label: 'Locate',
              onClick: () => {
                setCurrentDate(new Date(item.published_at))
              }
            }
          })
        }
      });

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

  // Auto-refresh RSS feeds in background on page load
  useEffect(() => {
    const triggerFeedRefresh = async () => {
      try {
        console.log('Triggering RSS feed refresh...')
        const response = await fetch('/api/ingest')
        const result = await response.json()
        console.log('Feed refresh result:', result)

        // If new items were processed, re-fetch conflicts
        if (result.success && (result.processed > 0 || result.inserted > 0)) {
          console.log("New items found, refreshing map...");
          fetchConflicts();
        }
      } catch (error) {
        console.error('Error refreshing feed:', error)
      }
    }

    // Initial call
    triggerFeedRefresh()

    // Poll every 30 minutes (30 * 60 * 1000)
    const interval = setInterval(triggerFeedRefresh, 30 * 60 * 1000);

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

  // Filter conflicts based on selected date, search text, and category
  const filteredConflicts = useMemo(() => {
    // Pre-calculate filter values to avoid re-calculating inside the loop
    const now = new Date();
    const targetDateStr = currentDate ? currentDate.toDateString() : "";
    const isTargetToday = currentDate && currentDate.toDateString() === now.toDateString();

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
      console.log(`📊 Stats: Total=${allConflicts.length}, Recent24h=${recent.length}, Threshold=${oneDayAgo.toISOString()}`);
      return recent;
    }

    return filteredConflicts;
  }, [allConflicts, currentDate, filteredConflicts]);

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
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-[1000] pointer-events-none">
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 drop-shadow-sm">
              Global Conflict Tracker
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real-time situational awareness <span className="text-xs text-emerald-400 ml-2">v1.16.17</span></p>

            {/* Stats Panel */}
            <div className="mt-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg p-3 shadow-lg">
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">24h Activity</div>
              <div className="text-3xl font-bold text-blue-400">{statsConflicts.length}</div>
              <div className="mt-2 flex gap-2 text-[10px]">
                <span className="bg-red-600/20 text-red-400 px-2 py-1 rounded">
                  ⚔️ {statsConflicts.filter(c => c.category === 'Armed Conflict').length}
                </span>
                <span className="bg-amber-600/20 text-amber-400 px-2 py-1 rounded">
                  📣 {statsConflicts.filter(c => c.category === 'Protest').length}
                </span>
                <span className="bg-orange-600/20 text-orange-400 px-2 py-1 rounded">
                  ⚠️ {statsConflicts.filter(c => c.category === 'Political Unrest').length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="bg-slate-900/80 backdrop-blur border border-slate-700 hover:border-blue-500 hover:text-blue-400 text-slate-300 px-4 py-2 rounded-lg text-sm transition-all shadow-lg font-medium">
              About
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters Overlay (Top Right) */}
      <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3 items-end pointer-events-none">

        {/* Filter Controls */}
        <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl pointer-events-auto flex flex-col gap-3 w-80 transition-all">
          {/* Search Input with Icon */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search location or keyword..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Filter by Category</div>
            <div className="flex flex-wrap gap-2">
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
                    className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all font-medium ${styleClass}`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>



          {/* Results Count */}
          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-700">
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
        <div className="absolute right-0 top-0 h-full w-[400px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 z-[2000] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-5 border-b border-slate-700 flex justify-between items-start bg-slate-900">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">Situation Report</div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {/* Logic to find location name frequency */}
                {clusterConflicts[0]?.location_name || 'Multiple Locations'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live Intel • {clusterConflicts.length} Reports
              </p>
            </div>
            <button
              onClick={() => setShowClusterSidebar(false)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Intel Stats */}
          <div className="grid grid-cols-2 gap-px bg-slate-700/50 border-b border-slate-700">
            <div className="bg-slate-900 p-4">
              <div className="text-[10px] text-slate-500 uppercase">Primary Threat</div>
              <div className="text-sm font-bold text-red-400 mt-0.5">
                {/* Find most common category */}
                {Object.entries(clusterConflicts.reduce((acc, curr) => {
                  acc[curr.category] = (acc[curr.category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'}
              </div>
            </div>
            <div className="bg-slate-900 p-4">
              <div className="text-[10px] text-slate-500 uppercase">Intensity Level</div>
              <div className="text-sm font-bold text-orange-400 mt-0.5">
                {/* Max Severity */}
                {Math.max(...clusterConflicts.map(c => c.severity)) >= 4 ? 'CRITICAL' : 'ELEVATED'}
              </div>
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-900/95 py-2 backdrop-blur z-10 border-b border-slate-800">
              Latest Updates
            </div>

            {clusterConflicts.slice(0, 50).map((conflict, i) => (
              <a
                key={conflict.id}
                href={conflict.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative pl-6 pb-2 border-l border-slate-800 hover:border-blue-500/50 transition-colors group"
              >
                {/* Timeline dot */}
                <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${i === 0 ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'
                  }`}></div>

                <div className="bg-slate-800/30 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 rounded-lg p-3 transition-all group-hover:shadow-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${conflict.severity >= 4 ? 'bg-red-600' : 'bg-slate-600'
                      }`}>
                      {conflict.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {format(new Date(conflict.published_at), 'HH:mm')}
                    </span>
                  </div>

                  <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors leading-snug mb-1">
                    {conflict.title}
                  </h4>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {conflict.description?.replace(/<[^>]*>/g, '') || 'No description available'}
                  </p>
                </div>
              </a>
            ))}

            {clusterConflicts.length > 50 && (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                + {clusterConflicts.length - 50} more reports not shown for clarity
              </div>
            )}
          </div>
        </div>
      )}

      {/* News Ticker */}
      <NewsTicker conflicts={filteredConflicts} />

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-0 z-[2000] bg-slate-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

    </main>
  )
}
