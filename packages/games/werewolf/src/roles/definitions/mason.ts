import type { RoleDefinition } from '../../types/role.js';

export const MasonRole: RoleDefinition = {
  id: 'mason',
  name: 'Mason',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 3,
  description: 'Member of an ancient guild. Masons secretly know who the other masons are.',
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
