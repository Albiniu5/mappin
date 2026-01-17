"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

export default function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <button
            onClick={toggleTheme}
            className={`
        p-2 rounded-lg transition-all duration-300 border shadow-lg backdrop-blur-md
        group hover:scale-105 active:scale-95
        ${theme === 'dark'
                    ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-blue-400 shadow-blue-900/10'
                    : 'bg-white/90 border-slate-200 text-slate-500 hover:text-amber-500 shadow-slate-200'}
      `}
            aria-label="Toggle theme"
        >
            <div className="relative w-5 h-5">
                <Sun className={`w-5 h-5 absolute inset-0 transition-all duration-500 rotate-0 scale-100 ${theme === 'dark' ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100'}`} />
                <Moon className={`w-5 h-5 absolute inset-0 transition-all duration-500 rotate-90 scale-50 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0'}`} />
            </div>
        </button>
    );
}
