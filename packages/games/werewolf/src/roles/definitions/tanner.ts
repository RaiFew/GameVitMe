import type { RoleDefinition } from '../../types/role.js';

export const TannerRole: RoleDefinition = {
  id: 'tanner',
  name: 'Tanner',
  category: 'NEUTRAL',
  alignment: 'NEUTRAL',
  team: 'NEUTRAL',
  minCount: 0,
  maxCount: 1,
  description: 'Hates his job and his life. If the Tanner is lynched by village vote, he instantly wins the game alone.',
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
