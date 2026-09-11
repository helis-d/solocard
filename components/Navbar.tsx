'use client';

import React from 'react';
import { Sparkles, RotateCw, Share2, Save, Layers } from 'lucide-react';
import { CardTheme } from '@/lib/types';

interface NavbarProps {
  currentTheme?: CardTheme;
  isFlipped: boolean;
  showBothSides: boolean;
  onFlipToggle: () => void;
  onBothSidesToggle: () => void;
  onSave: () => void;
  onShare: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTheme,
  isFlipped,
  showBothSides,
  onFlipToggle,
  onBothSidesToggle,
  onSave,
  onShare,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-violet-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-neutral-100">
              SoloCard
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              WebGPU
            </span>
          </div>
        </div>

        {/* Current Active Theme Pill */}
        {currentTheme && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-300">
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.swatchColors[0]}, ${currentTheme.swatchColors[1]})`,
              }}
            />
            <span className="font-medium text-neutral-200">{currentTheme.label}</span>
            {currentTheme.rarityRate && (
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                {currentTheme.rarityRate}
              </span>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="nav-dual-toggle-btn"
            onClick={onBothSidesToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              showBothSides
                ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
            }`}
            title="Toggle dual front and back view side-by-side"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dual View</span>
          </button>

          <button
            type="button"
            id="nav-flip-btn"
            onClick={onFlipToggle}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Flip card"
          >
            <RotateCw className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">{isFlipped ? 'Front' : 'Back'}</span>
          </button>

          <button
            type="button"
            id="nav-save-btn"
            onClick={onSave}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save</span>
          </button>

          <button
            type="button"
            id="nav-share-btn"
            onClick={onShare}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/20 transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </header>
  );
};
