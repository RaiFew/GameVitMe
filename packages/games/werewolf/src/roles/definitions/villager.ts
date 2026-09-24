import type { RoleDefinition } from '../../types/role.js';

export const VillagerRole: RoleDefinition = {
  id: 'villager',
  name: 'Villager',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 12,
  description: 'An innocent townsperson with no special night abilities. Your voice and vote during the day are your weapons.',
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
