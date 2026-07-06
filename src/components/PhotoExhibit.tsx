import React, { useState, useRef } from 'react';
import type { ExhibitKind } from '../types';

interface Props {
  src: string;
  kind: ExhibitKind;
  progress: number;  // 0..1
}

// A spotlit "gallery panel" presentation of the user's own dream-vehicle photo:
// pointer-tracked 3D tilt, floor reflection, and per-kind progressive reveals.
export default function PhotoExhibit({ src, kind, progress }: Props) {
  const p = Math.min(Math.max(progress, 0), 1);
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: nx, y: ny });
  };

  const transform = tilt
    ? `perspective(1100px) rotateY(${tilt.x * 12}deg) rotateX(${-tilt.y * 7}deg)`
    : undefined;

  const lightsOn = kind === 'panamera' && p >= 0.9;
  const imgFilter = kind === 'panamera'
    ? `brightness(${0.35 + p * 0.65}) saturate(${0.45 + p * 0.55}) blur(${(1 - p) * 5}px)`
    : `brightness(${0.75 + p * 0.25})`;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        background: 'radial-gradient(ellipse 70% 55% at 50% 8%, #161307 0%, #050505 62%)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      }}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt(null)}
    >
      {/* spotlight cone */}
      <div style={{
        position: 'absolute', top: '-12%', left: '50%', width: '68%', height: '80%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(180deg, rgba(255,238,190,0.10), rgba(255,238,190,0.02) 60%, transparent)',
        clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)',
        pointerEvents: 'none',
      }} />

      <div style={{ marginTop: '5%', width: 'min(74%, 620px)', perspective: 1100 }}>
        {/* the panel */}
        <div
          ref={frame}
          className={tilt ? undefined : 'animate-sway'}
          style={{
            transform,
            transition: tilt ? 'transform 0.12s ease-out' : 'transform 0.6s ease-out',
            transformStyle: 'preserve-3d',
            borderRadius: 14,
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: `0 0 40px rgba(212,175,55,${0.08 + p * 0.14}), 0 30px 60px rgba(0,0,0,0.7)`,
            overflow: 'hidden',
            position: 'relative',
            background: '#0a0a0c',
          }}
        >
          <img src={src} alt="" style={{ width: '100%', display: 'block', filter: imgFilter, transition: 'filter 0.8s ease' }} />

          {/* fog veil (car) */}
          {kind === 'panamera' && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(10,10,13,0.9), rgba(10,10,13,0.55))',
              opacity: (1 - p) * 0.85, transition: 'opacity 0.8s ease',
            }} />
          )}

          {/* headlight flare at 90% */}
          {lightsOn && (
            <>
              <div style={{ position: 'absolute', left: '18%', bottom: '30%', width: 90, height: 90, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(255,242,192,0.75), transparent 65%)', filter: 'blur(6px)' }} />
              <div style={{ position: 'absolute', right: '18%', bottom: '30%', width: 90, height: 90, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(255,242,192,0.75), transparent 65%)', filter: 'blur(6px)' }} />
            </>
          )}

          {/* cloth cover (bike): covers the top (1-p) share, slides up and away */}
          {kind === 'motorcycle' && p < 0.999 && (
            <div style={{
              position: 'absolute', top: '-3%', left: '-3%', right: '-3%',
              height: `${(1 - p) * 106}%`,
              background: 'linear-gradient(180deg, #23232b 0%, #17171d 78%, #101015 100%)',
              borderBottomLeftRadius: '48% 26px',
              borderBottomRightRadius: '52% 34px',
              boxShadow: '0 14px 24px rgba(0,0,0,0.65)',
              transition: 'height 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
              pointerEvents: 'none',
            }}>
              {/* drape folds */}
              {[18, 38, 61, 82].map(x => (
                <div key={x} style={{ position: 'absolute', top: 0, bottom: '6%', left: `${x}%`, width: 2, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.5))' }} />
              ))}
            </div>
          )}
        </div>

        {/* floor reflection */}
        <div style={{ transform: 'scaleY(-1)', marginTop: 3, opacity: 0.22, pointerEvents: 'none', borderRadius: 14, overflow: 'hidden', maskImage: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.9))', WebkitMaskImage: 'linear-gradient(0deg, rgba(0,0,0,0.9), transparent 70%)' }}>
          <img src={src} alt="" style={{ width: '100%', display: 'block', filter: `${imgFilter} blur(3px)` }} />
        </div>
      </div>
    </div>
  );
}
