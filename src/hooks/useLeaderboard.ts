/**
 * useLeaderboard — reads the leaderboard and connected player's data
 * from the PointsLeaderboard contract on Arc Testnet.
 *
 * The contract address is read from VITE_LEADERBOARD_ADDRESS in .env.
 * When not set, the hook is disabled and returns empty data.
 */

import { useReadContract, useReadContracts } from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { LEADERBOARD_ABI, LEADERBOARD_ADDRESS } from '../lib/contract'

export interface LeaderboardEntry {
  wallet: string
  username: string
  points: bigint
}

export interface MyPlayer {
  username: string
  points: bigint
  registered: boolean
}

export function useLeaderboard(address: string | undefined) {
  const enabled = Boolean(LEADERBOARD_ADDRESS)

  // Read the full leaderboard
  const {
    data: leaderboardRaw,
    isLoading: isLoadingLeaderboard,
    refetch: refetchLeaderboard,
  } = useReadContract({
    address: LEADERBOARD_ADDRESS as `0x${string}`,
    abi: LEADERBOARD_ABI,
    functionName: 'getLeaderboard',
    chainId: arcTestnet.id,
    query: { enabled, refetchInterval: 10_000 },
  })

  // Read the connected player's profile (only when address is known)
  const {
    data: playerRaw,
    refetch: refetchPlayer,
  } = useReadContracts({
    contracts: [
      {
        address: LEADERBOARD_ADDRESS,
        abi: LEADERBOARD_ABI,
        functionName: 'getPlayer',
        args: address ? [address as `0x${string}`] : undefined,
        chainId: arcTestnet.id,
      },
    ],
    query: { enabled: enabled && Boolean(address), refetchInterval: 10_000 },
  })

  const entries: LeaderboardEntry[] = Array.isArray(leaderboardRaw)
    ? (leaderboardRaw as Array<{ wallet: string; username: string; points: bigint }>).map(e => ({
        wallet: e.wallet,
        username: e.username,
        points: e.points,
      }))
    : []

  const rawPlayer = playerRaw?.[0]?.result

  const myPlayer: MyPlayer | undefined = rawPlayer
    ? { username: rawPlayer.username, points: rawPlayer.points, registered: rawPlayer.registered }
    : undefined

  function refetch() {
    void refetchLeaderboard()
    void refetchPlayer()
  }

  return { entries, myPlayer, isLoadingLeaderboard, refetch }
}
