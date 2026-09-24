import type { RoleDefinition } from '../../types/role.js';

export const SerialKillerRole: RoleDefinition = {
  id: 'serial_killer',
  name: 'Serial Killer',
  category: 'NEUTRAL',
  alignment: 'EVIL',
  team: 'NEUTRAL',
  minCount: 0,
  maxCount: 1,
  description: 'A solitary nocturnal predator who murders one player each night and wins by remaining the sole survivor.',
  nightConfig: {
    priority: 15,
    durationSeconds: 15,
    actionMode: 'INDIVIDUAL',
    actionType: 'KILL',
    allowSkip: false,
  },
  audio: {
    wake: 'werewolf_wake',
    action: 'werewolf_action',
    sleep: 'werewolf_sleep',
  },
  investigationResult: {
    revealedAlignment: 'EVIL',
  },
};
