import type { RoleDefinition } from '../../types/index.js';

export const townCrierRole: RoleDefinition = {
  id: 'town_crier',
  name: 'Town Crier',
  category: 'TOWN',
  alignment: 'GOOD',
  team: 'TOWN',
  description: 'Investigate one suspect during the night to discover if they are Puritan (GOOD) or Witch (EVIL).',
  flavorText: 'Hear ye, hear ye! Truth shall be brought into the light.',
  minCount: 0,
  maxCount: 1,
  nightConfig: {
    actionType: 'INVESTIGATE',
    actionMode: 'INDIVIDUAL',
    priority: 30,
    durationSeconds: 12,
    allowSkip: false,
    requiresTarget: true,
    canTargetSelf: false,
  },
  audio: {
    wake: 'town_crier_wake.mp3',
    action: 'town_crier_action.mp3',
    sleep: 'town_crier_sleep.mp3',
  },
  investigationResult: {
    type: 'ALIGNMENT_ONLY',
    revealedAlignment: 'GOOD',
  },
};
