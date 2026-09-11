'use client';

import React, { useState } from 'react';
import {
  CardProfile,
  MaterialFinish,
  CardFontFamily,
  AvatarType,
  AvatarShape,
  LiveStatusType,
} from '@/lib/types';
import {
  CARD_THEMES,
  PRESET_BADGES,
  PRESET_SKILLS,
  MATERIAL_PRESETS,
  FONT_PRESETS,
  STATUS_PRESETS,
} from '@/lib/constants';
import { calculateOpenShaderRarity, getOrCreateOpenShader } from '@/lib/webgpu-shaders';
import { downloadVCard } from '@/lib/exportCard';
import {
  Palette,
  User,
  Tags,
  Sliders,
  Sparkles,
  Plus,
  X,
  RotateCcw,
  Save,
  CheckCircle2,
  ExternalLink,
  Download,
  Flame,
  Globe,
  Github,
  Twitter,
  Gamepad2,
  Linkedin,
  Mail,
  Briefcase,
  Layers,
  Clock,
} from 'lucide-react';

interface CardStudioProps {
  profile: CardProfile;
  onChange: (updated: CardProfile) => void;
  onReset: () => void;
  onSave: () => void;
}

type TabType = 'design' | 'profile' | 'content' | 'display';

export const CardStudio: React.FC<CardStudioProps> = ({
  profile,
  onChange,
  onReset,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('design');
  const [customBadgeInput, setCustomBadgeInput] = useState('');
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [themeFilter, setThemeFilter] = useState<'all' | 'rare' | 'classic'>('all');
  const [openShadersHandleInput, setOpenShadersHandleInput] = useState('');
  const [shaderNotification, setShaderNotification] = useState('');
  const [customThemes, setCustomThemes] = useState<Record<string, (typeof CARD_THEMES)[string]>>({});

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
    showClock: false,
    cityLabel: 'San Francisco',
  };
  const avatarConfig = profile.avatarConfig || {
    type: 'monogram',
    shape: 'squircle',
    glowRing: true,
  };
  const showcase = profile.showcase || {
    motto: '',
    projectTitle: '',
    projectDesc: '',
    projectUrl: '',
    email: '',
  };

  // Apply custom OpenShader handle
  const handleApplyCustomShader = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = openShadersHandleInput.trim().toLowerCase().replace(/^@/, '');
    if (!handle) return;

    const rarityInfo = calculateOpenShaderRarity(handle);
    getOrCreateOpenShader(handle);

    if (CARD_THEMES[handle]) {
      onChange({ ...profile, themeKey: handle });
      setShaderNotification(`Shader theme applied: @${handle}`);
    } else {
      const customTheme = {
        key: handle,
        label: `@${handle} (Custom Shader)`,
        description: `Procedural WebGPU shader: ${rarityInfo.rarity.toUpperCase()} (${rarityInfo.rate})`,
        category: `OpenShaders (${rarityInfo.rate})`,
        rarity: rarityInfo.rarity,
        rarityRate: rarityInfo.rate,
        openshadersHandle: handle,
        isCustomOpenShader: true,
        bgGradient: 'from-violet-950 via-slate-900 to-indigo-950',
        cardBg: 'linear-gradient(145deg, #150f29, #28194e)',
        textColor: '#f5f3ff',
        accentColor: '#c084fc',
        chipBg: 'rgba(192, 132, 252, 0.16)',
        borderColor: 'rgba(192, 132, 252, 0.4)',
        glowColor: 'rgba(168, 85, 247, 0.45)',
        swatchColors: ['#1e1035', '#8b5cf6'] as [string, string],
        darkBgHex: '#150f29',
      };
      setCustomThemes((current) => ({ ...current, [handle]: customTheme }));
      onChange({ ...profile, themeKey: handle });
      setShaderNotification(`Custom WebGPU shader generated for @${handle} (${rarityInfo.rate})!`);
    }
    setOpenShadersHandleInput('');
    setTimeout(() => setShaderNotification(''), 4000);
  };

  // Skill toggle
  const toggleSkill = (skill: string) => {
    const current = profile.skills || [];
    const exists = current.includes(skill);
    const updated = exists ? current.filter((s) => s !== skill) : [...current, skill];
    onChange({ ...profile, skills: updated });
  };

  // Custom skill
  const addCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customSkillInput.trim();
    if (!val) return;
    if (!profile.skills.includes(val)) {
      onChange({ ...profile, skills: [...profile.skills, val] });
    }
    setCustomSkillInput('');
  };

  // Badge toggle
  const toggleBadge = (badge: string) => {
    const current = profile.badges || [];
    const exists = current.includes(badge);
    const updated = exists ? current.filter((b) => b !== badge) : [...current, badge];
    onChange({ ...profile, badges: updated });
  };

  // Custom badge
  const addCustomBadge = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customBadgeInput.trim();
    if (!val) return;
    if (!profile.badges.includes(val)) {
      onChange({ ...profile, badges: [...profile.badges, val] });
    }
    setCustomBadgeInput('');
  };

  // Toggle visibility flags
  const toggleVisibility = (key: keyof CardProfile['show']) => {
    onChange({
      ...profile,
      show: {
        ...profile.show,
        [key]: !profile.show[key],
      },
    });
  };

  // Filtered themes
  const themeEntries = Object.entries({ ...CARD_THEMES, ...customThemes }).filter(([_, th]) => {
    if (themeFilter === 'rare') return Boolean(th.rarity);
    if (themeFilter === 'classic') return !th.rarity;
    return true;
  });

  return (
    <div className="w-full bg-neutral-900/70 backdrop-blur-xl border border-neutral-800/80 rounded-2xl p-5 sm:p-7 shadow-xl">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">SoloCard Studio</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">Make your identity unmistakable.</h2>
        </div>
        <p className="text-xs text-neutral-500">Changes update the preview instantly</p>
      </div>
      {/* 4 Clean Primary Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6 gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800/80 max-w-full overflow-x-auto scrollbar-none">
          <button
            type="button"
            id="tab-design-btn"
            onClick={() => setActiveTab('design')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'design'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Design</span>
          </button>

          <button
            type="button"
            id="tab-profile-btn"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            id="tab-content-btn"
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'content'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Skills & Links</span>
          </button>

          <button
            type="button"
            id="tab-display-btn"
            onClick={() => setActiveTab('display')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'display'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Display & Showcase</span>
          </button>
        </div>

        {/* Quick Reset Button */}
        <button
          type="button"
          id="studio-reset-btn"
          onClick={onReset}
          className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900 transition-all shrink-0"
          title="Reset card to default settings"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* ============================================================
          TAB 1: DESIGN (Themes, Materials, Typography)
          ============================================================ */}
      {activeTab === 'design' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Theme & Shader Picker */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Visual Theme & Shaders
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Choose a procedural WebGPU shader theme or generate one from any username handle.
                </p>
              </div>

              {/* Theme Filter */}
              <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
                {(['all', 'rare', 'classic'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setThemeFilter(filter)}
                    className={`px-2.5 py-1 rounded capitalize font-medium transition-all ${
                      themeFilter === filter
                        ? 'bg-neutral-800 text-white font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {filter === 'rare' ? 'Rare Shaders' : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Shader Handle Generator */}
            <form onSubmit={handleApplyCustomShader} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-mono">
                  @
                </span>
                <input
                  type="text"
                  placeholder="Enter any handle (e.g. shawn_chen, patrik, or your handle)..."
                  value={openShadersHandleInput}
                  onChange={(e) => setOpenShadersHandleInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Apply Shader</span>
              </button>
            </form>

            {shaderNotification && (
              <div className="p-2.5 rounded-xl bg-violet-950/50 border border-violet-800/60 text-violet-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span>{shaderNotification}</span>
              </div>
            )}

            {/* Themes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto pr-1">
              {themeEntries.map(([key, theme]) => {
                const isSelected = profile.themeKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ ...profile, themeKey: key })}
                    className={`relative p-3 rounded-xl border text-left transition-all group flex flex-col justify-between min-h-[90px] ${
                      isSelected
                        ? 'border-violet-500 ring-2 ring-violet-500/30 bg-neutral-800/90 shadow-md'
                        : 'border-neutral-800/80 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${theme.swatchColors[0]}, ${theme.swatchColors[1]})`,
                        }}
                      />
                      {theme.rarity && (
                        <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                          {theme.rarityRate || theme.rarity}
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <span className="text-xs font-bold text-neutral-200 block truncate group-hover:text-white">
                        {theme.label}
                      </span>
                      <span className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                        {theme.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800/80" />

          {/* Material & Finish */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Material Finish
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Adjust the card surface reflection, translucency, and corner rounding.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MATERIAL_PRESETS.map((preset) => {
                const isSelected = material.finish === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...profile,
                        material: { ...material, finish: preset.id as MaterialFinish },
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-950/30 ring-1 ring-violet-500/50'
                        : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-neutral-200 block">
                      {preset.label}
                    </span>
                    <span className="text-[10.5px] text-neutral-400 line-clamp-2 mt-1">
                      {preset.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Corner Radius & Shimmer Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Corner Radius
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'rounded-xl', label: 'Classic (12px)' },
                    { id: 'rounded-2xl', label: 'Modern (16px)' },
                    { id: 'rounded-3xl', label: 'Smooth (24px)' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...profile,
                          material: { ...material, borderRadius: r.id as 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl' },
                        })
                      }
                      className={`flex-1 py-1.5 px-2 text-xs rounded-lg border font-medium transition-all ${
                        material.borderRadius === r.id
                          ? 'bg-violet-600 text-white border-violet-500'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shimmer Intensity Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-neutral-300">Shimmer Intensity</span>
                  <span className="text-neutral-500 font-mono">{material.shimmerIntensity ?? 65}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={material.shimmerIntensity ?? 65}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      material: {
                        ...material,
                        shimmerIntensity: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-violet-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800/80" />

          {/* Typography */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <span className="font-mono text-violet-400 font-bold">Aa</span>
                Typography Preset
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Pair your digital card with a distinctive typographic hierarchy.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FONT_PRESETS.map((f) => {
                const isSelected = typography.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...profile,
                        typography: { ...typography, fontFamily: f.id as CardFontFamily },
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-950/30 ring-1 ring-violet-500/50'
                        : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-200">{f.label}</span>
                      <span className="text-[10px] font-mono text-neutral-500">{f.sample}</span>
                    </div>
                    <span className="text-[10.5px] text-neutral-400 block mt-1">{f.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: PROFILE (Identity, Avatar, Status)
          ============================================================ */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Basic Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <User className="w-4 h-4 text-violet-400" />
              Identity Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => onChange({ ...profile, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Username / Handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => onChange({ ...profile, username: e.target.value })}
                    placeholder="alexrivera"
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Role / Headline</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => onChange({ ...profile, role: e.target.value })}
                  placeholder="e.g. Software Engineer & Creator"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Location</label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => onChange({ ...profile, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Year / Batch</label>
                  <input
                    type="text"
                    value={profile.year}
                    onChange={(e) => onChange({ ...profile, year: e.target.value })}
                    placeholder="2026"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Bio (Short summary)</label>
              <textarea
                value={profile.bio}
                onChange={(e) => onChange({ ...profile, bio: e.target.value })}
                rows={2}
                placeholder="Designing interactive web worlds and generative graphic tools..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800/80" />

          {/* Avatar & Monogram */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              Avatar & Monogram
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 block">Avatar Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...profile,
                        avatarConfig: { ...avatarConfig, type: 'monogram' },
                      })
                    }
                    className={`flex-1 py-1.5 px-2 text-xs rounded-lg border font-semibold ${
                      avatarConfig.type === 'monogram'
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    Monogram
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...profile,
                        avatarConfig: { ...avatarConfig, type: 'image' },
                      })
                    }
                    className={`flex-1 py-1.5 px-2 text-xs rounded-lg border font-semibold ${
                      avatarConfig.type === 'image'
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    Photo URL
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 block">Shape</label>
                <div className="flex gap-2">
                  {[
                    { id: 'squircle', label: 'Squircle' },
                    { id: 'circle', label: 'Circle' },
                    { id: 'rounded', label: 'Rounded' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...profile,
                          avatarConfig: { ...avatarConfig, shape: s.id as AvatarShape },
                        })
                      }
                      className={`flex-1 py-1.5 px-1.5 text-xs rounded-lg border font-medium ${
                        avatarConfig.shape === s.id
                          ? 'bg-violet-600 text-white border-violet-500'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 block">Ambient Glow</label>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...profile,
                      avatarConfig: { ...avatarConfig, glowRing: !avatarConfig.glowRing },
                    })
                  }
                  className={`w-full py-1.5 px-3 text-xs rounded-lg border font-semibold transition-all ${
                    avatarConfig.glowRing
                      ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  {avatarConfig.glowRing ? '✓ Glow Ring Active' : 'Glow Ring Off'}
                </button>
              </div>
            </div>

            {avatarConfig.type === 'image' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Photo Image URL</label>
                <input
                  type="url"
                  value={profile.avatar}
                  onChange={(e) => onChange({ ...profile, avatar: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            )}
          </div>

          <div className="h-[1px] bg-neutral-800/80" />

          {/* Live Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Live Status Indicator
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {STATUS_PRESETS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...profile,
                      status: {
                        ...status,
                        status: st.id as LiveStatusType,
                        customText: st.id === 'available' ? 'Available for Projects' : st.label,
                      },
                    })
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    status.status === st.id
                      ? 'border-violet-500 bg-neutral-800 text-white font-semibold'
                      : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${st.color}`} />
                  <span className="text-xs truncate">{st.label}</span>
                </button>
              ))}
            </div>

            {status.status !== 'none' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Status Text</label>
                  <input
                    type="text"
                    value={status.customText}
                    onChange={(e) =>
                      onChange({
                        ...profile,
                        status: { ...status, customText: e.target.value },
                      })
                    }
                    placeholder="e.g. Available for Projects"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">City / Timezone Label</label>
                  <input
                    type="text"
                    value={status.cityLabel || ''}
                    onChange={(e) =>
                      onChange({
                        ...profile,
                        status: { ...status, cityLabel: e.target.value },
                      })
                    }
                    placeholder="e.g. San Francisco"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: CONTENT (Skills, Badges, Links)
          ============================================================ */}
      {activeTab === 'content' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Badges */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Badges & Specialties
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Select key highlights to display on the front of your card.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {profile.badges?.length || 0} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_BADGES.map((badge) => {
                const isSelected = profile.badges?.includes(badge);
                return (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => toggleBadge(badge)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    {isSelected && <span className="mr-1">✓</span>}
                    {badge}
                  </button>
                );
              })}
            </div>

            {/* Custom Badge Input */}
            <form onSubmit={addCustomBadge} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add custom badge (e.g. Core Contributor)..."
                value={customBadgeInput}
                onChange={(e) => setCustomBadgeInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700"
              >
                Add Badge
              </button>
            </form>
          </div>

          <div className="h-[1px] bg-neutral-800/80" />

          {/* Skills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Tags className="w-4 h-4 text-violet-400" />
                  Skills & Technologies
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Displayed cleanly on the back face of your card.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {profile.skills?.length || 0} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_SKILLS.map((skill) => {
                const isSelected = profile.skills?.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-violet-600 text-white border-violet-500 shadow-xs'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>

            {/* Custom Skill Input */}
            <form onSubmit={addCustomSkill} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add custom skill (e.g. WebGPU, GLSL)..."
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700"
              >
                Add Skill
              </button>
            </form>
          </div>

          <div className="h-[1px] bg-neutral-800/80" />

          {/* Social & Portfolio Links */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Social & Portfolio Links
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Connect your profiles. Clean icon shortcuts will appear on the card.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Globe className="w-4 h-4 text-neutral-500 shrink-0" />
                <input
                  type="url"
                  placeholder="Website (e.g. https://alexrivera.dev)"
                  value={profile.links.website || ''}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      links: { ...profile.links, website: e.target.value },
                    })
                  }
                  className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Github className="w-4 h-4 text-neutral-500 shrink-0" />
                <input
                  type="url"
                  placeholder="GitHub URL"
                  value={profile.links.github || ''}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      links: { ...profile.links, github: e.target.value },
                    })
                  }
                  className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Twitter className="w-4 h-4 text-neutral-500 shrink-0" />
                <input
                  type="url"
                  placeholder="X / Twitter URL"
                  value={profile.links.x || ''}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      links: { ...profile.links, x: e.target.value },
                    })
                  }
                  className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Linkedin className="w-4 h-4 text-neutral-500 shrink-0" />
                <input
                  type="url"
                  placeholder="LinkedIn URL"
                  value={profile.links.linkedin || ''}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      links: { ...profile.links, linkedin: e.target.value },
                    })
                  }
                  className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Gamepad2 className="w-4 h-4 text-neutral-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Discord Handle"
                  value={profile.links.discord || ''}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      links: { ...profile.links, discord: e.target.value },
                    })
                  }
                  className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
                <input
                  type="email"
                  placeholder="Public Email Address"
                  value={showcase.email || ''}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      showcase: { ...showcase, email: e.target.value },
                    })
                  }
                  className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: DISPLAY & SHOWCASE (Visibility, Manifesto, Showcase)
          ============================================================ */}
      {activeTab === 'display' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Card Element Toggles */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-400" />
                Card Element Visibility
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Toggle elements on the front and back of your card.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'username', label: 'Username Handle' },
                { key: 'location', label: 'Location Tag' },
                { key: 'year', label: 'Year / Batch' },
                { key: 'badges', label: 'Badges on Front' },
                { key: 'showStatusOnFront', label: 'Live Status Indicator (Front)' },
                { key: 'showSkillsOnFront', label: 'Skills Grid (Front Face)' },
                { key: 'showLinksOnFront', label: 'Social Links (Front Face)' },
                { key: 'showMottoOnBack', label: 'Manifesto / Motto (Back Face)' },
                { key: 'showProjectOnBack', label: 'Project Showcase (Back Face)' },
              ].map(({ key, label }) => {
                const defaultFalse = ['showSkillsOnFront', 'showLinksOnFront', 'showClockOnFront'].includes(key);
                const isChecked = defaultFalse
                  ? Boolean(profile.show[key as keyof CardProfile['show']])
                  : (profile.show[key as keyof CardProfile['show']] ?? true);

                return (
                  <div
                    key={key}
                    onClick={() => toggleVisibility(key as keyof CardProfile['show'])}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 cursor-pointer hover:border-neutral-700 transition-all select-none"
                  >
                    <span className="text-xs font-medium text-neutral-200">{label}</span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        isChecked
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                          : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                      }`}
                    >
                      {isChecked ? 'ON' : 'OFF'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800/80" />

          {/* Project Showcase & Motto */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                Featured Project & Manifesto
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Highlights shown on the back of your card when flipped.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Personal Motto / Manifesto
                </label>
                <input
                  type="text"
                  value={showcase.motto || ''}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      showcase: { ...showcase, motto: e.target.value },
                    })
                  }
                  placeholder="e.g. Crafting digital experiences at the intersection of design and code."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 italic"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Featured Project Title
                  </label>
                  <input
                    type="text"
                    value={showcase.projectTitle || ''}
                    onChange={(e) =>
                      onChange({
                        ...profile,
                        showcase: { ...showcase, projectTitle: e.target.value },
                      })
                    }
                    placeholder="e.g. Neon Odyssey"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Project URL</label>
                  <input
                    type="url"
                    value={showcase.projectUrl || ''}
                    onChange={(e) =>
                      onChange({
                        ...profile,
                        showcase: { ...showcase, projectUrl: e.target.value },
                      })
                    }
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Project Description
                </label>
                <textarea
                  value={showcase.projectDesc || ''}
                  onChange={(e) =>
                    onChange({
                      ...profile,
                      showcase: { ...showcase, projectDesc: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder="Atmospheric WebGPU experience with real-time procedural shaders..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800/80" />

          {/* Quick vCard Download & Save */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div>
              <span className="text-xs font-bold text-neutral-200 block">
                Export Digital Contact (.vcf)
              </span>
              <span className="text-[11px] text-neutral-400">
                Download your card info as an Apple / Google Contacts compatible vCard file.
              </span>
            </div>

            <button
              type="button"
              onClick={() => downloadVCard(profile)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download vCard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
