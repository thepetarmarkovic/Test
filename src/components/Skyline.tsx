import React, { useMemo } from 'react';
import type { EarningEntry, DivisionConfig } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency } from '../utils/formatters';

interface Props {
  earnings: EarningEntry[];
}

// Config-driven: add a future division here (or in localStorage) and it
// appears in the scene as a construction site until you flip it active.
const DEFAULT_DIVISIONS: DivisionConfig[] = [
  { key: 'agriculture', label: 'AGRICULTURE', state: 'construction', categories: [], floorValue: 5000, maxFloors: 16 },
  { key: 'digital', label: 'DIGITAL', state: 'active', categories: ['salary', 'freelance', 'investment', 'business', 'other'], floorValue: 2500, maxFloors: 22 },
  { key: 'electronics', label: 'ELECTRONICS', state: 'construction', categories: [], floorValue: 5000, maxFloors: 16 },
];

// deterministic pseudo-random 0..1 — stable across renders
const rnd = (i: number) => (((i * 2654435761) >>> 0) % 1000) / 1000;

const GROUND = 388;

function ActiveTower({ x, width, litFloors, maxFloors, label, revenue }: {
  x: number; width: number; litFloors: number; maxFloors: number; label: string; revenue: number;
}) {
  const floorH = 12.5;
  const bodyH = maxFloors * floorH + 14;
  const top = GROUND - bodyH;
  const winW = (width - 34) / 3;

  const windows: React.ReactNode[] = [];
  for (let f = 0; f < maxFloors; f++) {
    const lit = f < litFloors;
    const y = GROUND - (f + 1) * floorH + 2;
    for (let w = 0; w < 3; w++) {
      const i = f * 3 + w;
      const off = lit && rnd(i + 7) > 0.82; // a few dark windows on lit floors
      const flicker = lit && !off && rnd(i + 31) > 0.93;
      windows.push(
        <rect
          key={i}
          x={x + 10 + w * (winW + 7)} y={y}
          width={winW} height={floorH - 5} rx={1}
          fill={lit && !off ? '#FFD700' : '#101014'}
          opacity={lit && !off ? 0.88 : 1}
          className={flicker ? 'sky-flicker' : undefined}
          style={flicker ? { animationDelay: `${rnd(i) * 6}s` } : undefined}
        />
      );
    }
  }

  return (
    <g>
      {/* glow behind lit portion */}
      {litFloors > 0 && (
        <ellipse cx={x + width / 2} cy={GROUND - (litFloors * floorH) / 2} rx={width}
          ry={litFloors * floorH * 0.7} fill="#D4AF37" opacity={0.05} />
      )}
      <rect x={x} y={top} width={width} height={bodyH} fill="#0c0c10" stroke="#1c1c22" strokeWidth={1} />
      {/* roof + antenna + beacon */}
      <rect x={x + 8} y={top - 8} width={width - 16} height={8} fill="#0a0a0e" />
      <line x1={x + width / 2} y1={top - 8} x2={x + width / 2} y2={top - 40} stroke="#2a2a32" strokeWidth={2} />
      <circle cx={x + width / 2} cy={top - 42} r={3} fill="#FF4141" className="animate-blink" />
      {windows}
      {/* nameplate */}
      <text x={x + width / 2} y={GROUND + 18} textAnchor="middle" fill="#D4AF37" fontSize={10}
        fontWeight={800} letterSpacing={2} fontFamily="JetBrains Mono, monospace">{label}</text>
      <text x={x + width / 2} y={GROUND + 32} textAnchor="middle" fill="#555" fontSize={8}
        fontFamily="JetBrains Mono, monospace">{formatCurrency(revenue)} · {litFloors}/{maxFloors} FLOORS</text>
    </g>
  );
}

