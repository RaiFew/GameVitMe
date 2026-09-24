import type { SalemPlayerState } from '../types/index.js';

export interface WinResult {
  winner: 'TOWN' | 'WITCH' | 'NEUTRAL';
  reason: string;
}

export function checkWinConditions(players: SalemPlayerState[]): WinResult | null {
  const alivePlayers = players.filter((p) => p.isAlive && p.canPlay !== false);
  const aliveWitches = alivePlayers.filter((p) => p.team === 'WITCH' || p.roleId === 'witch');
  const alivePuritans = alivePlayers.filter((p) => p.team !== 'WITCH' && p.roleId !== 'witch');

  // Condition 1: All Witches eliminated -> Town wins
  if (aliveWitches.length === 0) {
    return {
      winner: 'TOWN',
      reason: 'All witches have been uncovered and banished! Salem is delivered from darkness.',
    };
  }

  // Condition 2: Witches equal or outnumber living Puritans -> Witches win
  if (aliveWitches.length >= alivePuritans.length) {
    return {
      winner: 'WITCH',
      reason: 'The witches have cast their shadow over Salem and overpowered the settlement.',
    };
  }

  return null;
}
