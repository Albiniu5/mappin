
import { useState, useEffect } from 'react';
import { Loader2, Sparkles, BookOpen, Clock, Users, Globe, ExternalLink } from 'lucide-react';

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

interface AIAnalysisPanelProps {
    conflict: {
        id: string;
        title: string;
        description: string | null;
        source_url: string;
        published_at: string;
        location_name: string | null;
        category: string;
        narrative_analysis?: string | null; // NEW
        related_reports?: any | null; // NEW (Json)
    };
}

export default function AIAnalysisPanel({ conflict }: AIAnalysisPanelProps) {
    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper to parse related reports if they are JSON
    const relatedReports = Array.isArray(conflict.related_reports)
        ? conflict.related_reports
        : typeof conflict.related_reports === 'string'
            ? JSON.parse(conflict.related_reports)
            : [];

    useEffect(() => {
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
                        content: conflict.description || conflict.title, // Fallback if description empty
                        source_url: conflict.source_url // NEW: Enable full article extraction
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

        if (conflict) {
            fetchAnalysis();
        }

        return () => { isMounted = false; };
    }, [conflict.id]);

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 border-t border-slate-800 animate-in fade-in duration-500">
                <div className="flex flex-col items-center justify-center space-y-3 py-8">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <p className="text-xs text-blue-400 font-medium animate-pulse">
                        Analyzing intelligence reports...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-slate-900 border-t border-slate-800 text-center">
                <p className="text-xs text-red-400">Analysis unavailable: {error}</p>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <div className="bg-slate-900/50 border-t border-slate-800 animate-in slide-in-from-bottom duration-500">
            {/* AI Banner */}
            <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 px-5 py-3 border-b border-blue-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-bold text-blue-100 uppercase tracking-widest">
                        Intelligence Brief
                    </span>
                </div>
                {conflict.narrative_analysis && (
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 uppercase tracking-wider font-bold">
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
                            <h4 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2 pl-3">
                                ⚖️ The Verdict (Narrative Comparison)
                            </h4>
                            <div className="pl-3">
                                <p className="text-sm text-slate-200 leading-relaxed bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/30 shadow-inner italic">
                                    "{conflict.narrative_analysis}"
                                </p>

                                {/* Related Evidence Links */}
                                {relatedReports.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold self-center">Evidence:</span>
                                        {relatedReports.map((report: any, idx: number) => (
                                            <a
                                                key={idx}
                                                href={report.url || report.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded px-2 py-1 text-[10px] text-blue-400 transition-colors"
                                            >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                                {report.source || new URL(report.url || report.link).hostname.replace('www.', '')}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* 1. Summary */}
                <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <BookOpen className="w-3 h-3" /> Briefing
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        {analysis.summary}
                    </p>
                </section>

                {/* 2. Key Actors Grid */}
                {analysis.actors?.length > 0 && (
                    <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Users className="w-3 h-3" /> Key Actors
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {analysis.actors.map((actor, i) => (
                                <div key={i} className="bg-slate-800/30 p-2.5 rounded border border-slate-700/50 flex flex-col">
                                    <span className="text-xs font-bold text-slate-200">{actor.name}</span>
                                    <span className="text-[11px] text-slate-400 leading-snug mt-0.5">{actor.role}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 3. Significance & Background */}
                <section className="space-y-4">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Globe className="w-3 h-3" /> Strategic Context
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {analysis.background}
                        </p>
                    </div>
                </section>

                {/* 4. Timeline */}
                {analysis.timeline?.length > 0 && (
                    <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Timeline
                        </h4>
                        <div className="space-y-3 relative pl-2">
                            {/* Vertical Line */}
                            <div className="absolute left-[4.5px] top-1 bottom-1 w-px bg-slate-700"></div>

                            {analysis.timeline.map((item, i) => (
                                <div key={i} className="relative pl-4">
                                    <div className="absolute left-0 top-1.5 w-2.5 h-2.5 bg-slate-800 border-2 border-slate-600 rounded-full z-10"></div>
                                    <span className="text-[10px] font-mono text-blue-400 block mb-0.5">{item.date}</span>
                                    <p className="text-xs text-slate-300 leading-snug">{item.event}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 5. Facts & Unknowns */}
                <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-800">
                    <div>
                        <h5 className="text-[10px] text-green-400 font-bold uppercase mb-2">Verified Facts</h5>
                        <ul className="space-y-1">
                            {analysis.verified_facts?.map((fact, i) => (
                                <li key={i} className="text-[11px] text-slate-400 flex gap-2 items-start">
                                    <span className="mt-1 w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></span>
                                    {fact}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {analysis.unknowns?.length > 0 && (
                        <div>
                            <h5 className="text-[10px] text-amber-400 font-bold uppercase mb-2">Unknown / Unclear</h5>
                            <ul className="space-y-1">
                                {analysis.unknowns.map((fact, i) => (
                                    <li key={i} className="text-[11px] text-slate-400 flex gap-2 items-start">
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
