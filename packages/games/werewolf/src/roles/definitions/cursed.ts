import type { RoleDefinition } from '../../types/role.js';

export const CursedRole: RoleDefinition = {
  id: 'cursed',
  name: 'Cursed',
  category: 'ADDITIONAL',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 1,
  description: 'Appears as a normal villager, but bears a secret dark blood curse: if bitten by werewolves, transforms into one.',
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
