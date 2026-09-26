/**
 * LeaderboardApp — main UI shell
 * Composes Header, RegisterPanel, Leaderboard, and AwardPoints panels.
 */

import { useAccount, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { arcTestnet } from 'viem/chains'
import { Trophy, Zap, AlertTriangle } from 'lucide-react'
import { RegisterPanel } from './RegisterPanel'
import { ClaimPointsButton } from './ClaimPointsButton'
import { LeaderboardTable } from './LeaderboardTable'
import { AwardPointsPanel } from './AwardPointsPanel'
import { useLeaderboard } from '../hooks/useLeaderboard'

export function LeaderboardApp() {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isWrongChain = isConnected && chainId !== arcTestnet.id

  const {
    entries,
    myPlayer,
    isLoadingLeaderboard,
    refetch,
  } = useLeaderboard(address)

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy size={20} style={{ color: 'var(--accent)' }} />
            <span className="display font-semibold text-base tracking-tight" style={{ color: 'var(--ink)' }}>
              Arc Points
            </span>
            {/* Arc Testnet badge */}
            <span
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums"
              style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              Arc Testnet
            </span>
          </div>
          <ConnectKitButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Wrong chain banner */}
        {isWrongChain && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl border"
            style={{ background: 'rgba(186,43,76,0.06)', borderColor: 'rgba(186,43,76,0.25)', color: 'var(--danger)' }}
          >
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium">
              Wrong network. This app runs on Arc Testnet.
            </span>
            <button
              onClick={() => switchChain({ chainId: arcTestnet.id })}
              disabled={isSwitching}
              className="ml-auto text-sm font-semibold px-3 py-1 rounded-lg transition"
              style={{ background: 'var(--danger)', color: '#fff', opacity: isSwitching ? 0.6 : 1 }}
            >
              {isSwitching ? 'Switching…' : 'Switch'}
            </button>
          </div>
        )}

        {/* Hero — leaderboard intro */}
        <section
          className="rounded-2xl p-5 border"
          style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              <Trophy size={22} color="#fff" />
            </div>
            <div>
              <h1 className="display font-semibold text-xl mb-1" style={{ color: 'var(--ink)' }}>
                Onchain Points Leaderboard
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Register your username, earn test points, and climb the ranks — entirely onchain on Arc Testnet. No real money involved.
              </p>
              {/* Arc Testnet pill visible on mobile */}
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Arc Testnet · Chain {arcTestnet.id}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
                >
                  <Zap size={11} />
                  Test points only
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* My status card (when connected) */}
        {isConnected && !isWrongChain && (
          <MyStatusCard myPlayer={myPlayer} address={address!} onRefresh={refetch} />
        )}

        {/* Register panel */}
        {isConnected && !isWrongChain && (
          <RegisterPanel
            address={address!}
            isRegistered={!!myPlayer?.registered}
            onRegistered={refetch}
          />
        )}

        {/* Daily claim — visible to registered players only */}
        {isConnected && !isWrongChain && (
          <ClaimPointsButton
            address={address!}
            isRegistered={!!myPlayer?.registered}
            onClaimed={refetch}
          />
        )}

        {/* Award points panel (always visible — owner check happens in contract) */}
        {isConnected && !isWrongChain && (
          <AwardPointsPanel
            entries={entries}
            onAwarded={refetch}
          />
        )}

        {/* Leaderboard */}
        <LeaderboardTable entries={entries} isLoading={isLoadingLeaderboard} myAddress={address} />

        {/* How it works */}
        <HowItWorks />
      </main>
    </div>
  )
}

// ─── My status card ──────────────────────────────────────────────────────────

interface MyStatusCardProps {
  myPlayer: { username: string; points: bigint; registered: boolean } | undefined
  address: string
  onRefresh: () => void
}

function MyStatusCard({ myPlayer, address }: MyStatusCardProps) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`

  return (
    <section
      className="rounded-2xl p-4 border"
      style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
        My Account
      </p>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          {myPlayer?.registered ? (
            <>
              <p className="display font-semibold text-lg" style={{ color: 'var(--ink)' }}>
                {myPlayer.username}
              </p>
              <p className="mono text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{short}</p>
            </>
          ) : (
            <>
              <p className="mono text-sm font-medium" style={{ color: 'var(--ink)' }}>{short}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>Not registered yet</p>
            </>
          )}
        </div>
        {myPlayer?.registered && (
          <div className="text-right">
            <p className="display font-bold text-3xl tabular-nums" style={{ color: 'var(--accent)' }}>
              {myPlayer.points.toString()}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>pts</p>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── How it works ────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { n: '1', title: 'Connect', body: 'Connect your wallet using the button in the top right.' },
    { n: '2', title: 'Register', body: 'Pick a username (3–20 chars). Each wallet registers once.' },
    { n: '3', title: 'Claim daily points', body: 'Once registered, hit "Claim 10 Test Points" — resets every 24 hours. No real value.' },
    { n: '4', title: 'Climb the board', body: 'Points are stored onchain and the leaderboard updates live.' },
  ]

  return (
    <section
      className="rounded-2xl p-5 border"
      style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
        How it works
      </p>
      <ol className="space-y-3">
        {steps.map(s => (
          <li key={s.n} className="flex items-start gap-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {s.n}
            </span>
            <div>
              <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{s.title} </span>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>{s.body}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
