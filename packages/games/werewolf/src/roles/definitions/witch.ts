import type { RoleDefinition } from '../../types/role.js';

export const WitchRole: RoleDefinition = {
  id: 'witch',
  name: 'Witch',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 1,
  description: 'Possesses two one-time potions: a Life Potion to save the night victim, and a Death Potion to eliminate anyone.',
  nightConfig: {
    priority: 20,
    durationSeconds: 20,
    actionMode: 'INDIVIDUAL',
    actionType: 'HEAL_POISON',
    allowSkip: true,
  },
  audio: {
    wake: 'witch_wake',
    action: 'witch_action',
    sleep: 'witch_sleep',
  },
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
