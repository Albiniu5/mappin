
'use client'


import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { Database } from '@/types/supabase'

type Conflict = Database['public']['Tables']['conflicts']['Row']

interface MapWrapperProps {
    conflicts: Conflict[]
}

export default function MapWrapper({ conflicts }: MapWrapperProps) {
    const Map = useMemo(() => dynamic(
        () => import('@/components/ConflictMap'),
        {
            loading: () => <div className="h-full w-full bg-slate-900 animate-pulse" />,
            ssr: false
        }
    ), [])

    return <Map />
}
