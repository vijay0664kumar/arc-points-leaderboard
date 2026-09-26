/**
 * AwardPointsPanel — lets the contract owner award test points to any registered player.
 * Non-owners who try will get a NotOwner revert, which is shown as a friendly message.
 *
 * This is purely for testing — no real money is involved.
 */

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { Zap, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { LEADERBOARD_ABI, LEADERBOARD_ADDRESS } from '../lib/contract'
import { buildTxExplorerUrl } from '@/onchain-facts'
import type { LeaderboardEntry } from '../hooks/useLeaderboard'

interface Props {
  entries: LeaderboardEntry[]
  onAwarded: () => void
}

const QUICK_AMOUNTS = [10, 50, 100, 500]

export function AwardPointsPanel({ entries, onAwarded }: Props) {
  const { address } = useAccount()
  const [selectedWallet, setSelectedWallet] = useState('')
  const [amount, setAmount] = useState('')
  const isDeployed = Boolean(LEADERBOARD_ADDRESS)

  // Read the contract owner to show a helpful note
  const { data: ownerAddress } = useReadContract({
    address: LEADERBOARD_ADDRESS as `0x${string}`,
    abi: LEADERBOARD_ABI,
    functionName: 'owner',
    chainId: arcTestnet.id,
    query: { enabled: isDeployed },
  })

  const isOwner = address && ownerAddress
    ? address.toLowerCase() === (ownerAddress as string).toLowerCase()
    : false

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
    toast.success('Points awarded!', {
      description: explorerUrl ? 'View on explorer' : undefined,
      action: explorerUrl
        ? { label: 'View tx', onClick: () => window.open(explorerUrl, '_blank') }
        : undefined,
    })
    onAwarded()
    reset()
  }

  function handleAward() {
    if (!LEADERBOARD_ADDRESS || !selectedWallet || !amount) return
    const parsed = parseInt(amount, 10)
    if (isNaN(parsed) || parsed <= 0) return

    writeContract({
      address: LEADERBOARD_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'awardPoints',
      args: [selectedWallet as `0x${string}`, BigInt(parsed)],
      chainId: arcTestnet.id,
    })
  }

  const isLoading = isPending || isConfirming
  const parsedAmount = parseInt(amount, 10)
  const canSubmit =
    isDeployed &&
    Boolean(selectedWallet) &&
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    !isLoading

  const errorMsg = parseAwardError(writeError)
  const selectedEntry = entries.find(e => e.wallet.toLowerCase() === selectedWallet.toLowerCase())

  return (
    <section
      className="rounded-2xl p-5 border"
      style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
          Award Test Points
        </p>
        <span
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(18,45,69,0.07)', color: 'var(--muted)' }}
        >
          <Zap size={11} />
          No real value
        </span>
      </div>

      {!isDeployed && (
        <p className="text-sm mb-3 p-3 rounded-xl" style={{ background: 'rgba(18,45,69,0.06)', color: 'var(--muted)' }}>
          Deploy the contract first, then set <span className="mono">VITE_LEADERBOARD_ADDRESS</span> in <span className="mono">.env</span>.
        </p>
      )}

      {isDeployed && !isOwner && (
        <p className="text-xs mb-3 p-3 rounded-xl" style={{ background: 'rgba(18,45,69,0.05)', color: 'var(--muted)' }}>
          Only the contract owner can award points. Connect the deployer wallet to use this.
        </p>
      )}

      <div className="space-y-3">
        {/* Player selector */}
        <div className="relative">
          <select
            value={selectedWallet}
            onChange={e => setSelectedWallet(e.target.value)}
            disabled={isLoading || !isDeployed || entries.length === 0}
            className="w-full appearance-none px-4 py-2.5 rounded-xl border text-sm font-medium transition outline-none pr-10"
            style={{
              background: 'var(--surface-muted)',
              borderColor: 'var(--border)',
              color: selectedWallet ? 'var(--ink)' : 'var(--subtle)',
              opacity: isLoading || !isDeployed ? 0.6 : 1,
              cursor: isLoading || !isDeployed ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">
              {entries.length === 0 ? 'No players registered yet' : 'Select a player…'}
            </option>
            {entries.map(e => (
              <option key={e.wallet} value={e.wallet}>
                {e.username} ({e.wallet.slice(0, 6)}…{e.wallet.slice(-4)}) — {e.points.toString()} pts
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--subtle)' }}
          />
        </div>

        {/* Amount row */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="number"
            min={1}
            placeholder="Points"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={isLoading || !isDeployed}
            className="w-28 px-4 py-2.5 rounded-xl border text-sm font-medium tabular-nums transition outline-none"
            style={{
              background: 'var(--surface-muted)',
              borderColor: 'var(--border)',
              color: 'var(--ink)',
              opacity: isLoading || !isDeployed ? 0.6 : 1,
            }}
          />
          {/* Quick-pick chips */}
          {QUICK_AMOUNTS.map(n => (
            <button
              key={n}
              onClick={() => setAmount(String(n))}
              disabled={isLoading || !isDeployed}
              className="px-3 py-2 rounded-xl text-xs font-semibold border transition"
              style={{
                background: amount === String(n) ? 'var(--accent)' : 'var(--surface-muted)',
                color: amount === String(n) ? '#fff' : 'var(--ink-2)',
                borderColor: amount === String(n) ? 'var(--accent)' : 'var(--border)',
                opacity: isLoading || !isDeployed ? 0.6 : 1,
              }}
            >
              +{n}
            </button>
          ))}
        </div>

        {/* Preview row */}
        {selectedEntry && parsedAmount > 0 && !isNaN(parsedAmount) && (
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
            style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
          >
            <span>
              Awarding <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{parsedAmount}</span> pts to{' '}
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{selectedEntry.username}</span>
            </span>
            <span className="tabular-nums">
              {selectedEntry.points.toString()} → {(selectedEntry.points + BigInt(parsedAmount)).toString()} pts
            </span>
          </div>
        )}

        <button
          onClick={handleAward}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition"
          style={{
            background: canSubmit ? 'var(--accent)' : 'var(--surface-muted)',
            color: canSubmit ? '#fff' : 'var(--subtle)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {isPending ? 'Confirm in wallet…' : isConfirming ? 'Onchain…' : 'Award Points'}
        </button>
      </div>

      {errorMsg && (
        <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>
          {errorMsg}
        </p>
      )}
    </section>
  )
}

function parseAwardError(error: Error | null | undefined): string | null {
  if (!error) return null
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('notowner')) return 'Only the contract owner can award points.'
  if (msg.includes('notregistered')) return 'That player is not registered.'
  if (msg.includes('user rejected') || msg.includes('user denied')) return null
  if (msg.includes('reverted')) return 'Transaction failed. Are you the contract owner?'
  return 'Something went wrong. Please try again.'
}
