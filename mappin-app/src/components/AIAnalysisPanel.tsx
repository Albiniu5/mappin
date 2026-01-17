

import { useState, useEffect } from 'react';
import { Loader2, Sparkles, BookOpen, Clock, Users, Globe, ExternalLink, AlertTriangle, Eye, Activity, Radio, Brain, Syringe } from 'lucide-react';

interface AnalysisData {
    summary: string;
    background: string;
    actors: { name: string; role: string }[];
    significance: string;
    timeline: { date: string; event: string }[];
    verified_facts: string[];
    unknowns: string[];
    interesting_facts: string[];
    external_context: string[];
}

interface AlienData {
    alien_specific_type: string;
    hynek_scale: string;
    credibility_score: number;
    witness_type: string;
    evidence_type: string;
    skeptic_explanation: string;
    believer_explanation: string;
    speculative_analysis: string[];
    pattern_match: string;
    summary: string;
}

interface AIAnalysisPanelProps {
    conflict: {
        id: string;
        title: string;
        description: string | null;
        source_url: string;
        published_at: string;
        location_name: string | null;
        category: string;
        narrative_analysis?: string | null;
        related_reports?: any | null;
    };
    isAlienMode?: boolean;
}

export default function AIAnalysisPanel({ conflict, isAlienMode = false }: AIAnalysisPanelProps) {
    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSkepticMode, setIsSkepticMode] = useState(false); // Alien Toggle

    // 1. ALIEN MODE PRE-EMPTION
    // If in Alien Mode, we prioritize the pre-calculated data stored in related_reports
    const alienData: AlienData | null = (isAlienMode && conflict.category === 'Alien' && conflict.related_reports)
        ? (typeof conflict.related_reports === 'string' ? JSON.parse(conflict.related_reports) : conflict.related_reports)
        : null;

    useEffect(() => {
        // If we have alien data, we don't need to fetch anything
        if (alienData) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        async function fetchAnalysis() {
            try {
                setLoading(true);
                setError(null);
                setAnalysis(null);

                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conflict_id: conflict.id,
                        title: conflict.title,
                        source: new URL(conflict.source_url).hostname.replace('www.', ''),
                        published_at: conflict.published_at,
                        content: conflict.description || conflict.title,
                        source_url: conflict.source_url
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to analyze article');
                }

                const data = await response.json();
                if (isMounted) setAnalysis(data);

            } catch (err: any) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (conflict && !alienData) {
            fetchAnalysis();
        }

        return () => { isMounted = false; };
    }, [conflict.id, alienData]);

    // --- ALIEN MODE RENDERING ---
    if (alienData) {
        return (
            <div className="bg-slate-900/50 border-t border-green-900/50 animate-in slide-in-from-bottom duration-500 font-mono">
                {/* Alien Header */}
                <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 px-5 py-3 border-b border-green-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                        <span className="text-xs font-bold text-green-100 uppercase tracking-widest">
                            Alien AI Lens
                        </span>
                    </div>
                    {/* Credibility Meter */}
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-green-400 uppercase">Credibility</span>
                        <div className="w-16 h-1.5 bg-green-900/50 rounded-full overflow-hidden border border-green-800">
                            <div
                                className={`h-full ${alienData.credibility_score > 70 ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : alienData.credibility_score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${alienData.credibility_score || 0}%` }}
                            ></div>
                        </div>
                        <span className="text-[9px] font-bold text-green-300">{alienData.credibility_score}%</span>
                    </div>
                </div>

                {/* Classification Banner */}
                <div className="bg-black/40 px-5 py-2 flex justify-between items-center border-b border-green-900/20">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Classification</span>
                    <div className="flex gap-2">
                        {alienData.hynek_scale && alienData.hynek_scale !== 'N/A' && (
                            <span className="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-bold uppercase">
                                {alienData.hynek_scale}
                            </span>
                        )}
                        <span className="text-[10px] bg-green-900/40 text-green-300 px-2 py-0.5 rounded border border-green-500/30 font-bold uppercase">
                            {alienData.alien_specific_type || 'Unknown Anomaly'}
                        </span>
                    </div>
                </div>

                {/* Toggle SKEPTIC vs BELIEVER */}
                <div className="p-3 border-b border-green-900/20 flex justify-center">
                    <div className="bg-black/60 p-1 rounded-lg flex gap-1 border border-green-900/30">
                        <button
                            onClick={() => setIsSkepticMode(false)}
                            className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition-all flex items-center gap-1.5 ${!isSkepticMode ? 'bg-green-900/60 text-green-300 shadow-lg shadow-green-900/20 border border-green-700/50' : 'text-slate-500 hover:text-green-400'}`}
                        >
                            👽 Believer Mode
                        </button>
                        <button
                            onClick={() => setIsSkepticMode(true)}
                            className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-bold transition-all flex items-center gap-1.5 ${isSkepticMode ? 'bg-blue-900/60 text-blue-300 shadow-lg shadow-blue-900/20 border border-blue-700/50' : 'text-slate-500 hover:text-blue-400'}`}
                        >
                            🧠 Skeptic Mode
                        </button>
                    </div>
                </div>

                <div className="p-5 space-y-6">
                    {/* Explanation Content */}
                    <section className="animate-in fade-in slide-in-from-top-2 duration-500">
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${isSkepticMode ? 'text-blue-400' : 'text-green-400'}`}>
                            {isSkepticMode ? <Brain className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {isSkepticMode ? 'Scientific / Conventional Analysis' : 'Extraterrestrial / Anomalous Hypothesis'}
                        </h4>
                        <p className={`text-sm leading-relaxed p-3 rounded-lg border  italic ${isSkepticMode ? 'bg-blue-900/10 border-blue-800/30 text-blue-200' : 'bg-green-900/10 border-green-800/30 text-green-200 shadow-[0_0_15px_rgba(34,197,94,0.05)]'}`}>
                            "{isSkepticMode ? alienData.skeptic_explanation : alienData.believer_explanation}"
                        </p>
                    </section>

                    {/* Data Grid */}
                    <section className="grid grid-cols-2 gap-3">
                        <div className="bg-black/30 p-2 rounded border border-green-900/20">
                            <div className="text-[9px] text-slate-500 uppercase mb-1">Witness Type</div>
                            <div className="text-xs font-bold text-green-300 flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-green-600" /> {alienData.witness_type}
                            </div>
                        </div>
                        <div className="bg-black/30 p-2 rounded border border-green-900/20">
                            <div className="text-[9px] text-slate-500 uppercase mb-1">Evidence</div>
                            <div className="text-xs font-bold text-green-300 flex items-center gap-1.5">
                                <Activity className="w-3 h-3 text-green-600" /> {alienData.evidence_type}
                            </div>
                        </div>
                    </section>

                    {/* Community Safe Speculation */}
                    {alienData.speculative_analysis && (
                        <div className="bg-amber-900/10 border border-amber-600/30 rounded-lg p-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-1 opacity-20">
                                <AlertTriangle className="w-12 h-12 text-amber-500" />
                            </div>
                            <h5 className="text-[10px] text-amber-500 font-bold uppercase mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Community-Safe Speculation
                            </h5>
                            <ul className="space-y-1.5 relative z-10">
                                {alienData.speculative_analysis.map((item, i) => (
                                    <li key={i} className="text-[11px] text-amber-200/90 flex gap-2 items-start">
                                        <span className="text-amber-500/50 font-mono">{i + 1}.</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Pattern Match */}
                    {alienData.pattern_match && (
                        <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2 flex gap-2 items-center">
                            <Globe className="w-3 h-3 text-purple-400" />
                            <span><span className="text-purple-400 font-bold">Pattern Alert:</span> {alienData.pattern_match}</span>
                        </div>
                    )}

                </div>
            </div>
        );
    }

    // --- STANDARD MODE RENDERING (Fallback) ---
    if (loading) {
        return (
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
                <div className="flex flex-col items-center justify-center space-y-3 py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 dark:text-blue-400 animate-spin" />
                    <p className="text-xs text-blue-500 dark:text-blue-400 font-medium animate-pulse">
                        Analyzing intelligence reports...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-red-500 dark:text-red-400">Analysis unavailable: {error}</p>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-500">
            {/* AI Banner */}
            <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 px-5 py-3 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-100 uppercase tracking-widest">
                        Intelligence Brief
                    </span>
                </div>
                {conflict.narrative_analysis && (
                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30 uppercase tracking-wider font-bold">
                        Judge Verdict Available ⚖️
                    </span>
                )}
            </div>

            <div className="p-5 space-y-6">

                {/* 0. THE VERDICT (Narrative Analysis) - Highlights if available */}
                {conflict.narrative_analysis && (
                    <section className="animate-in fade-in slide-in-from-top-2 duration-700">
                        <div className="relative">
                            <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                            <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2 pl-3">
                                ⚖️ The Verdict (Narrative Comparison)
                            </h4>
                            <div className="pl-3">
                                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-200 dark:border-indigo-500/30 shadow-inner italic">
                                    "{conflict.narrative_analysis}"
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* 1. Summary */}
                <section>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <BookOpen className="w-3 h-3" /> Briefing
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                        {analysis.summary}
                    </p>
                </section>

                {/* 2. Key Actors Grid */}
                {analysis.actors?.length > 0 && (
                    <section>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Users className="w-3 h-3" /> Key Actors
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {analysis.actors.map((actor, i) => (
                                <div key={i} className="bg-slate-100 dark:bg-slate-800/30 p-2.5 rounded border border-slate-200 dark:border-slate-700/50 flex flex-col">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{actor.name}</span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{actor.role}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 3. Significance & Background */}
                <section className="space-y-4">
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Globe className="w-3 h-3" /> Strategic Context
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {analysis.background}
                        </p>
                    </div>
                </section>

                {/* 4. Timeline */}
                {analysis.timeline?.length > 0 && (
                    <section>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Timeline
                        </h4>
                        <div className="space-y-3 relative pl-2">
                            {/* Vertical Line */}
                            <div className="absolute left-[4.5px] top-1 bottom-1 w-px bg-slate-300 dark:bg-slate-700"></div>

                            {analysis.timeline.map((item, i) => (
                                <div key={i} className="relative pl-4">
                                    <div className="absolute left-0 top-1.5 w-2.5 h-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-full z-10"></div>
                                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 block mb-0.5">{item.date}</span>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{item.event}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 5. Facts & Unknowns */}
                <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                        <h5 className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase mb-2">Verified Facts</h5>
                        <ul className="space-y-1">
                            {analysis.verified_facts?.map((fact, i) => (
                                <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400 flex gap-2 items-start">
                                    <span className="mt-1 w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></span>
                                    {fact}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {analysis.unknowns?.length > 0 && (
                        <div>
                            <h5 className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase mb-2">Unknown / Unclear</h5>
                            <ul className="space-y-1">
                                {analysis.unknowns.map((fact, i) => (
                                    <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400 flex gap-2 items-start">
                                        <span className="mt-1 w-1 h-1 bg-amber-500 rounded-full flex-shrink-0"></span>
                                        {fact}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

