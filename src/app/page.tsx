
'use client'

import MapWrapper from '@/components/MapWrapper'
import Timeline from '@/components/Timeline'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type Conflict = Database['public']['Tables']['conflicts']['Row']

export default function Home() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [allConflicts, setAllConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isPlaying, setIsPlaying] = useState(false)

  const categories = ['All', 'Armed Conflict', 'Protest', 'Political Unrest', 'Other']

  // Fetch data on mount
  useEffect(() => {
    const fetchConflicts = async () => {
      const { data, error } = await supabase
        .from('conflicts')
        .select('*')
        .order('published_at', { ascending: false })

      if (data) {
        const conflicts = data as Conflict[]
        setAllConflicts(conflicts)
        // Set date to most recent event if available
        if (conflicts.length > 0) {
          setCurrentDate(new Date(conflicts[0].published_at))
        }
      }
      if (error) console.error('Error fetching conflicts:', error)
      setLoading(false)
    }

    fetchConflicts()
  }, [])

  // Auto-advance date when playing
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentDate(prev => {
          const next = new Date(prev)
          next.setDate(next.getDate() + 1)
          // Stop if we reach today/future
          if (next > new Date()) {
            setIsPlaying(false)
            return prev
          }
          return next
        })
      }, 500)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying])

  // Filter conflicts based on selected date, search text, and category
  const filteredConflicts = useMemo(() => {
    return allConflicts.filter(c => {
      const pubDate = new Date(c.published_at)

      // Allow a 24-hour window for "same day" or stick to exact date string
      const isSameDate = pubDate.toDateString() === currentDate.toDateString()

      const matchesSearch = searchTerm === '' ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location_name && c.location_name.toLowerCase().includes(searchTerm.toLowerCase())) || false

      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory

      return isSameDate && matchesSearch && matchesCategory
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
        <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl pointer-events-auto flex flex-col gap-3 w-72 transition-all">
          <input
            type="text"
            placeholder="Search location or keyword..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all ${selectedCategory === cat
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapWrapper conflicts={filteredConflicts} />
      </div>

      {/* Timeline Controls */}
      <Timeline
        date={currentDate}
        setDate={setCurrentDate}
        isPlaying={isPlaying}
        onPlayToggle={() => setIsPlaying(!isPlaying)}
      />

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-0 z-[2000] bg-slate-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

    </main>
  )
}
