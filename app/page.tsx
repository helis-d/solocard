'use client';

import React, { useState, useEffect } from 'react';
import { CardProfile } from '@/lib/types';
import { CARD_THEMES, DEFAULT_PROFILE, getCardTheme } from '@/lib/constants';
import { Navbar } from '@/components/Navbar';
import { CardPreview } from '@/components/CardPreview';
import { CardStudio } from '@/components/CardStudio';
import { Dices, CheckCircle2, RotateCw, Layers, Download } from 'lucide-react';
import { downloadCardAsPng } from '@/lib/exportCard';

const STORAGE_KEY = 'solocard_user_profile_v4';
const LEGACY_STORAGE_KEY = 'solocard_user_profile_v3';

const encodeCardProfile = (value: CardProfile) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(value))));

export default function HomePage() {
  const [profile, setProfile] = useState<CardProfile>(DEFAULT_PROFILE);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBothSides, setShowBothSides] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSharedCard, setIsSharedCard] = useState(false);

  const mergeProfile = (parsed: Partial<CardProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...parsed,
      show: { ...prev.show, ...(parsed.show || {}) },
      links: { ...prev.links, ...(parsed.links || {}) },
      material: { ...prev.material, ...(parsed.material || {}) },
      typography: { ...prev.typography, ...(parsed.typography || {}) },
      status: { ...prev.status, ...(parsed.status || {}) },
      avatarConfig: { ...prev.avatarConfig, ...(parsed.avatarConfig || {}) },
      showcase: { ...prev.showcase, ...(parsed.showcase || {}) },
    }) as CardProfile);
  };

  // Shared cards are self-contained in the URL so recipients do not need an account or storage.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const sharedData = new URLSearchParams(window.location.search).get('card');
        if (sharedData) {
          const parsed = JSON.parse(decodeURIComponent(escape(atob(sharedData)))) as Partial<CardProfile>;
          mergeProfile(parsed);
          setIsSharedCard(true);
          return;
        }

        let saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) mergeProfile(JSON.parse(saved));
      } catch (e) {
        console.warn('Could not load card data:', e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      showToast('Card saved to browser! ✓');
    } catch (e) {
      showToast('Could not save (Storage full)');
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the card to default settings?')) {
      setProfile(DEFAULT_PROFILE);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      showToast('Card reset to default settings.');
    }
  };

  const handleShare = () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?card=${encodeCardProfile(profile)}`
      : '';
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => showToast('Card link copied to clipboard.'),
        () => showToast('Copy failed. Your link: ' + url)
      );
    } else {
      showToast('Your link: ' + url);
    }
  };

  // Quick Random Theme Dice Roll
  const handleRandomTheme = () => {
    const themeKeys = Object.keys(CARD_THEMES);
    const randomKey = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    setProfile((prev) => ({ ...prev, themeKey: randomKey }));
    const themeName = CARD_THEMES[randomKey]?.label || randomKey;
    showToast(`Theme: ${themeName}`);
  };

  const currentTheme = getCardTheme(profile.themeKey);

  if (isSharedCard) {
    return (
      <div className="min-h-screen bg-[#090b0d] text-neutral-100 flex flex-col font-sans">
        <header className="w-full border-b border-white/10 bg-[#090b0d]/85 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#c8ff3d] text-[#090b0d] flex items-center justify-center font-black tracking-tighter shadow-[0_0_24px_rgba(200,255,61,0.2)]">SC</div>
              <span className="font-black text-base tracking-tight">SoloCard</span>
            </div>
            <a href={window.location.pathname} className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">Create your own</a>
          </div>
        </header>
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center">
          <div className="w-full text-center mb-8">
            <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#c8ff3d]">Digital identity</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-[-0.03em] text-white">{profile.name || 'A SoloCard profile'}</h1>
            <p className="mt-2 text-sm text-neutral-400">Tap or use the controls to view both sides.</p>
          </div>
          <CardPreview
            profile={profile}
            isFlipped={isFlipped}
            onFlipToggle={() => setIsFlipped((prev) => !prev)}
            showFlipControls={true}
            enableTilt={true}
            cardIdPrefix="shared-card"
            className="w-full"
          />
        </main>
        <footer className="border-t border-neutral-900 bg-neutral-950/90 py-5 px-4 text-center text-xs text-neutral-500">SoloCard — Your identity, in one sharp card.</footer>
      </div>
    );
  }

  // Quick theme keys for top strip
  const quickThemeKeys = [
    'shawn_chen',
    'splines',
    'farrel',
    'patrik',
    'loewe',
    'banhua',
    'halftone',
    'halftone-ink',
    'wave',
    'sparkle',
    'sparkle-gold',
    'ascii',
  ];

  return (
    <div className="min-h-screen bg-[#090b0d] text-neutral-100 flex flex-col font-sans">
      {/* Top Minimal Navigation */}
      <Navbar
        currentTheme={currentTheme}
        isFlipped={isFlipped}
        showBothSides={showBothSides}
        onFlipToggle={() => setIsFlipped((prev) => !prev)}
        onBothSidesToggle={() => setShowBothSides((prev) => !prev)}
        onSave={handleSave}
        onShare={handleShare}
      />

      {/* Main Content: Card Centered Stage + Customization Studio */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center gap-8 transition-all duration-300 ${
          showBothSides ? 'max-w-6xl' : 'max-w-5xl'
        }`}
      >
        {/* ============================================================
            HERO CARD STAGE (The spotlight of the page)
            ============================================================ */}
        <section className="w-full flex flex-col items-center gap-5" id="card-hero-section">
          <div className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#c8ff3d]">Your identity, sharpened</p>
              <h1 className="mt-2 max-w-2xl text-3xl sm:text-5xl font-black tracking-[-0.04em] text-white">Your identity. One sharp card.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">Design a digital card that tells your story, preview it live, and share it with one link.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 shrink-0">
              <span className="size-2 rounded-full bg-[#c8ff3d] shadow-[0_0_12px_#c8ff3d]" />
              Live preview
            </div>
          </div>
          {showBothSides ? (
            /* Dual Side-by-Side View (Completely separated cards) */
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start justify-items-center">
              {/* Front Card Column */}
              <div className="w-full flex flex-col items-center space-y-3 p-4 sm:p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 shadow-lg">
                <div className="flex items-center justify-between w-full max-w-[500px] px-1 pb-1 border-b border-neutral-800/60">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-300 font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                    Front Face
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCardAsPng(
                        'dual-front-face-front',
                        `${profile.username || 'solocard'}-front.png`
                      )
                    }
                    className="flex items-center gap-1 text-[11px] font-medium text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg border border-neutral-700/80 bg-neutral-950 hover:bg-neutral-800 transition-all shadow-sm"
                    title="Export front face as PNG"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>Export PNG</span>
                  </button>
                </div>
                <CardPreview
                  profile={profile}
                  isFlipped={false}
                  showFlipControls={false}
                  enableTilt={true}
                  cardIdPrefix="dual-front"
                  className="w-full"
                />
              </div>

              {/* Back Card Column */}
              <div className="w-full flex flex-col items-center space-y-3 p-4 sm:p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 shadow-lg">
                <div className="flex items-center justify-between w-full max-w-[500px] px-1 pb-1 border-b border-neutral-800/60">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-300 font-bold flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-violet-400" />
                    Back Face
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCardAsPng(
                        'dual-back-face-back',
                        `${profile.username || 'solocard'}-back.png`
                      )
                    }
                    className="flex items-center gap-1 text-[11px] font-medium text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg border border-neutral-700/80 bg-neutral-950 hover:bg-neutral-800 transition-all shadow-sm"
                    title="Export back face as PNG"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>Export PNG</span>
                  </button>
                </div>
                <CardPreview
                  profile={profile}
                  isFlipped={true}
                  showFlipControls={false}
                  enableTilt={true}
                  cardIdPrefix="dual-back"
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            /* Single Hero 3D Card */
            <div className="w-full flex flex-col items-center">
              <CardPreview
                profile={profile}
                isFlipped={isFlipped}
                onFlipToggle={() => setIsFlipped((prev) => !prev)}
                showFlipControls={true}
                enableTilt={true}
                className="w-full"
              />
            </div>
          )}

          {/* Quick theme swatches & random roll bar right under the card */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-xl px-2">
            <button
              type="button"
              id="hero-random-theme-btn"
              onClick={handleRandomTheme}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Pick a random shader theme"
            >
              <Dices className="w-4 h-4 text-violet-400" />
              <span>Random Theme</span>
            </button>

            {/* Quick Circular Swatches */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-900/80 border border-neutral-800/80 overflow-x-auto max-w-full scrollbar-none">
              {quickThemeKeys.map((key) => {
                const th = CARD_THEMES[key];
                if (!th) return null;
                const isSelected = profile.themeKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProfile((prev) => ({ ...prev, themeKey: key }))}
                    title={th.label}
                    className={`w-6 h-6 rounded-full transition-all border ${
                      isSelected
                        ? 'ring-2 ring-violet-500 scale-110 border-white shadow-md'
                        : 'border-white/20 opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${th.swatchColors[0]}, ${th.swatchColors[1]})`,
                    }}
                    aria-label={`Use ${th.label} theme`}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================
            CUSTOMIZATION STUDIO (Clean 4-tab streamlined interface)
            ============================================================ */}
        <section className="w-full" id="card-studio-section">
          <CardStudio
            profile={profile}
            onChange={setProfile}
            onReset={handleReset}
            onSave={handleSave}
          />
        </section>
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-950 font-semibold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-neutral-300 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950/90 py-5 px-4 text-center text-xs text-neutral-500">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <span>SoloCard — Your identity, in one sharp card.</span>
          <a
            href="https://openshaders.com/explore"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-300 transition-colors"
          >
            Local-first privacy
          </a>
        </div>
      </footer>
    </div>
  );
}
