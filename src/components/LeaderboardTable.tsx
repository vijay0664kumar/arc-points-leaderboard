/**
 * LeaderboardTable — shows the current top-100 leaderboard.
 * Rank 1 gets a gold crown, 2 silver, 3 bronze.
 */

import { Trophy, Loader2 } from 'lucide-react'
import { LEADERBOARD_ADDRESS } from '../lib/contract'
import type { LeaderboardEntry } from '../hooks/useLeaderboard'

const MEDAL_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  2: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
  3: { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
}

interface Props {
  entries: LeaderboardEntry[]
  isLoading: boolean
  myAddress?: string
}

export function LeaderboardTable({ entries, isLoading, myAddress }: Props) {
  const isDeployed = Boolean(LEADERBOARD_ADDRESS)

  return (
    <section
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Trophy size={17} style={{ color: 'var(--accent)' }} />
          <span className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
            Leaderboard
          </span>
          {entries.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums"
              style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--muted)' }}
            >
              {entries.length}
            </span>
          )}
        </div>
        {isLoading && <Loader2 size={15} className="animate-spin" style={{ color: 'var(--subtle)' }} />}
      </div>

      {/* Not deployed state */}
      {!isDeployed && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>Contract not deployed yet</p>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Deploy and set <span className="mono">VITE_LEADERBOARD_ADDRESS</span> to see live data.
          </p>
        </div>
      )}

      {/* Empty state */}
      {isDeployed && !isLoading && entries.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>No players yet</p>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Be the first to register a username!</p>
        </div>
      )}

      {/* Table */}
      {entries.length > 0 && (
        <>
          {/* Column headers */}
          <div
            className="grid grid-cols-[2.5rem_1fr_auto] gap-3 px-5 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--subtle)', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}
          >
            <span>#</span>
            <span>Player</span>
            <span className="text-right">Points</span>
          </div>

          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {entries.map((entry, i) => {
              const rank = i + 1
              const medal = MEDAL_COLORS[rank]
              const isMe = myAddress?.toLowerCase() === entry.wallet.toLowerCase()

              return (
                <li
                  key={entry.wallet}
                  className="grid grid-cols-[2.5rem_1fr_auto] gap-3 items-center px-5 py-3 transition"
                  style={{
                    background: isMe ? 'rgba(18,45,69,0.04)' : 'transparent',
                  }}
                >
                  {/* Rank */}
                  {medal ? (
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tabular-nums"
                      style={{ background: medal.bg, color: medal.text, border: `1.5px solid ${medal.border}` }}
                    >
                      {rank}
                    </span>
                  ) : (
                    <span
                      className="text-sm tabular-nums font-medium text-center"
                      style={{ color: 'var(--subtle)' }}
                    >
                      {rank}
                    </span>
                  )}

                  {/* Player info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>
                        {entry.username}
                      </span>
                      {isMe && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px' }}
                        >
                          You
                        </span>
                      )}
                    </div>
                    <span className="mono text-xs truncate block" style={{ color: 'var(--subtle)' }}>
                      {entry.wallet.slice(0, 6)}…{entry.wallet.slice(-4)}
                    </span>
                  </div>

                  {/* Points */}
                  <span className="display font-bold tabular-nums text-base" style={{ color: 'var(--ink)' }}>
                    {entry.points.toString()}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
