'use client';

import React from 'react';
import { Star } from 'lucide-react';
import type { TestimonialItem } from '../types/landing.types';

const reviews: TestimonialItem[] = [
  {
    quote:
      'Our guests from Germany and France rave about having instant answers in their own language. WhatsApp messages dropped from 20 a day to almost zero.',
    author: 'Elena M.',
    property: 'Luxury Cliffside Villa',
    location: 'Santorini, Greece',
    rating: 5,
  },
  {
    quote:
      'Setup took literally 3 minutes using voice notes. The acrylic QR stand looks like something from a 5-star boutique hotel nightstand.',
    author: 'Marco B.',
    property: 'Alpine Heritage Chalet',
    location: 'Lake Como, Italy',
    rating: 5,
  },
  {
    quote:
      'The Wi-Fi 1-tap copy button alone saved us dozens of late-night calls. Hands down the best €9 we spend each month on our hospitality business.',
    author: 'David K.',
    property: 'Superhost & Estate Manager',
    location: "Côte d'Azur, France",
    rating: 5,
  },
];

export const Testimonials: React.FC = () => {
  return (
    <section id="reviews" className="py-16 md:py-24 border-t border-zinc-900" aria-labelledby="reviews-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-1 text-emerald-400 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-emerald-400 text-emerald-400" />
            ))}
          </div>
          <h2
            id="reviews-heading"
            className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
          >
            Praise from Architectural Retreats
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Trusted by premium hosts and boutique operators across the Mediterranean and beyond.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.author}
              className="flex flex-col justify-between rounded-3xl bg-zinc-950/90 border border-zinc-800/80 p-7 shadow-xl hover:border-emerald-500/30 transition-all"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic mb-6">
                  &ldquo;{rev.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{rev.author}</h4>
                  <p className="text-xs text-zinc-400">{rev.property}</p>
                </div>
                <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {rev.location}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
