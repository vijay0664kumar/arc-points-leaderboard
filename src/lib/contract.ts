/**
 * Contract address and ABI for PointsLeaderboard.
 *
 * After you deploy, set VITE_LEADERBOARD_ADDRESS in .env:
 *   VITE_LEADERBOARD_ADDRESS=0xYourDeployedAddress
 *
 * The app will read in demo mode (leaderboard shows "Not deployed yet") until
 * the address is set.
 */

export const LEADERBOARD_ADDRESS = import.meta.env.VITE_LEADERBOARD_ADDRESS as
  | `0x${string}`
  | undefined

export const LEADERBOARD_ABI = [
  // ── Read ──────────────────────────────────────────────────────────────────
  {
    name: 'getLeaderboard',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'wallet', type: 'address' },
          { name: 'username', type: 'string' },
          { name: 'points', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getPlayer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'username', type: 'string' },
          { name: 'points', type: 'uint256' },
          { name: 'registered', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'nextClaimTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  // ── Write ─────────────────────────────────────────────────────────────────
  {
    name: 'claimDailyPoints',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'registerUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'username', type: 'string' }],
    outputs: [],
  },
  {
    name: 'awardPoints',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  // ── Events ────────────────────────────────────────────────────────────────
  {
    name: 'PlayerRegistered',
    type: 'event',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'username', type: 'string', indexed: false },
    ],
  },
  {
    name: 'PointsAwarded',
    type: 'event',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newTotal', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PointsClaimed',
    type: 'event',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newTotal', type: 'uint256', indexed: false },
    ],
  },
  // ── Errors ────────────────────────────────────────────────────────────────
  { name: 'UsernameTaken', type: 'error', inputs: [] },
  { name: 'UsernameInvalid', type: 'error', inputs: [] },
  { name: 'AlreadyRegistered', type: 'error', inputs: [] },
  { name: 'NotRegistered', type: 'error', inputs: [] },
  { name: 'NotOwner', type: 'error', inputs: [] },
  {
    name: 'ClaimCooldownActive',
    type: 'error',
    inputs: [{ name: 'availableAt', type: 'uint256' }],
  },
] as const