function ConstructionSite({ x, label, seed }: { x: number; label: string; seed: number }) {
  const w = 96;
  const skeletonFloors = 3;
  const floorH = 16;
  const skelTop = GROUND - skeletonFloors * floorH;
  const craneBase = x + w + 14;
  const craneTop = GROUND - 150;
  const jibLen = 78 * (rnd(seed) > 0.5 ? 1 : -1);

  return (
    <g>
      {/* concrete skeleton: slabs + columns */}
      {Array.from({ length: skeletonFloors + 1 }, (_, f) => (
        <rect key={`s${f}`} x={x} y={GROUND - f * floorH - 3} width={w} height={3} fill="#17171d" />
      ))}
      {[0, 1, 2, 3].map(c => (
        <rect key={`c${c}`} x={x + 4 + c * ((w - 12) / 3)} y={skelTop} width={4} height={skeletonFloors * floorH} fill="#131318" />
      ))}
      {/* scaffolding hints */}
      <line x1={x - 4} y1={GROUND} x2={x - 4} y2={skelTop - 6} stroke="#15151a" strokeWidth={1.5} />
      <line x1={x + w + 4} y1={GROUND} x2={x + w + 4} y2={skelTop - 6} stroke="#15151a" strokeWidth={1.5} />
      {/* crane */}
      <line x1={craneBase} y1={GROUND} x2={craneBase} y2={craneTop} stroke="#26262e" strokeWidth={3} />
      <line x1={craneBase - 20} y1={craneTop + 14} x2={craneBase} y2={craneTop} stroke="#26262e" strokeWidth={2} />
      <line x1={craneBase} y1={craneTop} x2={craneBase + jibLen} y2={craneTop} stroke="#26262e" strokeWidth={2.5} />
      <line x1={craneBase - jibLen * 0.3} y1={craneTop} x2={craneBase} y2={craneTop} stroke="#26262e" strokeWidth={2.5} />
      <rect x={craneBase - jibLen * 0.3 - 6} y={craneTop - 3} width={8} height={7} fill="#1c1c24" />
      {/* cable + hook */}
      <line x1={craneBase + jibLen * 0.72} y1={craneTop} x2={craneBase + jibLen * 0.72} y2={craneTop + 46 + rnd(seed + 3) * 24} stroke="#1f1f26" strokeWidth={1} />
      <rect x={craneBase + jibLen * 0.72 - 3} y={craneTop + 46 + rnd(seed + 3) * 24} width={6} height={5} fill="#2a2a32" />
      <circle cx={craneBase} cy={craneTop - 4} r={2.5} fill="#FF4141" className="animate-blink"
        style={{ animationDelay: `${rnd(seed + 9) * 1.4}s` }} />
      {/* hoarding */}
      <rect x={x - 2} y={GROUND - 12} width={w + 4} height={12} fill="#0f0f14" stroke="#1e1e26" strokeWidth={0.5} />
      <text x={x + w / 2} y={GROUND + 18} textAnchor="middle" fill="#555" fontSize={10}
        fontWeight={800} letterSpacing={2} fontFamily="JetBrains Mono, monospace">{label}</text>
      <text x={x + w / 2} y={GROUND + 32} textAnchor="middle" fill="#3a3a3a" fontSize={8}
        fontFamily="JetBrains Mono, monospace">🏗 UNDER CONSTRUCTION</text>
    </g>
  );
}

