'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CardProfile } from '@/lib/types';
import { CARD_THEMES, STATUS_PRESETS } from '@/lib/constants';
import { ShaderCanvas } from './ShaderCanvas';
import {
  Globe,
  Github,
  Twitter,
  Linkedin,
  Gamepad2,
  RotateCw,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Layers,
  Clock,
  Briefcase,
  Terminal,
  Download,
  Mail,
} from 'lucide-react';
import { downloadCardAsPng, downloadVCard } from '@/lib/exportCard';

interface CardPreviewProps {
  profile: CardProfile;
  isFlipped?: boolean;
  onFlipToggle?: () => void;
  className?: string;
  enableTilt?: boolean;
  showFlipControls?: boolean;
  cardIdPrefix?: string;
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  profile,
  isFlipped: controlledFlipped,
  onFlipToggle,
  className = '',
  enableTilt = true,
  showFlipControls = true,
  cardIdPrefix = 'solocard',
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50 });
  const [currentTime, setCurrentTime] = useState('');
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFlip = () => {
    if (onFlipToggle) {
      onFlipToggle();
    } else {
      setInternalFlipped((prev) => !prev);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: -y * 11,
      ry: x * 13,
      mx: (x + 0.5) * 100,
      my: (y + 0.5) * 100,
    });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50 });
  };

  const theme = CARD_THEMES[profile.themeKey] || CARD_THEMES['shawn_chen'] || CARD_THEMES['halftone'];
  const show = profile.show;
  const material = profile.material || {
    finish: 'holographic',
    shimmerIntensity: 65,
    glassBlur: 14,
    borderRadius: 'rounded-2xl',
  };
  const typography = profile.typography || {
    fontFamily: 'sans',
    layoutPreset: 'balanced',
  };
  const status = profile.status || {
    status: 'available',
    customText: 'Available for Projects',
    showClock: true,
    cityLabel: 'San Francisco',
  };
  const avatarConfig = profile.avatarConfig || {
    type: 'monogram',
    shape: 'squircle',
    glowRing: true,
  };
  const showcase = profile.showcase || {};

  const activeSkills = profile.skills || [];
  const activeBadges = profile.badges || [];

  // Typography font class
  const fontClass =
    typography.fontFamily === 'mono'
      ? 'font-mono'
      : typography.fontFamily === 'serif'
      ? 'font-serif'
      : typography.fontFamily === 'cyber'
      ? 'font-mono uppercase tracking-wider'
      : 'font-sans';

  // Avatar shape class
  const avatarShapeClass =
    avatarConfig.shape === 'circle'
      ? 'rounded-full'
      : avatarConfig.shape === 'squircle'
      ? 'rounded-2xl'
      : avatarConfig.shape === 'cyber'
      ? 'rounded-none border-2'
      : 'rounded-xl';

  // Corner radius class for the outer card
  const cardRadiusClass = material.borderRadius || 'rounded-2xl';

  // Social links check
  const links = [
    { key: 'website', label: 'Website', url: profile.links.website, icon: Globe },
    { key: 'github', label: 'GitHub', url: profile.links.github, icon: Github },
    { key: 'x', label: 'X', url: profile.links.x, icon: Twitter },
    { key: 'discord', label: 'Discord', url: profile.links.discord, icon: Gamepad2 },
    { key: 'linkedin', label: 'LinkedIn', url: profile.links.linkedin, icon: Linkedin },
    { key: 'steam', label: 'Steam', url: profile.links.steam, icon: Gamepad2 },
  ].filter((l) => Boolean(l.url && l.url.trim()));

  // Active status preset
  const statusPreset = STATUS_PRESETS.find((s) => s.id === status.status) || STATUS_PRESETS[0];

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      {/* Front / Back switch & quick action controls */}
      {showFlipControls && (
        <div className="flex items-center justify-between w-full max-w-[520px] mb-3 px-1 no-export">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 backdrop-blur-md rounded-xl border border-neutral-800 shadow-sm">
            <button
              type="button"
              id={`${cardIdPrefix}-face-front-btn`}
              onClick={() => isFlipped && handleFlip()}
              aria-pressed={!isFlipped}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                !isFlipped
                  ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Front</span>
            </button>
            <button
              type="button"
              id={`${cardIdPrefix}-face-back-btn`}
              onClick={() => !isFlipped && handleFlip()}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                isFlipped
                  ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id={`${cardIdPrefix}-export-png-btn`}
              onClick={(e) => {
                e.stopPropagation();
                downloadCardAsPng(
                  isFlipped ? `${cardIdPrefix}-face-back` : `${cardIdPrefix}-face-front`,
                  `${profile.username || 'solocard'}-${isFlipped ? 'back' : 'front'}.png`
                );
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 transition-all shadow-sm"
              title="Save as PNG image"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export PNG</span>
            </button>

            <button
              type="button"
              id={`${cardIdPrefix}-quick-flip-btn`}
              onClick={handleFlip}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 transition-all shadow-sm"
              title="Flip card"
            >
              <RotateCw className="w-3.5 h-3.5 text-violet-400" />
              <span>Flip</span>
            </button>
          </div>
        </div>
      )}

      {/* 3D Perspective Card Stage */}
      <div
        ref={cardRef}
        id={`${cardIdPrefix}-perspective-stage`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`w-full max-w-[520px] aspect-[1.58/1] min-h-[300px] sm:min-h-[330px] relative cursor-pointer group ${fontClass}`}
        style={{
          perspective: '1400px',
        }}
        onClick={handleFlip}
      >
        {/* Atmospheric ambient glow behind the card */}
        <div
          className={`absolute -inset-2.5 sm:-inset-3 ${cardRadiusClass} blur-xl opacity-35 transition-all duration-700 pointer-events-none group-hover:opacity-55`}
          style={{
            background: `radial-gradient(circle, ${theme.glowColor} 0%, transparent 70%)`,
          }}
        />

        {/* Inner flippable box */}
        <div
          className="w-full h-full relative transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tilt.rx}deg) rotateY(${isFlipped ? tilt.ry + 180 : tilt.ry}deg)`,
          }}
        >
          {/* ============================================================
              FRONT FACE
              ============================================================ */}
          <div
            id={`${cardIdPrefix}-face-front`}
            className={`absolute inset-0 w-full h-full ${cardRadiusClass} p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xl border transition-all duration-300`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background:
                material.finish === 'glass'
                  ? 'rgba(15, 15, 20, 0.72)'
                  : material.finish === 'matte'
                  ? '#09090b'
                  : theme.cardBg,
              backdropFilter:
                material.finish === 'glass' ? `blur(${material.glassBlur || 14}px)` : undefined,
              borderColor: theme.borderColor,
              color: theme.textColor,
              boxShadow:
                material.finish === 'matte'
                  ? '0 10px 30px rgba(0,0,0,0.8)'
                  : `0 20px 50px -10px ${theme.glowColor}, 0 4px 14px rgba(0,0,0,0.4)`,
            }}
          >
            {/* Dynamic WebGPU / 2D Shader Canvas */}
            <ShaderCanvas
              id={`${cardIdPrefix}-shader-canvas-front`}
              themeKey={profile.themeKey}
              mousePos={{ x: tilt.mx / 100 - 0.5, y: tilt.my / 100 - 0.5 }}
            />

            {/* Material Finish 1: Holographic Foil Shimmer */}
            {material.finish === 'holographic' && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300"
                style={{
                  opacity: (material.shimmerIntensity || 65) / 100,
                  background: `linear-gradient(${
                    tilt.mx * 2 + tilt.my
                  }deg, rgba(255,0,128,0.2) 0%, rgba(0,255,255,0.25) 25%, rgba(255,255,0,0.2) 50%, rgba(138,43,226,0.3) 75%, rgba(0,255,128,0.2) 100%)`,
                }}
              />
            )}

            {/* Material Finish 2: Metallic Chrome Reflection */}
            {material.finish === 'metallic' && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-40 transition-all duration-200"
                style={{
                  background: `linear-gradient(${
                    tilt.mx * 1.5 + 45
                  }deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)`,
                }}
              />
            )}

            {/* Subtle specular glare (except in matte) */}
            {material.finish !== 'matte' && (
              <div
                className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
                }}
              />
            )}

            {/* Front Header: Status, Live Time & Chip */}
            <div className="relative z-10 flex items-center justify-between">
              {/* Left Header: Status Pill or Accent Jewel */}
              {show.showStatusOnFront && status.status !== 'none' ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-medium tracking-tight text-white/90 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusPreset.color}`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${statusPreset.color}`}
                    />
                  </span>
                  <span className={statusPreset.text}>
                    {status.customText || statusPreset.label}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-xs"
                    style={{ backgroundColor: theme.accentColor }}
                  />
                  {theme.label && (
                    <span className="text-[10px] uppercase font-mono tracking-widest text-white/50">
                      {theme.label}
                    </span>
                  )}
                </div>
              )}

              {/* Right Header: Live Clock & Year */}
              <div className="flex items-center gap-2">
                {show.showClockOnFront && status.showClock && currentTime && (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/85">
                    <Clock className="w-2.5 h-2.5 opacity-75" />
                    <span>{currentTime}</span>
                    {status.cityLabel && (
                      <span className="opacity-60 hidden sm:inline">• {status.cityLabel}</span>
                    )}
                  </span>
                )}

                {show.year && profile.year && (
                  <span className="text-[11px] font-mono text-white/70 font-semibold tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                    {profile.year}
                  </span>
                )}
              </div>
            </div>

            {/* Front Body: Avatar, Name, Role & Badges */}
            <div className="relative z-10 my-auto py-1">
              <div className="flex items-center gap-4">
                {/* Avatar with Glow & Refined Shape */}
                <div
                  className={`relative w-15 h-15 sm:w-16 sm:h-16 ${avatarShapeClass} overflow-hidden flex-shrink-0 border flex items-center justify-center font-bold text-xl sm:text-2xl transition-all shadow-md`}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    borderColor: theme.borderColor,
                    color: theme.textColor,
                    boxShadow: avatarConfig.glowRing ? `0 0 20px ${theme.glowColor}` : '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {avatarConfig.type === 'image' && profile.avatar && profile.avatar.trim() ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : avatarConfig.type === 'pixel' ? (
                    <div className="grid grid-cols-4 gap-0.5 w-8 h-8 opacity-85">
                      {[1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1].map((p, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5"
                          style={{
                            backgroundColor: p ? theme.accentColor : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  ) : avatarConfig.type === 'geometric' ? (
                    <div className="w-8 h-8 relative flex items-center justify-center">
                      <div
                        className="w-6 h-6 border-2 rotate-45"
                        style={{ borderColor: theme.accentColor }}
                      />
                      <div
                        className="absolute w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.textColor }}
                      />
                    </div>
                  ) : (
                    /* Monogram */
                    <span className="tracking-tight font-black drop-shadow-sm">
                      {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'SC'}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight truncate leading-tight text-white drop-shadow-sm">
                      {profile.name || 'Anonymous'}
                    </h1>
                    {typography.layoutPreset === 'developer' && (
                      <Terminal className="w-4 h-4 text-emerald-400 shrink-0 opacity-80" />
                    )}
                  </div>
                  {profile.role && (
                    <p className="text-xs sm:text-sm font-medium opacity-85 truncate mt-0.5 text-neutral-200">
                      {profile.role}
                    </p>
                  )}

                  {/* Badges: Clean Curated Pill Chips (max 3 on front to preserve layout) */}
                  {show.badges && activeBadges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {activeBadges.slice(0, 3).map((badge, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border shadow-xs backdrop-blur-xs"
                          style={{
                            backgroundColor: theme.chipBg,
                            borderColor: theme.borderColor,
                            color: theme.textColor,
                          }}
                        >
                          <CheckCircle2
                            className="w-3 h-3 flex-shrink-0"
                            style={{ color: theme.accentColor }}
                          />
                          <span>{badge}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Skills on front - rendered ONLY if explicitly toggled on */}
              {show.skills && show.showSkillsOnFront && activeSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-white/10">
                  {activeSkills.slice(0, 4).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-md text-[10.5px] font-medium border shadow-xs backdrop-blur-xs"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderColor: theme.borderColor,
                        color: theme.textColor,
                      }}
                    >
                      {typography.layoutPreset === 'developer' ? `$ ${skill}` : skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Front Footer: Clean Identity & Discreet Website / Flip hint */}
            <div className="relative z-10 flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
              <div className="flex items-center gap-3 text-[11.5px] opacity-85 font-medium">
                {show.username && profile.username && (
                  <span className="font-semibold tracking-tight text-white/95">@{profile.username}</span>
                )}
                {show.location && profile.location && (
                  <span className="flex items-center gap-1 text-white/80">
                    <MapPin className="w-3 h-3 opacity-70" />
                    {profile.location}
                  </span>
                )}
              </div>

              {/* Quick Links or Clean Website Badge */}
              <div className="flex items-center gap-2">
                {show.links && show.showLinksOnFront && links.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    {links.slice(0, 3).map((l) => {
                      const Icon = l.icon;
                      return (
                        <a
                          key={l.key}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-white/90"
                          title={l.label}
                        >
                          <Icon className="w-3 h-3" />
                        </a>
                      );
                    })}
                  </div>
                ) : profile.links.website ? (
                  <a
                    href={profile.links.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[10.5px] text-white/85 font-mono transition-all"
                    title="Website"
                  >
                    <Globe className="w-2.5 h-2.5 opacity-80" />
                    <span>{profile.links.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                  </a>
                ) : (
                  <span className="text-[10px] text-white/50 tracking-wider font-mono">
                    [ ⟲ Flip Card ]
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================
              BACK FACE
              ============================================================ */}
          <div
            id={`${cardIdPrefix}-face-back`}
            className={`absolute inset-0 w-full h-full ${cardRadiusClass} p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xl border transition-all duration-300`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background:
                material.finish === 'glass'
                  ? 'rgba(15, 15, 20, 0.75)'
                  : material.finish === 'matte'
                  ? '#09090b'
                  : theme.cardBg,
              backdropFilter:
                material.finish === 'glass' ? `blur(${material.glassBlur || 14}px)` : undefined,
              borderColor: theme.borderColor,
              color: theme.textColor,
              boxShadow:
                material.finish === 'matte'
                  ? '0 10px 30px rgba(0,0,0,0.8)'
                  : `0 20px 50px -10px ${theme.glowColor}, 0 4px 14px rgba(0,0,0,0.4)`,
            }}
          >
            {/* Dynamic Shader Canvas on Back */}
            <ShaderCanvas
              id={`${cardIdPrefix}-shader-canvas-back`}
              themeKey={profile.themeKey}
              mousePos={{ x: tilt.mx / 100 - 0.5, y: tilt.my / 100 - 0.5 }}
            />

            {/* Back Header: Clean Name & Handle */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold tracking-wider uppercase opacity-85">
                {profile.name || ''}
              </span>
              <div className="flex items-center gap-2">
                {show.username && profile.username && (
                  <span className="text-xs font-mono opacity-60">@{profile.username}</span>
                )}
                {/* Quick vCard download button on back */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadVCard(profile);
                  }}
                  className="no-export p-1 rounded-md bg-white/10 hover:bg-white/20 text-neutral-200 text-[10px] flex items-center gap-1 border border-white/15 transition-all"
                  title="Save contact (.vcf vCard)"
                >
                  <Briefcase className="w-2.5 h-2.5 text-cyan-400" />
                  <span className="hidden sm:inline">vCard</span>
                </button>
              </div>
            </div>

            {/* Back Body: Motto, Featured Project, Bio & Links */}
            <div className="relative z-10 my-auto py-2 space-y-2.5">
              {/* Motto / Manifesto */}
              {show.showMottoOnBack && showcase.motto && showcase.motto.trim() && (
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs italic leading-relaxed opacity-95 text-neutral-200">
                    &ldquo;{showcase.motto}&rdquo;
                  </p>
                </div>
              )}

              {/* Featured Project Showcase */}
              {show.showProjectOnBack && showcase.projectTitle && showcase.projectTitle.trim() && (
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/15 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-tight text-white flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-violet-400" />
                      {showcase.projectTitle}
                    </span>
                    {showcase.projectUrl && (
                      <a
                        href={showcase.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>View</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {showcase.projectDesc && (
                    <p className="text-[10.5px] opacity-75 line-clamp-2 leading-tight">
                      {showcase.projectDesc}
                    </p>
                  )}
                </div>
              )}

              {/* Bio if motto is not shown or in addition */}
              {show.bio && (!show.showMottoOnBack || !showcase.motto) && profile.bio && (
                <p className="text-xs sm:text-[13px] leading-relaxed opacity-90 line-clamp-2">
                  {profile.bio}
                </p>
              )}

              {/* Skills summary on back */}
              {show.skills && activeSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-[55px] overflow-y-auto scrollbar-none">
                  {activeSkills.slice(0, 5).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium border shadow-xs"
                      style={{
                        backgroundColor: theme.chipBg,
                        borderColor: theme.borderColor,
                        color: theme.textColor,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                  {activeSkills.length > 5 && (
                    <span className="text-[10px] opacity-60 self-center">
                      +{activeSkills.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Back Footer: Links & vCard Info */}
            <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-xs opacity-75">
              {show.links && links.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {links.slice(0, 3).map((l) => (
                    <a
                      key={l.key}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium hover:bg-white/15 transition-all"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderColor: theme.borderColor,
                      }}
                    >
                      <span>{l.label}</span>
                      <ExternalLink className="w-2 h-2 opacity-60" />
                    </a>
                  ))}
                </div>
              ) : showcase.email ? (
                <div className="flex items-center gap-1 text-[11px]">
                  <Mail className="w-3 h-3 text-cyan-400" />
                  <span>{showcase.email}</span>
                </div>
              ) : (
                <span>{profile.links.website || profile.location || ''}</span>
              )}

              {show.year && profile.year && (
                <span className="font-mono text-[10px] opacity-60">{profile.year}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
