import type { RoleDefinition } from '../../types/role.js';

export const HunterRole: RoleDefinition = {
  id: 'hunter',
  name: 'Hunter',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 2,
  description: 'Armed with a rifle. If eliminated by day or night, the Hunter can immediately fire a dying shot at any player.',
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
