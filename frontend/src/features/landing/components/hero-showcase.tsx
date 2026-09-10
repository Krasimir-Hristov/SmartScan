'use client';

import React, { useState } from 'react';
import { triggerHaptic } from '@/lib/utils';
import {
  Wifi,
  Check,
  Copy,
  Send,
  Sparkles,
  Download,
  PhoneCall,
  Clock,
  Waves,
  QrCode,
  Languages,
} from 'lucide-react';

export interface HeroShowcaseProps {
  onOpenAuth: () => void;
  onOpenDemo: () => void;
}

export const HeroShowcase: React.FC<HeroShowcaseProps> = ({
  onOpenAuth,
  onOpenDemo,
}) => {
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'guest',
      text: 'How do I turn on the hot tub heater in the patio?',
      time: '19:42',
    },
    {
      sender: 'ai',
      text: 'The hot tub heater panel is behind the stone column next to the pool bar. Press the red power switch once and turn the dial to 38°C. It reaches full heat in ~15 mins! 🌿',
      time: '19:42',
    },
  ]);

  const handleCopyWifi = () => {
    triggerHaptic(60);
    try {
      navigator.clipboard.writeText('Sanctuary_5G_Guest_2026');
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2200);
    } catch {
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2200);
    }
  };

  const handleSendSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessage('');

    setChatHistory((prev) => [
      ...prev,
      { sender: 'guest', text: userText, time: 'Now' },
    ]);

    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Our villa AC remotes are mounted by each door. Best cooling setting is 22°C Auto. Feel free to ask about nearby tavernas or taxi dispatch anytime!',
          time: 'Now',
        },
      ]);
      triggerHaptic(40);
    }, 600);
  };

  return (
    <section id="showcase" className="py-8 md:py-14" aria-label="Interactive Showcase">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* LEFT CARD: Luxury Physical Acrylic Plaque */}
          <div className="flex flex-col justify-between rounded-3xl bg-zinc-950/80 border border-emerald-500/20 p-6 sm:p-8 shadow-2xl shadow-emerald-950/20 hover:border-emerald-500/40 transition-all">
            <div>
              {/* Header Label */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                  GUEST TOUCHPOINT · PHYSICAL PLAQUE
                </span>
                <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
                  Villa 1904 Sanctuary · Mykonos
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Physical Acrylic QR Stand
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Download high-res, print-ready templates (A5/A6 300+ DPI). Place on nightstands
                and kitchen islands for frictionless, instant guest scanning.
              </p>

              {/* Plaque Graphic Mockup */}
              <div className="relative rounded-2xl bg-zinc-900/90 border border-emerald-500/20 p-6 sm:p-8 text-center overflow-hidden">
                <div className="absolute inset-0 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6">
                  {/* High Tech QR Box */}
                  <div className="relative flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-950 border border-emerald-500/40 shadow-xl shadow-emerald-500/15">
                    <div className="w-32 h-32 relative flex items-center justify-center bg-zinc-900 rounded-xl p-2 border border-emerald-400/30">
                      {/* Stylized QR Matrix */}
                      <div className="grid grid-cols-6 gap-1 w-full h-full p-1 opacity-90">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div
                            key={i}
                            className={`rounded-xs ${
                              [0, 1, 2, 6, 8, 12, 13, 14, 20, 21, 22, 26, 27, 28, 30, 32, 35].includes(
                                i
                              )
                                ? 'bg-emerald-400'
                                : [3, 4, 7, 10, 17, 18, 23, 29, 31, 33, 34].includes(i)
                                ? 'bg-teal-300'
                                : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="p-1.5 rounded-lg bg-zinc-950 border border-emerald-400 shadow-md">
                          <QrCode className="w-5 h-5 text-emerald-400" />
                        </div>
                      </div>
                    </div>
                    <span className="mt-3 text-[11px] font-semibold text-emerald-300 tracking-wider uppercase">
                      Instant Camera Scan
                    </span>
                  </div>

                  {/* Plaque Metadata */}
                  <div className="flex flex-col text-left gap-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-semibold text-zinc-200">
                        No App Download Needed
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Guests open their phone camera and point. Opens instantly in Safari or Chrome in under 1 second.
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <Languages className="w-4 h-4" />
                      <span>Auto-detects 50+ Languages</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plaque Action */}
            <div className="mt-6 pt-6 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Includes Vector PDF + Bleed Marks</span>
              <button
                type="button"
                onClick={onOpenDemo}
                aria-label="Download Sample Print Plaque Template"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>View Sample Plaque</span>
              </button>
            </div>
          </div>

          {/* RIGHT CARD: Smartphone Guest Concierge PWA Mockup */}
          <div className="flex flex-col justify-between rounded-3xl bg-zinc-950/80 border border-emerald-500/20 p-6 sm:p-8 shadow-2xl shadow-emerald-950/20 hover:border-emerald-500/40 transition-all">
            <div>
              {/* Header Label */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                  GUEST SMARTPHONE APP · ZERO INSTALL
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Sub-second AI</span>
                </div>
              </div>

              {/* Smartphone Inner Frame */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-5 shadow-inner">
                {/* Villa Mini Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Villa 1904 Sanctuary</h4>
                      <p className="text-[11px] text-zinc-400">Digital Stay Concierge</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Online
                  </span>
                </div>

                {/* 1-Tap Quick Action Pills */}
                <div className="py-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyWifi}
                    aria-label="1-Tap Copy Wi-Fi Password"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Wi-Fi: Sanctuary_5G</span>
                    {copiedWifi ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>

                  <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Checkout 11:00</span>
                  </div>

                  <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                    <Waves className="w-3.5 h-3.5 text-teal-400" />
                    <span>Pool Rules</span>
                  </div>
                </div>

                {/* Interactive Simulated Chat Feed */}
                <div className="flex flex-col gap-3 py-2 max-h-52 overflow-y-auto pr-1">
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        msg.sender === 'guest' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs max-w-[85%] leading-relaxed ${
                          msg.sender === 'guest'
                            ? 'bg-zinc-800 text-zinc-100 rounded-br-xs'
                            : 'bg-emerald-950/80 text-emerald-100 border border-emerald-500/30 rounded-bl-xs'
                        }`}
                      >
                        {msg.sender === 'ai' && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                            <Sparkles className="w-3 h-3" />
                            <span>AI Concierge</span>
                          </div>
                        )}
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-0.5 px-1">{msg.time}</span>
                    </div>
                  ))}
                </div>

                {/* Simulated Chat Input Box */}
                <form onSubmit={handleSendSample} className="mt-3 relative flex items-center">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Try asking: Where are AC remotes?"
                    aria-label="Type a test question for the concierge"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700/80 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="submit"
                    aria-label="Send test question"
                    className="absolute right-1.5 p-1.5 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-6 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Live Web App · Instant Safari/Chrome</span>
              <button
                type="button"
                onClick={onOpenDemo}
                aria-label="Launch Full Guest PWA Experience"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                Launch Guest Preview →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
