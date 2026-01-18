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
            className={`h-11 sm:h-9 px-2.5 sm:px-3 rounded-full transition-colors duration-300 flex items-center justify-center ${theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-300'
                : 'hover:bg-slate-100 text-slate-600'
                }`}
            aria-label="Toggle theme"
        >
            <div className="relative w-4 h-4">
                <Sun className={`w-4 h-4 absolute inset-0 transition-all duration-500 rotate-0 scale-100 ${theme === 'dark' ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100'}`} />
                <Moon className={`w-4 h-4 absolute inset-0 transition-all duration-500 rotate-90 scale-50 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0'}`} />
            </div>
        </button>
    );
}
