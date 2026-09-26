/**
 * ClaimPointsButton — lets any registered player claim 10 test points once every 24 hours.
 * Shows a live countdown until the next claim is available.
 * No real monetary value — test points only.
 */

import { useEffect, useState } from 'react'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { Gift, Loader2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { LEADERBOARD_ABI, LEADERBOARD_ADDRESS } from '../lib/contract'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface Props {
  address: string
  isRegistered: boolean
  onClaimed: () => void
}

export function ClaimPointsButton({ address, isRegistered, onClaimed }: Props) {
  const isDeployed = Boolean(LEADERBOARD_ADDRESS)

  // Read the next-claim timestamp from the contract
  const { data: nextClaimRaw, refetch: refetchNextClaim } = useReadContract({
    address: LEADERBOARD_ADDRESS as `0x${string}`,
    abi: LEADERBOARD_ABI,
    functionName: 'nextClaimTime',
    args: [address as `0x${string}`],
    chainId: arcTestnet.id,
    query: { enabled: isDeployed && isRegistered, refetchInterval: 15_000 },
  })

  // nextClaimTime returns 0 if claimable now, otherwise the future Unix timestamp
  const nextClaimTimestamp = nextClaimRaw !== undefined ? Number(nextClaimRaw) : null
  const canClaimNow = nextClaimTimestamp === 0

  // Live countdown timer — tick every second while cooldown is active
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    if (!nextClaimTimestamp || canClaimNow) return
    const id = setInterval(() => {
      const t = Math.floor(Date.now() / 1000)
      setNow(t)
      if (t >= nextClaimTimestamp) void refetchNextClaim()
    }, 1000)
    return () => clearInterval(id)
  }, [nextClaimTimestamp, canClaimNow, refetchNextClaim])

  function formatCountdown(target: number): string {
    const diff = Math.max(0, target - now)
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    return `${h > 0 ? `${h}h ` : ''}${m > 0 || h > 0 ? `${String(m).padStart(2, '0')}m ` : ''}${String(s).padStart(2, '0')}s`
  }

  const countdown = nextClaimTimestamp && !canClaimNow ? formatCountdown(nextClaimTimestamp) : ''

  const {
    writeContract,
    data: hash,
    isPending,
    reset,
    error: writeError,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (isSuccess) {
    const explorerUrl = hash ? buildTxExplorerUrl(arcTestnet.id, hash) : undefined
    toast.success('10 test points claimed!', {
      description: 'These are testnet points with no real value.',
      action: explorerUrl
        ? { label: 'View tx', onClick: () => window.open(explorerUrl, '_blank') }
        : undefined,
    })
    void refetchNextClaim()
    onClaimed()
    reset()
  }

  function handleClaim() {
    if (!LEADERBOARD_ADDRESS || !canClaimNow) return
    writeContract({
      address: LEADERBOARD_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'claimDailyPoints',
      chainId: arcTestnet.id,
    })
  }

  const isLoading = isPending || isConfirming
  const errorMsg = parseClaimError(writeError)

  // Not registered — hide entirely
  if (!isRegistered) return null

  return (
    <section
      className="rounded-2xl p-5 border"
      style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}
        >
          Daily Test Points
        </p>
        <span
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(18,45,69,0.07)', color: 'var(--muted)' }}
        >
          <Gift size={11} />
          No real value
        </span>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: 'var(--surface-muted)' }}
        >
          {canClaimNow ? (
            <>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: 'var(--success)' }}
              />
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                Ready to claim
              </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                +10 pts
              </span>
            </>
          ) : (
            <>
              <Clock size={14} className="flex-shrink-0" style={{ color: 'var(--subtle)' }} />
              <span className="text-sm" style={{ color: 'var(--muted)' }}>
                Next claim in
              </span>
              <span
                className="mono text-sm font-semibold tabular-nums"
                style={{ color: 'var(--ink)' }}
              >
                {countdown || '…'}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={!canClaimNow || isLoading || !isDeployed}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition"
        style={{
          background: canClaimNow && !isLoading ? 'var(--accent)' : 'var(--surface-muted)',
          color: canClaimNow && !isLoading ? '#fff' : 'var(--subtle)',
          cursor: canClaimNow && !isLoading && isDeployed ? 'pointer' : 'not-allowed',
        }}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Gift size={14} />
        )}
        {isPending
          ? 'Confirm in wallet…'
          : isConfirming
          ? 'Onchain…'
          : canClaimNow
          ? 'Claim 10 Test Points'
          : 'Come back later'}
      </button>

      <p className="text-xs text-center mt-2" style={{ color: 'var(--subtle)' }}>
        Testnet only · resets every 24 hours · no monetary value
      </p>

      {errorMsg && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--danger)' }}>
          {errorMsg}
        </p>
      )}
    </section>
  )
}

function parseClaimError(error: Error | null | undefined): string | null {
  if (!error) return null
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('claimcooldownactive')) return 'Cooldown still active. Check the timer above.'
  if (msg.includes('notregistered')) return 'Register a username first.'
  if (msg.includes('user rejected') || msg.includes('user denied')) return null
  if (msg.includes('reverted')) return 'Transaction failed. Please try again.'
  return 'Something went wrong. Please try again.'
}
