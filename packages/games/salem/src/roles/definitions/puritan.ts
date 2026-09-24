import type { RoleDefinition } from '../../types/index.js';

export const puritanRole: RoleDefinition = {
  id: 'puritan',
  name: 'Puritan',
  category: 'TOWN',
  alignment: 'GOOD',
  team: 'TOWN',
  description: 'A God-fearing citizen of Salem. Debate by day and cast accusations at the town tribunal.',
  flavorText: 'Faith is our armor; vigilance is our strength.',
  minCount: 0,
  maxCount: 12,
  audio: {
    wake: 'puritan_wake.mp3',
    action: 'puritan_action.mp3',
    sleep: 'puritan_sleep.mp3',
  },
  investigationResult: {
    type: 'ALIGNMENT_ONLY',
    revealedAlignment: 'GOOD',
  },
};
