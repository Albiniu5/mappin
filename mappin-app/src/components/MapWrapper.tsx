
'use client'


import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { Database } from '@/types/supabase'

type Conflict = Database['public']['Tables']['conflicts']['Row']

interface MapWrapperProps {
    conflicts: Conflict[]
    onClusterClick?: (conflicts: Conflict[]) => void
    theme?: 'dark' | 'light'
    isAlienMode?: boolean
}

export default function MapWrapper({ conflicts, onClusterClick, theme, isAlienMode = false }: MapWrapperProps) {
    const Map = useMemo(() => dynamic(
        () => import('@/components/ConflictMap'),
        {
            loading: () => <div className="h-full w-full bg-slate-50 dark:bg-slate-900 animate-pulse" />,
            ssr: false
        }
    ), [])

    return <Map conflicts={conflicts} onClusterClick={onClusterClick} theme={theme} isAlienMode={isAlienMode} />
}
