import type { RoleDefinition } from '../../types/role.js';

export const AlphaWolfRole: RoleDefinition = {
  id: 'alpha_wolf',
  name: 'Alpha Wolf',
  category: 'WEREWOLF',
  alignment: 'EVIL',
  team: 'WEREWOLF',
  minCount: 0,
  maxCount: 1,
  description: 'The ferocious pack leader. Coordinates the werewolf hunt each night.',
  nightConfig: {
    priority: 10,
    durationSeconds: 20,
    actionMode: 'GROUP',
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
