
'use client'

import MapWrapper from '@/components/MapWrapper'
import Timeline from '@/components/Timeline'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { Search, Loader2, Database as DatabaseIcon, X } from 'lucide-react'
import { format } from 'date-fns'

type Conflict = Database['public']['Tables']['conflicts']['Row']

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

  const categories = ['All', 'Armed Conflict', 'Protest', 'Political Unrest', 'Other']

  // Fetch data function
  const fetchConflicts = async () => {
    const { data, error } = await supabase
      .from('conflicts')
      .select('*')
      .order('published_at', { ascending: false })

    if (data) {
      console.log("Supabase Data:", data);
      const conflicts = data as Conflict[]
      setAllConflicts(conflicts)

      // Calculate date range from data
      if (conflicts.length > 0) {
        const dates = conflicts.map(c => new Date(c.published_at))
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
        setDateRange({ min: minDate, max: maxDate })
        // Only set current date on first load if null
        if (!currentDate) setCurrentDate(maxDate)
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
    triggerFeedRefresh()
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
    return allConflicts.filter(c => {
      const pubDate = new Date(c.published_at)

      // If "Today" (Live Mode) is selected, show ALL history (clusters handle performance)
      // If a specific past date is selected, show ONLY that date

      const isToday = currentDate
        ? currentDate.toDateString() === new Date().toDateString()
        : true;

      const isWithinRange = currentDate
        ? (isToday ? true : pubDate.toDateString() === currentDate.toDateString())
        : true;

      const matchesSearch = searchTerm === '' ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location_name && c.location_name.toLowerCase().includes(searchTerm.toLowerCase())) || false

      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory

      return isWithinRange && matchesSearch && matchesCategory
    })
  }, [allConflicts, currentDate, searchTerm, selectedCategory])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-[1000] pointer-events-none">
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 drop-shadow-sm">
              Global Conflict Tracker
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real-time situational awareness</p>

            {/* Stats Panel */}
            <div className="mt-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg p-3 shadow-lg">
              <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">Active Conflicts</div>
              <div className="text-3xl font-bold text-blue-400">{filteredConflicts.length}</div>
              <div className="mt-2 flex gap-2 text-[10px]">
                <span className="bg-red-600/20 text-red-400 px-2 py-1 rounded">
                  ⚔️ {filteredConflicts.filter(c => c.category === 'Armed Conflict').length}
                </span>
                <span className="bg-amber-600/20 text-amber-400 px-2 py-1 rounded">
                  📣 {filteredConflicts.filter(c => c.category === 'Protest').length}
                </span>
                <span className="bg-orange-600/20 text-orange-400 px-2 py-1 rounded">
                  ⚠️ {filteredConflicts.filter(c => c.category === 'Political Unrest').length}
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
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all font-medium ${selectedCategory === cat
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Admin: Backfill Button */}
          <button
            onClick={async () => {
              const btn = document.getElementById('backfill-btn');
              if (btn) btn.innerHTML = '⏳ Loading...';
              try {
                await fetch('/api/ingest/backfill');
                alert('History populated! Please refresh the page.');
              } catch (e) {
                alert('Error population history');
              }
              if (btn) btn.innerHTML = '📜 Populate History';
            }}
            id="backfill-btn"
            className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-400 flex items-center justify-center gap-2 transition-all"
          >
            <DatabaseIcon size={12} />
            📜 Populate History (5 Years)
          </button>

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
          maxDate={dateRange.max}
          isPlaying={isPlaying}
          onPlayToggle={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
        />
      )}

      {/* Cluster Sidebar */}
      {showClusterSidebar && (
        <div className="absolute right-0 top-0 h-full w-[500px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 z-[2000] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Cluster Details</h3>
              <p className="text-xs text-slate-400 mt-1">{clusterConflicts.length} conflicts in this area</p>
            </div>
            <button
              onClick={() => setShowClusterSidebar(false)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {clusterConflicts.map((conflict) => (
              <a
                key={conflict.id}
                href={conflict.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-3 transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{conflict.category === 'Armed Conflict' ? '⚔️' : conflict.category === 'Protest' ? '📣' : conflict.category === 'Political Unrest' ? '⚠️' : '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                      {conflict.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      <span className="text-orange-400 font-semibold">{conflict.location_name}</span> • {format(new Date(conflict.published_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{conflict.description}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-0 z-[2000] bg-slate-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

    </main>
  )
}
