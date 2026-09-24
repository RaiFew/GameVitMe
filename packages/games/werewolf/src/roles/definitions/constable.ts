import type { RoleDefinition } from '../../types/role.js';

export const ConstableRole: RoleDefinition = {
  id: 'constable',
  name: 'Constable',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 1,
  description: 'Salem-style law enforcer who stands guard over a designated villager at night.',
  nightConfig: {
    priority: 40,
    durationSeconds: 15,
    actionMode: 'INDIVIDUAL',
    actionType: 'GUARD',
    allowSkip: true,
  },
  audio: {
    wake: 'constable_wake',
    action: 'constable_action',
    sleep: 'constable_sleep',
  },
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
