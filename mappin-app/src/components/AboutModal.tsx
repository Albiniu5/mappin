import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, Globe, Shield, Activity, Users, Database, Eye, Share2, Layers, Radio, Brain, AlertTriangle, FileText } from 'lucide-react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
    isAlienMode?: boolean;
}

export function AboutModal({ isOpen, onClose, isAlienMode = false }: AboutModalProps) {
    const [activeSection, setActiveSection] = useState<string | null>('mission');

    if (!isOpen) return null;

    // --- STANDARD SECTIONS ---
    const standardSections = [
        {
            id: 'mission',
            title: 'Mission & Purpose',
            icon: <Globe className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        In an era of information overload and fragmented reporting, understanding global stability is a challenge.
                        <strong> Mappin</strong> exists to provide a clear, unbiased, and real-time visualization of global conflicts, protests, and political unrest.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">The Problem We Solve</h4>
                        <ul className="list-disc pl-4 space-y-1 text-sm text-blue-800/80 dark:text-blue-200/70">
                            <li>Fragmentation of news across thousands of local sources.</li>
                            <li>Difficulty in visualizing the geographic spread of unrest.</li>
                            <li>Lack of real-time situational awareness for researchers and citizens.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 'how-it-works',
            title: 'How It Works',
            icon: <Layers className="w-4 h-4" />,
            content: (
                <div className="space-y-6">
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-700 pl-6 py-2 space-y-8">
                        <div className="relative">
                            <span className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900"></span>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">1. Global Collection</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                We aggregate data from over 50 trusted international RSS feeds (Reuters, AP, Al Jazeera, TASS, Local Sources) covering 6 continents.
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900"></span>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">2. AI Analysis & "The Judge"</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Every article is analyzed by our AI engine. It extracts location data, categorizes the event (e.g., "Armed Conflict" vs "Protest"), and assigns a severity score (1-5). Events deemed irrelevant are filtered out.
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[33px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">3. Visualization</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Verified events are plotted on the interactive map. Clusters form dynamically to show hotspots, and timelines allow you to replay history.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'data-access',
            title: 'Data You Can Access',
            icon: <Database className="w-4 h-4" />,
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Live Insights</h4>
                        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-2">
                            <li>• Real-time event markers</li>
                            <li>• Severity ratings (1-5)</li>
                            <li>• Original source links</li>
                            <li>• Conflict categories</li>
                        </ul>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Historical Data</h4>
                        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-2">
                            <li>• 30-day timeline playback</li>
                            <li>• Trend identification</li>
                            <li>• Regional filtering</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 'faq',
            title: 'FAQ',
            icon: <Users className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer font-medium text-slate-700 dark:text-slate-300 hover:text-blue-500">
                            Is this data 100% accurate?
                            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            We rely on reputable public news sources. While we strive for accuracy, we reflect the reporting of those organizations. Always check the original source link provided.
                        </p>
                    </details>
                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer font-medium text-slate-700 dark:text-slate-300 hover:text-blue-500">
                            Where do you get your articles?
                            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            We aggregate from diverse global sources including AP, Reuters, BBC, Al Jazeera, TASS, and regional outlets in South America, Africa, and Asia to ensure balanced coverage.
                        </p>
                    </details>
                    <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer font-medium text-slate-700 dark:text-slate-300 hover:text-blue-500">
                            Do you track my location?
                            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            No. We prioritize privacy. Your map interactions are local to your session. We do not store personal tracking data.
                        </p>
                    </details>
                </div>
            )
        },
        {
            id: 'methodology',
            title: 'Transparency & Methodology',
            icon: <Eye className="w-4 h-4" />,
            content: (
                <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    <p>
                        Mappin uses <strong>Google's Gemini AI</strong> to parse unstructured news text.
                        The processing pipeline typically follows these steps:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li><strong>Ingestion:</strong> RSS inputs are fetched every 5-15 minutes.</li>
                        <li><strong>Filtering:</strong> "The Judge" (our AI filter) discards non-conflict news (e.g., sports, celebrity gossip).</li>
                        <li><strong>Geocoding:</strong> The AI infers coordinates based on city/region names in the text.</li>
                        <li><strong>Classification:</strong> Events are tagged (e.g., Political Unrest) based on keywords.</li>
                    </ol>
                    <p className="italic text-xs text-slate-400 mt-2">
                        *Disclaimer: AI geocoding may occasionally place country-wide events at the capital city's coordinates.
                    </p>
                </div>
            )
        },
        {
            id: 'cases',
            title: 'User Benefits',
            icon: <Activity className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded text-center">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">Journalists</div>
                            <div className="text-xs text-slate-500 mt-1">Spot trending hotspots instantly</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded text-center">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">Researchers</div>
                            <div className="text-xs text-slate-500 mt-1">Analyze conflict timelines</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded text-center">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">Citizens</div>
                            <div className="text-xs text-slate-500 mt-1">Bypass biased algorithms</div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'community',
            title: 'Community & Feedback',
            icon: <Share2 className="w-4 h-4" />,
            content: (
                <div className="text-center space-y-4 py-4">
                    <p className="text-slate-600 dark:text-slate-300">
                        We are constantly improving. Spotted an error? Have a feature request?
                    </p>
                    <a href="#" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-full transition-colors">
                        Contact Support
                    </a>
                </div>
            )
        },
        {
            id: 'legal',
            title: 'Legal',
            icon: <Shield className="w-4 h-4" />,
            content: (
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                    <p>© 2026 Mappin. All rights reserved.</p>
                    <p>
                        This application aggregates public RSS feeds for informational purposes.
                        The content remains the property of the respective publishers.
                        We are not responsible for the accuracy of 3rd party reporting.
                    </p>
                    <div className="flex gap-4 mt-4 text-blue-500">
                        <a href="#" className="hover:underline">Privacy Policy</a>
                        <a href="#" className="hover:underline">Terms of Service</a>
                    </div>
                </div>
            )
        }
    ];

    // --- ALIEN SECTIONS ---
    const alienSections = [
        {
            id: 'mission',
            title: 'Disclosure Protocol',
            icon: <Radio className="w-4 h-4 text-green-400" />,
            content: (
                <div className="space-y-4 font-mono">
                    <p className="text-green-300 leading-relaxed">
                        Conventional news filters out anomalies. We do not.
                        <strong> Mappin Alien Lens</strong> aggregates global reports of UAP sightings, abductions, and unexplained phenomena that mainstream media ignores.
                    </p>
                    <div className="bg-black/80 p-4 rounded-none border border-green-800">
                        <h4 className="font-bold text-green-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> The Truth Gap
                        </h4>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-green-600">
                            <li>Thousands of sightings are buried in local blogs and forums.</li>
                            <li>Official channels deny or ridicule credible witness testimony.</li>
                            <li>Pattern recognition is impossible without centralized data.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 'metrics',
            title: 'AI Credibility Scoring',
            icon: <Brain className="w-4 h-4 text-green-400" />,
            content: (
                <div className="space-y-6 font-mono">
                    <p className="text-sm text-green-300/80">
                        Every report undergoes rigorous analysis by our <strong className="text-green-400">Gemini AI Investigator</strong>.
                        We generate a 0-100% Credibility Score based on 4 key vectors:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Witness */}
                        <div className="bg-green-900/10 border border-green-800/50 p-3">
                            <div className="text-[10px] text-green-500 uppercase font-bold mb-1">1. Witness Reliability</div>
                            <div className="text-xs text-green-200">
                                <span className="text-green-400">Civilian</span> vs <span className="text-green-400">Pilot/Police</span>.
                                <br />Multi-witness events score higher.
                            </div>
                        </div>
                        {/* Evidence */}
                        <div className="bg-green-900/10 border border-green-800/50 p-3">
                            <div className="text-[10px] text-green-500 uppercase font-bold mb-1">2. Hard Evidence</div>
                            <div className="text-xs text-green-200">
                                <span className="text-green-400">Visual Only</span> vs <span className="text-green-400">Radar/Video</span>.
                                <br />Sensor confirmation boosts score significantly.
                            </div>
                        </div>
                        {/* Source */}
                        <div className="bg-green-900/10 border border-green-800/50 p-3">
                            <div className="text-[10px] text-green-500 uppercase font-bold mb-1">3. Source Quality</div>
                            <div className="text-xs text-green-200">
                                Tabloid blogs score lower than reputable research organizations (MUFON, etc.) or declassified docs.
                            </div>
                        </div>
                        {/* History */}
                        <div className="bg-green-900/10 border border-green-800/50 p-3">
                            <div className="text-[10px] text-green-500 uppercase font-bold mb-1">4. Historical Match</div>
                            <div className="text-xs text-green-200">
                                AI checks for similar vector/shape sightings within 50km in the last 10 years.
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/60 p-3 border border-green-500/30 flex items-center justify-between">
                        <span className="text-xs text-green-600 uppercase">Example Score</span>
                        <div className="w-32 h-2 bg-green-900/50 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-[87%] shadow-[0_0_10px_#22c55e]"></div>
                        </div>
                        <span className="font-bold text-green-400 text-sm">87%</span>
                    </div>
                </div>
            )
        },
        {
            id: 'hynek',
            title: 'Classification (Hynek)',
            icon: <FileText className="w-4 h-4 text-green-400" />,
            content: (
                <div className="space-y-4 font-mono text-sm text-green-300/90">
                    <p>
                        We utilize the standard <strong>Hynek Scale</strong> for event classification:
                    </p>
                    <ul className="space-y-2 border-l border-green-800 pl-4">
                        <li><span className="text-green-400 font-bold">NL (Nocturnal Light):</span> Distant flight, irregular movement.</li>
                        <li><span className="text-green-400 font-bold">DD (Daylight Disc):</span> Metallic object seen in day.</li>
                        <li><span className="text-green-400 font-bold">CE-1 (Close Encounter 1):</span> Object near, but no interaction.</li>
                        <li><span className="text-green-400 font-bold">CE-2 (Close Encounter 2):</span> Physical effect (burned ground, stalled car).</li>
                        <li><span className="text-green-400 font-bold">CE-3 (Close Encounter 3):</span> Entities observed.</li>
                        <li><span className="text-green-400 font-bold">CE-4 (Abduction):</span> Witness taken against will.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'legal-alien',
            title: 'Disclaimer',
            icon: <Shield className="w-4 h-4 text-green-400" />,
            content: (
                <div className="text-xs text-green-600/70 font-mono space-y-2">
                    <p>WARNING: RESTRICTED ACCESS.</p>
                    <p>
                        The data presented in the Alien Lens acts as an aggregation of unverified public reports.
                        Mappin does not claim proof of extraterrestrial life. We provide the tools; you decide the truth.
                    </p>
                </div>
            )
        }
    ];

    const sections = isAlienMode ? alienSections : standardSections;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-4xl max-h-[85vh] flex overflow-hidden flex-col md:flex-row shadow-2xl transition-all duration-500 ${isAlienMode
                    ? 'bg-black border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.2)] rounded-none'
                    : 'bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800'
                    }`}
            >

                {/* Sidebar Navigation */}
                <div className={`w-full md:w-64 border-r p-4 flex flex-col overflow-y-auto max-h-[200px] md:max-h-full ${isAlienMode
                    ? 'bg-black/90 border-green-900'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                    }`}>
                    <div className="mb-6 px-2">
                        <h2 className={`text-xl font-bold bg-clip-text text-transparent ${isAlienMode
                            ? 'bg-green-500 font-mono tracking-widest uppercase drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                            }`}>
                            {isAlienMode ? 'TERMINAL' : 'Mappin'}
                        </h2>
                        <p className={`text-xs font-medium ${isAlienMode ? 'text-green-700 font-mono uppercase' : 'text-slate-500 dark:text-slate-400'}`}>
                            {isAlienMode ? 'v1.0.27 [UNCLASSIFIED]' : 'Global Conflict Tracker v1.0.27'}
                        </p>
                    </div>

                    <nav className="space-y-1">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${isAlienMode
                                    ? activeSection === section.id
                                        ? 'bg-green-900/30 text-green-400 border-l-2 border-green-500 font-mono font-bold uppercase'
                                        : 'text-green-800 hover:text-green-500 font-mono uppercase'
                                    : activeSection === section.id
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium'
                                    }`}
                            >
                                {section.icon}
                                {section.title}
                                {activeSection === section.id && <ChevronRight className={`w-3 h-3 ml-auto opacity-50 ${isAlienMode ? 'text-green-500' : ''}`} />}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
                <div className={`flex-1 flex flex-col min-w-0 relative ${isAlienMode ? 'bg-black bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")]' : 'bg-white dark:bg-slate-950'}`}>
                    {/* Scanline for Alien Mode */}
                    {isAlienMode && <div className="absolute inset-0 bg-green-900/5 pointer-events-none animate-scanline z-0"></div>}

                    <button
                        onClick={onClose}
                        className={`absolute top-4 right-4 p-2 transition-colors z-10 ${isAlienMode
                            ? 'text-green-700 hover:text-green-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 z-10 relative">
                        {sections.map((section) => (
                            <div key={section.id} id={section.id} className={activeSection === section.id ? 'block animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`p-2 rounded-lg ${isAlienMode
                                        ? 'bg-green-900/20 text-green-500 border border-green-500/30'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        }`}>
                                        {section.icon}
                                    </div>
                                    <h2 className={`text-2xl font-bold ${isAlienMode
                                        ? 'text-green-500 font-mono tracking-wider uppercase drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                                        : 'text-slate-800 dark:text-slate-100'
                                        }`}>
                                        {section.title}
                                    </h2>
                                </div>
                                {section.content}
                            </div>
                        ))}
                    </div>

                    <div className={`p-4 md:hidden flex justify-center border-t ${isAlienMode ? 'border-green-900 bg-black' : 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50'}`}>
                        <button onClick={onClose} className={`text-sm font-medium ${isAlienMode ? 'text-green-600' : 'text-slate-600 dark:text-slate-400'}`}>Close</button>
                    </div>
                </div>

            </div>
        </div>
    );
}
