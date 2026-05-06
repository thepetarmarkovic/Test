import React, { useState } from 'react';
import {
  LayoutDashboard, Flame, DollarSign, Moon, BookOpen,
  Target, Trophy, Timer, ChevronLeft, ChevronRight, Zap,
  Activity, TrendingUp
} from 'lucide-react';
import type { Page } from '../types';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
  accent?: string;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Command Center', icon: <LayoutDashboard size={18} /> },
  { id: 'habits', label: 'Disciplines', icon: <Flame size={18} />, accent: '#FF6B35' },
  { id: 'earnings', label: 'Earnings', icon: <DollarSign size={18} />, accent: '#00FF87' },
  { id: 'finance', label: 'Wealth Matrix', icon: <TrendingUp size={18} />, accent: '#D4AF37' },
  { id: 'sleep', label: 'Sleep Lab', icon: <Moon size={18} />, accent: '#7B61FF' },
  { id: 'journal', label: 'Intel Log', icon: <BookOpen size={18} /> },
  { id: 'goals', label: 'Mission Goals', icon: <Target size={18} /> },
  { id: 'competition', label: 'Arena', icon: <Trophy size={18} />, accent: '#D4AF37' },
  { id: 'pomodoro', label: 'Focus Protocol', icon: <Timer size={18} />, accent: '#00D4FF' },
];

interface Props {
  currentPage: Page;
  onNavigate: (p: Page) => void;
  children: React.ReactNode;
  userName: string;
}

export default function Layout({ currentPage, onNavigate, children, userName }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#050505' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? 64 : 240,
          background: '#080808',
          borderRight: '1px solid #1a1a1a',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: collapsed ? '20px 16px' : '24px 20px 20px',
            borderBottom: '1px solid #1a1a1a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #D4AF37 0%, #C9A84C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 16px rgba(212,175,55,0.4)',
              }}
            >
              <Zap size={16} color="#000" fill="#000" />
            </div>
            {!collapsed && (
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  EMPIRE OS
                </div>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.1em', fontWeight: 600 }}>
                  COMMAND CENTER
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        {!collapsed && (
          <div
            style={{
              padding: '10px 20px',
              borderBottom: '1px solid #111',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>
              {dateStr}
            </div>
            <div style={{ fontSize: 11, color: '#D4AF37', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              {timeStr}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {NAV.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: collapsed ? '12px 14px' : '11px 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: active
                    ? 'linear-gradient(90deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)'
                    : 'transparent',
                  borderLeft: active ? '2px solid #D4AF37' : '2px solid transparent',
                  color: active ? '#D4AF37' : '#555',
                  transition: 'all 0.15s ease',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  position: 'relative',
                }}
                title={collapsed ? item.label : undefined}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = '#999';
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = '#555';
                }}
              >
                <span style={{ flexShrink: 0, color: active ? item.accent || '#D4AF37' : 'inherit' }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #111' }}>
          {!collapsed && (
            <div
              style={{
                padding: '10px 14px',
                background: '#0d0d0d',
                borderRadius: 8,
                marginBottom: 8,
                border: '1px solid #1a1a1a',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #D4AF37, #C9A84C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#000',
                  }}
                >
                  {userName.charAt(0).toUpperCase() || 'X'}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0' }}>{userName || 'OPERATOR'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="status-dot status-dot-success" />
                    <span style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em' }}>SYSTEM ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '8px',
              borderRadius: 8,
              border: '1px solid #1a1a1a',
              background: 'transparent',
              color: '#444',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#050505',
          position: 'relative',
        }}
        className="dot-bg"
      >
        {/* Top bar */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'rgba(5,5,5,0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid #111',
            padding: '10px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="status-dot animate-blink" style={{ background: '#D4AF37' }} />
            <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>
              EMPIRE OS v1.0 — ALL SYSTEMS OPERATIONAL
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={12} color="#555" />
              <span style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: '32px', maxWidth: 1280, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
