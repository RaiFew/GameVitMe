import type { RoleDefinition } from '../../types/role.js';

export const DefenderRole: RoleDefinition = {
  id: 'defender',
  name: 'Defender',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 1,
  description: 'Selects one player each night to protect from mortal werewolf attacks.',
  nightConfig: {
    priority: 30,
    durationSeconds: 15,
    actionMode: 'INDIVIDUAL',
    actionType: 'PROTECT',
    allowSkip: false,
  },
  audio: {
    wake: 'defender_wake',
    action: 'defender_action',
    sleep: 'defender_sleep',
  },
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
