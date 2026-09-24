import type { RoleDefinition } from '../../types/role.js';

export const SorcererRole: RoleDefinition = {
  id: 'sorcerer',
  name: 'Sorcerer',
  category: 'WEREWOLF',
  alignment: 'EVIL',
  team: 'WEREWOLF',
  minCount: 0,
  maxCount: 1,
  description: 'A practitioner of dark arts who seeks out the Seer and werewolves to align the night in the wolves favor.',
  nightConfig: {
    priority: 55,
    durationSeconds: 15,
    actionMode: 'INDIVIDUAL',
    actionType: 'INVESTIGATE',
    allowSkip: true,
  },
  audio: {
    wake: 'seer_wake',
    action: 'seer_action',
    sleep: 'seer_sleep',
  },
  investigationResult: {
    revealedAlignment: 'EVIL',
  },
};
