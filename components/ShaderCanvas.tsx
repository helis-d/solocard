'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ThemeShaderKey } from '@/lib/types';
import { CARD_THEMES } from '@/lib/constants';
import { OPENS_SHADERS_REGISTRY, getOrCreateOpenShader, ShaderHandle } from '@/lib/webgpu-shaders';

interface ShaderCanvasProps {
  themeKey: ThemeShaderKey;
  className?: string;
  mousePos?: { x: number; y: number };
  onEngineReady?: (engine: 'webgpu' | 'canvas2d') => void;
  id?: string;
}

// Maps our theme keys to the WebGPU registry shader keys
const THEME_TO_WEBGPU_MAP: Partial<Record<string, string>> = {
  'halftone': 'halftone',
  'halftone-ink': 'halftone-ink',
  'sparkle': 'sparkle',
  'sparkle-gold': 'sparkle-warm',
  'dither': 'dither',
  'wave': 'wave',
  'ascii': 'ascii',
  'prism': 'prism',
  'splines': 'splines',
  'pixel': 'pixel',
  'grain': 'grain',
  'loewe': 'loewe',
  'javazero': 'javazero',
  'banhua': 'banhua',
  'cyrsks': 'cyrsks',
  'orcdev': 'orcdev',
  'clio': 'clio',
  'holographic': 'splines',
  'obsidian': 'grain',
};

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  themeKey,
  className = '',
  mousePos,
  onEngineReady,
  id,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gpuUnavailable, setGpuUnavailable] = useState(false);

  const mappedKey = THEME_TO_WEBGPU_MAP[themeKey] || themeKey;
  const shaderOption = mappedKey ? getOrCreateOpenShader(mappedKey) : null;

  // Determine engine without calling setState synchronously in effect
  const canAttemptWebGpu =
    !gpuUnavailable &&
    Boolean(shaderOption?.factory) &&
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    Boolean((navigator as { gpu?: unknown }).gpu);

  const engine: 'webgpu' | 'canvas2d' = canAttemptWebGpu ? 'webgpu' : 'canvas2d';

  // Effect for WebGPU Pipeline initialization
  useEffect(() => {
    if (engine !== 'webgpu' || !shaderOption?.factory) {
      onEngineReady?.('canvas2d');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let isCancelled = false;
    let shaderHandle: ShaderHandle | null = null;
    const abortController = new AbortController();

    const currentTheme = CARD_THEMES[themeKey] || CARD_THEMES['halftone'];
    const darkHex = currentTheme.darkBgHex || '#0f0e17';

    shaderOption
      .factory(canvas, {
        theme: 'dark',
        background: { dark: darkHex, light: '#ffffff' },
        autoplay: true,
        signal: abortController.signal,
        onError: (err) => {
          console.warn('WebGPU shader runtime error, falling back to 2D:', err);
          if (!isCancelled) {
            setGpuUnavailable(true);
            onEngineReady?.('canvas2d');
          }
        },
      })
      .then((handle) => {
        if (isCancelled) {
          handle.destroy();
          return;
        }
        shaderHandle = handle;
        onEngineReady?.('webgpu');
      })
      .catch((err) => {
        console.info('WebGPU initialization unavailable or failed, smoothly switching to Canvas 2D fallback:', err.message);
        if (!isCancelled) {
          setGpuUnavailable(true);
          onEngineReady?.('canvas2d');
        }
      });

    return () => {
      isCancelled = true;
      abortController.abort();
      if (shaderHandle) {
        try {
          shaderHandle.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [themeKey, engine, shaderOption, onEngineReady]);

  // Effect for Canvas 2D Fallback Rendering
  useEffect(() => {
    if (engine !== 'canvas2d') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const glyphs = '01#@%&*+=~/<>?:;{}[]$';

    const render = () => {
      time += 0.02;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const mx = mousePos ? (mousePos.x + 0.5) * w : w / 2;
      const my = mousePos ? (mousePos.y + 0.5) * h : h / 2;

      switch (themeKey) {
        case 'halftone':
        case 'halftone-ink': {
          const dotSpacing = 16;
          const cols = Math.ceil(w / dotSpacing) + 1;
          const rows = Math.ceil(h / dotSpacing) + 1;
          const isInk = themeKey === 'halftone-ink';
          ctx.fillStyle = isInk ? 'rgba(129, 140, 248, 0.45)' : 'rgba(192, 132, 252, 0.45)';

          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              const x = i * dotSpacing;
              const y = j * dotSpacing;
              const dx = x - mx;
              const dy = y - my;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const wave = Math.sin(dist * 0.04 - time * 2) * 0.5 + 0.5;
              const radius = 1.2 + wave * 2.8;

              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        case 'wave': {
          ctx.lineWidth = 1.5;
          const count = 6;
          for (let i = 0; i < count; i++) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 + (i / count) * 0.25})`;
            ctx.beginPath();
            const yOffset = h * 0.3 + (i * h * 0.5) / count;
            for (let x = 0; x <= w; x += 10) {
              const y =
                yOffset +
                Math.sin(x * 0.015 + time * 1.5 + i * 0.8) * 18 +
                Math.cos(x * 0.008 - time * 1.1) * 12;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          break;
        }

        case 'sparkle':
        case 'sparkle-gold': {
          const particleCount = 28;
          ctx.fillStyle = themeKey === 'sparkle-gold' ? '#fbbf24' : '#7ee0d5';

          for (let i = 0; i < particleCount; i++) {
            const seed = i * 137.5;
            const px = ((Math.sin(seed) * 10000) % 1) * w;
            const py = ((Math.cos(seed * 2) * 10000) % 1) * h;
            const twinkle = Math.sin(time * 3 + seed) * 0.5 + 0.5;
            const size = 1.5 + twinkle * 2.5;

            ctx.globalAlpha = 0.2 + twinkle * 0.6;
            ctx.beginPath();
            ctx.arc(Math.abs(px), Math.abs(py), size, 0, Math.PI * 2);
            ctx.fill();

            if (twinkle > 0.6) {
              ctx.beginPath();
              ctx.moveTo(Math.abs(px) - size * 3, Math.abs(py));
              ctx.lineTo(Math.abs(px) + size * 3, Math.abs(py));
              ctx.moveTo(Math.abs(px), Math.abs(py) - size * 3);
              ctx.lineTo(Math.abs(px), Math.abs(py) + size * 3);
              ctx.strokeStyle = ctx.fillStyle;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
          ctx.globalAlpha = 1.0;
          break;
        }

        case 'dither': {
          const step = 8;
          ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
          for (let x = 0; x < w; x += step) {
            for (let y = 0; y < h; y += step) {
              const val = (Math.sin(x * 0.05 + time) + Math.cos(y * 0.05 - time)) * 0.5 + 0.5;
              if (val > 0.65) {
                ctx.fillRect(x, y, 2, 2);
              }
            }
          }
          break;
        }

        case 'ascii': {
          ctx.font = '10px monospace';
          ctx.fillStyle = 'rgba(96, 165, 250, 0.35)';
          const cell = 18;
          const cols = Math.floor(w / cell);
          const rows = Math.floor(h / cell);

          for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
              const charIndex = Math.floor(Math.abs(Math.sin(i * 3 + j * 7 + time * 2) * glyphs.length)) % glyphs.length;
              const char = glyphs[charIndex];
              const opacity = (Math.sin(i * 0.4 + j * 0.2 + time) * 0.5 + 0.5) * 0.4;
              ctx.fillStyle = `rgba(96, 165, 250, ${opacity})`;
              ctx.fillText(char, i * cell, j * cell + 10);
            }
          }
          break;
        }

        case 'holographic': {
          ctx.lineWidth = 2.5;
          const bands = 5;
          for (let i = 0; i < bands; i++) {
            const hue = (time * 40 + i * 50) % 360;
            ctx.strokeStyle = `hsla(${hue}, 85%, 65%, 0.25)`;
            ctx.beginPath();
            const yBase = (h / (bands + 1)) * (i + 1);
            for (let x = 0; x <= w; x += 15) {
              const y = yBase + Math.sin(x * 0.02 + time * 2 + i) * 16;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          break;
        }

        case 'obsidian':
        default: {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          const spacing = 20;
          for (let x = 0; x < w; x += spacing) {
            for (let y = 0; y < h; y += spacing) {
              ctx.fillRect(x, y, 1.2, 1.2);
            }
          }
          break;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [themeKey, engine, mousePos]);

  return (
    <canvas
      key={`shader-${themeKey}-${gpuUnavailable ? 'fallback' : 'main'}`}
      ref={canvasRef}
      id={id || `card-shader-canvas-${themeKey}`}
      suppressHydrationWarning
      className={`absolute inset-0 w-full h-full pointer-events-none rounded-[24px] overflow-hidden opacity-85 transition-opacity duration-300 ${className}`}
    />
  );
};
