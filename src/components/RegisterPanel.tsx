/**
 * RegisterPanel — lets the connected wallet register a username onchain.
 * Hidden once the wallet is already registered.
 */

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { UserCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { LEADERBOARD_ABI, LEADERBOARD_ADDRESS } from '../lib/contract'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface Props {
  address: string
  isRegistered: boolean
  onRegistered: () => void
}

// Validate username client-side before hitting the chain
function isValidUsername(u: string): boolean {
  if (u.length < 3 || u.length > 20) return false
  return /^[A-Za-z0-9_]+$/.test(u)
}

export function RegisterPanel({ isRegistered, onRegistered }: Props) {
  const [username, setUsername] = useState('')
  const isDeployed = Boolean(LEADERBOARD_ADDRESS)

  const {
    writeContract,
    data: hash,
    isPending,
    reset,
    error: writeError,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // When confirmed, notify parent and reset
  if (isSuccess) {
    const explorerUrl = hash ? buildTxExplorerUrl(arcTestnet.id, hash) : undefined
    toast.success('Username registered!', {
      description: explorerUrl ? 'View on explorer' : undefined,
      action: explorerUrl
        ? { label: 'View tx', onClick: () => window.open(explorerUrl, '_blank') }
        : undefined,
    })
    onRegistered()
    reset()
  }

  function handleRegister() {
    if (!LEADERBOARD_ADDRESS) return
    if (!isValidUsername(username)) return

    writeContract({
      address: LEADERBOARD_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'registerUsername',
      args: [username],
      chainId: arcTestnet.id,
    })
  }

  // Already registered — collapse the panel
  if (isRegistered) {
    return (
      <section
        className="flex items-center gap-3 p-4 rounded-2xl border"
        style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
      >
        <UserCheck size={18} style={{ color: 'var(--success)' }} className="flex-shrink-0" />
        <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>
          You are registered. You can only register once per wallet.
        </p>
      </section>
    )
  }

  const canSubmit = isDeployed && isValidUsername(username) && !isPending && !isConfirming
  const errorMsg = parseRegisterError(writeError)
  const isLoading = isPending || isConfirming

  return (
    <section
      className="rounded-2xl p-5 border"
      style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
        Register Username
      </p>

      {!isDeployed && (
        <p className="text-sm mb-3 p-3 rounded-xl" style={{ background: 'rgba(18,45,69,0.06)', color: 'var(--muted)' }}>
          Deploy the contract first, then set <span className="mono">VITE_LEADERBOARD_ADDRESS</span> in <span className="mono">.env</span>.
        </p>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="your_username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={20}
            disabled={isLoading || !isDeployed}
            className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition outline-none focus:ring-2"
            style={{
              background: 'var(--surface-muted)',
              borderColor: 'var(--border)',
              color: 'var(--ink)',
              opacity: isLoading || !isDeployed ? 0.6 : 1,
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--focus)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <div className="flex justify-between mt-1.5 px-1">
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              3–20 chars · letters, numbers, underscore
            </p>
            <p className="text-xs tabular-nums" style={{ color: username.length > 18 ? 'var(--danger)' : 'var(--subtle)' }}>
              {username.length}/20
            </p>
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
          style={{
            background: canSubmit ? 'var(--accent)' : 'var(--surface-muted)',
            color: canSubmit ? '#fff' : 'var(--subtle)',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
          {isPending ? 'Confirm…' : isConfirming ? 'Onchain…' : 'Register'}
        </button>
      </div>

      {errorMsg && (
        <p className="text-xs mt-2 px-1" style={{ color: 'var(--danger)' }}>
          {errorMsg}
        </p>
      )}
    </section>
  )
}

function parseRegisterError(error: Error | null | undefined): string | null {
  if (!error) return null
  const msg = error.message?.toLowerCase() ?? ''
  if (msg.includes('alreadyregistered')) return 'This wallet is already registered.'
  if (msg.includes('usernametaken')) return 'That username is taken. Try another.'
  if (msg.includes('usernameinvalid')) return 'Username must be 3–20 alphanumeric/underscore characters.'
  if (msg.includes('user rejected') || msg.includes('user denied')) return null // user cancelled — not an error
  if (msg.includes('reverted')) return 'Transaction failed. Check your username and try again.'
  return 'Something went wrong. Please try again.'
}
