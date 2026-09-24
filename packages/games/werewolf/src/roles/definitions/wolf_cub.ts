import type { RoleDefinition } from '../../types/role.js';

export const WolfCubRole: RoleDefinition = {
  id: 'wolf_cub',
  name: 'Wolf Cub',
  category: 'WEREWOLF',
  alignment: 'EVIL',
  team: 'WEREWOLF',
  minCount: 0,
  maxCount: 1,
  description: 'Young and protected by the pack. If the cub is slain, the werewolves seek bitter vengeance.',
  nightConfig: {
    priority: 10,
    durationSeconds: 20,
    actionMode: 'GROUP',
    actionType: 'KILL',
    allowSkip: false,
  },
  audio: {
    wake: 'werewolf_wake',
    action: 'werewolf_action',
    sleep: 'werewolf_sleep',
  },
  investigationResult: {
    revealedAlignment: 'EVIL',
  },
};