export default function Skyline({ earnings }: Props) {
  const [divisions] = useLocalStorage<DivisionConfig[]>('empire_divisions', DEFAULT_DIVISIONS);

  const revenueOf = (d: DivisionConfig) =>
    earnings.filter(e => d.categories.includes(e.category)).reduce((s, e) => s + e.amount, 0);

  const stars = useMemo(() =>
    Array.from({ length: 46 }, (_, i) => ({
      x: rnd(i * 3 + 1) * 800,
      y: rnd(i * 7 + 2) * 200,
      r: 0.6 + rnd(i * 11 + 3) * 1.1,
      delay: rnd(i * 13 + 5) * 5,
    })), []);

  const active = divisions.filter(d => d.state === 'active');
  const construction = divisions.filter(d => d.state === 'construction');
  // layout: construction left, actives center, construction right
  const positions: { div: DivisionConfig; x: number }[] = [];
  if (construction[0]) positions.push({ div: construction[0], x: 96 });
  active.forEach((d, i) => positions.push({ div: d, x: 330 + i * 150 }));
  if (construction[1]) positions.push({ div: construction[1], x: 560 });
  construction.slice(2).forEach((d, i) => positions.push({ div: d, x: 690 + i * 120 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-up">
      <div>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>ONE TOWER PER DIVISION — BUILT BY REVENUE</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#fff' }}>EMPIRE SKYLINE</h1>
      </div>

      {/* The scene */}
      <div className="empire-card" style={{ padding: 0, overflow: 'hidden' }}>
        <svg viewBox="0 0 800 440" style={{ width: '100%', display: 'block', background: '#030304' }}>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#05050a" />
              <stop offset="70%" stopColor="#0a0810" />
              <stop offset="100%" stopColor="#0f0a08" />
            </linearGradient>
          </defs>
          <rect width="800" height="440" fill="url(#sky)" />

          {/* stars */}
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#8a8a99"
              className="sky-twinkle" style={{ animationDelay: `${s.delay}s` }} />
          ))}
          {/* moon */}
          <circle cx={700} cy={64} r={22} fill="#e8e4d8" opacity={0.9} />
          <circle cx={708} cy={58} r={20} fill="#0a0810" opacity={0.85} />

          {/* distant Belgrade silhouettes */}
          <g fill="#0a0a0e">
            {/* Avala-style TV tower */}
            <path d="M 60 370 L 68 180 L 72 180 L 80 370 Z" />
            <rect x={62} y={196} width={16} height={10} rx={2} />
            <line x1={70} y1={180} x2={70} y2={150} stroke="#0a0a0e" strokeWidth={2.5} />
            {/* Genex-style twin tower */}
            <rect x={236} y={250} width={26} height={120} />
            <rect x={276} y={230} width={26} height={140} />
            <rect x={258} y={262} width={22} height={10} />
            <circle cx={289} cy={224} r={10} />
            {/* filler blocks */}
            <rect x={130} y={300} width={44} height={70} />
            <rect x={420} y={290} width={52} height={80} />
            <rect x={490} y={315} width={38} height={55} />
            <rect x={680} y={295} width={48} height={75} />
            <rect x={740} y={320} width={40} height={50} />
          </g>
          {/* faint windows on distant blocks */}
          {[140, 154, 430, 444, 458, 690, 704].map((wx, i) => (
            <rect key={i} x={wx} y={310 + rnd(i + 40) * 30} width={5} height={4}
              fill="#6a5a2a" opacity={0.35} className="sky-twinkle" style={{ animationDelay: `${rnd(i + 50) * 6}s` }} />
          ))}

          {/* drifting clouds */}
          <g className="sky-cloud" style={{ animationDuration: '95s' }} opacity={0.07}>
            <ellipse cx={0} cy={110} rx={90} ry={16} fill="#ccc" />
            <ellipse cx={60} cy={100} rx={60} ry={13} fill="#ccc" />
          </g>
          <g className="sky-cloud" style={{ animationDuration: '140s', animationDelay: '-60s' }} opacity={0.05}>
            <ellipse cx={0} cy={190} rx={110} ry={18} fill="#ccc" />
            <ellipse cx={80} cy={180} rx={70} ry={14} fill="#ccc" />
          </g>

          {/* ground */}
          <rect x={0} y={GROUND} width={800} height={52} fill="#070709" />
          <line x1={0} y1={GROUND} x2={800} y2={GROUND} stroke="#1a1a20" strokeWidth={1} />

          {positions.map(({ div, x }, i) =>
            div.state === 'active' ? (
              <ActiveTower
                key={div.key} x={x} width={110}
                litFloors={Math.min(Math.floor(revenueOf(div) / div.floorValue), div.maxFloors)}
                maxFloors={div.maxFloors} label={div.label} revenue={revenueOf(div)}
              />
            ) : (
              <ConstructionSite key={div.key} x={x} label={div.label} seed={i * 17 + 5} />
            )
          )}
        </svg>
      </div>

      {/* Division ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {divisions.map(d => {
          const rev = revenueOf(d);
          const floors = Math.min(Math.floor(rev / d.floorValue), d.maxFloors);
          const towardNext = floors >= d.maxFloors ? 1 : (rev - floors * d.floorValue) / d.floorValue;
          const activeDiv = d.state === 'active';
          return (
            <div key={d.key} className="empire-card" style={{ borderColor: activeDiv ? 'rgba(212,175,55,0.25)' : '#161616' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: activeDiv ? '#D4AF37' : '#555' }}>
                  {activeDiv ? '● ' : '🏗 '}{d.label}
                </span>
                <span style={{ fontSize: 9, color: activeDiv ? '#00FF87' : '#444', letterSpacing: '0.08em', fontWeight: 700 }}>
                  {activeDiv ? 'OPERATIONAL' : 'PLANNED'}
                </span>
              </div>
              {activeDiv ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>{formatCurrency(rev)}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2, marginBottom: 10 }}>
                    {floors}/{d.maxFloors} floors lit · {formatCurrency(d.floorValue)} per floor
                  </div>
                  <div className="progress-track" style={{ height: 5 }}>
                    <div className="progress-fill" style={{ width: `${Math.min(towardNext * 100, 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#444', marginTop: 6 }}>
                    {floors >= d.maxFloors ? '🏆 TOWER COMPLETE' : `${formatCurrency(d.floorValue - (rev - floors * d.floorValue))} to floor ${floors + 1}`}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: '#444', lineHeight: 1.7 }}>
                  Dark site, crane standing by. Route revenue into this division to break ground.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '10px 14px', background: '#0a0a0a', borderRadius: 8, fontSize: 11, color: '#444', lineHeight: 1.6, border: '1px solid #111' }}>
        💡 Every {formatCurrency(2500)} of revenue lights another floor of the Digital tower · Future divisions rise from the construction sites when they start earning
      </div>
    </div>
  );
}
