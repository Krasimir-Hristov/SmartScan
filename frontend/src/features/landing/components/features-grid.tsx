'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Zap, Globe, MessageSquareWarning, ArrowUpRight, Phone } from 'lucide-react';

export const FeaturesGrid: React.FC = () => {
  return (
    <section className="py-16 md:py-24 bg-zinc-950/40 relative" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <Badge variant="emerald" className="mb-3 uppercase tracking-wider text-[11px]">
            PURPOSE-BUILT
          </Badge>
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
          >
            Engineered Exclusively for Luxury Vacation Rentals
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Every feature is calibrated to protect host peace of mind while creating a flawless 5-star guest experience.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Wide (2 cols) - Zero Knowledge Misdirection */}
          <div className="md:col-span-2 rounded-3xl bg-zinc-950/90 border border-emerald-500/20 p-7 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Precision Safety Guardrails
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Zero Knowledge Misdirection & Hallucination-Free RAG
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mb-6">
                Vector knowledge chunks with XML context isolation ensure the AI only answers with verified property facts. It never invents check-in codes, pool rules, or parking instructions.
              </p>

              {/* Guardrail Visual Simulation */}
              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 font-mono text-xs text-zinc-300">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 mb-2 border-b border-zinc-800">
                  <span>XML CONTEXT ENCLAVE</span>
                  <span className="text-emerald-400 font-semibold">100% VERIFIED TRUTH</span>
                </div>
                <div className="text-zinc-400">
                  <span className="text-emerald-400">&lt;property_context&gt;</span>
                  <p className="pl-4 text-zinc-200">
                    Host: &quot;Wi-Fi is Sanctuary_5G. Pool lights turn off at 23:00 automatically.&quot;
                  </p>
                  <span className="text-emerald-400">&lt;/property_context&gt;</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-zinc-500">
              Strict multi-tenant isolation with hard <code className="text-emerald-400">WHERE space_id</code> filters.
            </div>
          </div>

          {/* Card 2: Instant Speed (SSE) */}
          <div className="rounded-3xl bg-zinc-950/90 border border-emerald-500/20 p-7 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Zap className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Ultralow Latency
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Speed (SSE)</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Direct Server-Sent Events streaming delivers token answers in under 1.2s, feeling faster than typing to a human concierge.
              </p>

              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 text-center">
                <div className="text-3xl font-extrabold text-teal-400 mb-1">&lt; 1.2s</div>
                <div className="text-xs text-zinc-400">First Token Stream Velocity</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-zinc-500">
              Zero spinning wheels or stalled requests.
            </div>
          </div>

          {/* Card 3: Polished Polyglot (50+ Languages) */}
          <div className="rounded-3xl bg-zinc-950/90 border border-emerald-500/20 p-7 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Globe className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Universal Polyglot
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">50+ Native Languages</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                You write in English or Bulgarian; guests read and chat in German, French, Italian, Greek, Romanian, Hebrew, or Japanese seamlessly.
              </p>

              {/* Flags Pill Preview */}
              <div className="flex flex-wrap gap-2">
                {['🇬🇧 EN', '🇩🇪 DE', '🇫🇷 FR', '🇮🇹 IT', '🇪🇸 ES', '🇬🇷 EL', '🇧🇬 BG', '🇷🇴 RO'].map((fl) => (
                  <span
                    key={fl}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200"
                  >
                    {fl}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-zinc-500">
              Host input once ➔ Polyglot answers worldwide.
            </div>
          </div>

          {/* Card 4: Wide (2 cols) - Failsafe Escalation */}
          <div className="md:col-span-2 rounded-3xl bg-zinc-950/90 border border-emerald-500/20 p-7 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <MessageSquareWarning className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Human-in-the-Loop Backup
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Failsafe Escalation (Direct Host WhatsApp / Urgent Dispatch)
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mb-6">
                For water leaks, power outages, or special requests, 1-tap WhatsApp and phone escalation connects guests directly to your emergency contact. AI handles 86% of routine FAQs; you only step in when it truly matters.
              </p>

              {/* Simulated Escalation Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Host Status: Standby for Emergencies</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs border border-zinc-800">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Direct Emergency Dial</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/40">
                  <span>Direct WhatsApp Dispatch</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-zinc-500">
              Host phone & WhatsApp numbers stored securely in encrypted spaces metadata.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
