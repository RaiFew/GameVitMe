/**
 * Calculates the default role distribution based on playing player count.
 * Formula as strictly defined in prompt:
 * werewolfCount = Math.max(1, Math.floor(playerCount / 3))
 * seerCount = 1
 * villagerCount = playerCount - werewolfCount - seerCount
 */
export function calculateDefaultRoleCounts(
  gameType: string | undefined,
  playingPlayerCount: number
): Record<string, number> {
  // Ensure minimum effective count of 4 players for defaults
  const effectiveCount = Math.max(4, playingPlayerCount);

  if (gameType === 'werewolf') {
    const werewolfCount = Math.max(1, Math.floor(effectiveCount / 3));
    const seerCount = 1;
    const villagerCount = Math.max(0, effectiveCount - werewolfCount - seerCount);

    return {
      werewolf: werewolfCount,
      seer: seerCount,
      villager: villagerCount,
    };
  }

  if (gameType === 'salem') {
    const witchCount = Math.max(1, Math.floor(effectiveCount / 3));
    const townCrierCount = 1;
    const puritanCount = Math.max(0, effectiveCount - witchCount - townCrierCount);

    return {
      witch: witchCount,
      town_crier: townCrierCount,
      puritan: puritanCount,
    };
  }

  return {};
}

/**
 * Updates room roleCounts if role configuration is not customized by host.
 */
export function updateRoomDefaultRolesIfUncustomized(room: {
  gameType?: string;
  hostId: string;
  players: { id: string }[];
  settings: {
    hostMode?: boolean;
    isRoleConfigurationCustomized?: boolean;
    roleCounts?: Record<string, number>;
    [key: string]: any;
  };
}): void {
  const isSocialDeduction = room.gameType === 'werewolf' || room.gameType === 'salem';
  if (!isSocialDeduction) return;

  if (room.settings.isRoleConfigurationCustomized) {
    return;
  }

  const isHostMode = room.settings.hostMode !== false;
  const playingCount = isHostMode
    ? room.players.filter((p) => p.id !== room.hostId).length
    : room.players.length;

  room.settings.roleCounts = calculateDefaultRoleCounts(room.gameType, playingCount);
}
