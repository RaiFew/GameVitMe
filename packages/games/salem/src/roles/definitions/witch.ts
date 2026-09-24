import type { RoleDefinition } from '../../types/index.js';

export const witchRole: RoleDefinition = {
  id: 'witch',
  name: 'Witch',
  category: 'WITCH',
  alignment: 'EVIL',
  team: 'WITCH',
  description: 'Conspire with fellow coven witches at night to curse an innocent citizen.',
  flavorText: 'By the prick of my thumbs, something wicked this way comes.',
  minCount: 1,
  maxCount: 3,
  nightConfig: {
    actionType: 'GROUP_TARGET',
    actionMode: 'GROUP',
    priority: 10,
    durationSeconds: 20,
    allowSkip: false,
    requiresTarget: true,
    canTargetSelf: false,
  },
  audio: {
    wake: 'witch_wake.mp3',
    action: 'witch_action.mp3',
    sleep: 'witch_sleep.mp3',
  },
  investigationResult: {
    type: 'ALIGNMENT_ONLY',
    revealedAlignment: 'EVIL',
  },
};
