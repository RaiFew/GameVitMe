import type { RoleDefinition } from '../../types/index.js';

export const constableRole: RoleDefinition = {
  id: 'constable',
  name: 'Constable',
  category: 'TOWN',
  alignment: 'GOOD',
  team: 'TOWN',
  description: 'Bestow the town mallet upon one citizen each night, protecting them from witchcraft. Cannot protect the same person consecutively.',
  flavorText: 'Law and righteousness shall prevail in Salem.',
  minCount: 0,
  maxCount: 1,
  nightConfig: {
    actionType: 'PROTECT',
    actionMode: 'INDIVIDUAL',
    priority: 20,
    durationSeconds: 15,
    allowSkip: true,
    requiresTarget: true,
    canTargetSelf: true,
  },
  audio: {
    wake: 'constable_wake.mp3',
    action: 'constable_action.mp3',
    sleep: 'constable_sleep.mp3',
  },
  investigationResult: {
    type: 'ALIGNMENT_ONLY',
    revealedAlignment: 'GOOD',
  },
};
