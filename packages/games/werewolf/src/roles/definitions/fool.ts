import type { RoleDefinition } from '../../types/role.js';

export const FoolRole: RoleDefinition = {
  id: 'fool',
  name: 'Fool',
  category: 'NEUTRAL',
  alignment: 'NEUTRAL',
  team: 'NEUTRAL',
  minCount: 0,
  maxCount: 1,
  description: 'A village eccentric who believes they are the Seer, or who tricks the town into voting them off.',
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
