import type { RoleDefinition } from '../../types/role.js';

export const SeerRole: RoleDefinition = {
  id: 'seer',
  name: 'Seer',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 1,
  description: 'Inspects one player each night to divine whether their soul is Good or Evil.',
  nightConfig: {
    priority: 50,
    durationSeconds: 10,
    actionMode: 'INDIVIDUAL',
    actionType: 'INVESTIGATE',
    allowSkip: false,
  },
  audio: {
    wake: 'seer_wake',
    action: 'seer_action',
    sleep: 'seer_sleep',
  },
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
