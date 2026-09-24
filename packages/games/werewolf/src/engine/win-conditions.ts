import type { WerewolfPlayerState } from '../types/index.js';

export interface WinResult {
  winner: 'VILLAGE' | 'WEREWOLF' | 'NEUTRAL';
  reason: string;
}

export function checkWinConditions(players: WerewolfPlayerState[]): WinResult | null {
  const alivePlayers = players.filter((p) => p.isAlive && p.canPlay !== false);
  const aliveWerewolves = alivePlayers.filter((p) => p.team === 'WEREWOLF' || p.roleId === 'werewolf');
  const aliveVillagers = alivePlayers.filter((p) => p.team !== 'WEREWOLF' && p.roleId !== 'werewolf');

  // Condition 1: All Werewolves eliminated -> Village wins
  if (aliveWerewolves.length === 0) {
    return {
      winner: 'VILLAGE',
      reason: 'All werewolves have been eliminated! The village is peaceful once more.',
    };
  }

  // Condition 2: Werewolves equal or outnumber the living villagers -> Werewolves win
  if (aliveWerewolves.length >= aliveVillagers.length) {
    return {
      winner: 'WEREWOLF',
      reason: 'The werewolves have overrun the village and seized total control.',
    };
  }

  return null;
}
