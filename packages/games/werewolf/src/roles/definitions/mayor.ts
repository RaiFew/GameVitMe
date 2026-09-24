import type { RoleDefinition } from '../../types/role.js';

export const MayorRole: RoleDefinition = {
  id: 'mayor',
  name: 'Mayor',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 1,
  description: 'The civic leader of the village. Their vote counts as 2 votes during daytime elimination trials.',
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
