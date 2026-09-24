import type { RoleDefinition } from '../../types/role.js';

export const MinionRole: RoleDefinition = {
  id: 'minion',
  name: 'Minion',
  category: 'WEREWOLF',
  alignment: 'EVIL',
  team: 'WEREWOLF',
  minCount: 0,
  maxCount: 2,
  description: 'A devoted mortal minion who knows the identities of the werewolves and helps them win without waking as a wolf.',
  investigationResult: {
    revealedAlignment: 'EVIL',
  },
};
