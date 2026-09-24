import type { RoleDefinition } from '../../types/role.js';

export const WerewolfRole: RoleDefinition = {
  id: 'werewolf',
  name: 'Werewolf',
  category: 'WEREWOLF',
  alignment: 'EVIL',
  team: 'WEREWOLF',
  minCount: 1,
  maxCount: 3,
  description: 'Hunt and eliminate a villager each night with your pack.',
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
