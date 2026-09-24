import type { RoleDefinition } from '../../types/index.js';

export const doctorRole: RoleDefinition = {
  id: 'doctor',
  name: 'Doctor',
  category: 'TOWN',
  alignment: 'GOOD',
  team: 'TOWN',
  description: 'Carries 1 Life Salve to cure a cursed victim and 1 Hemlock Draught to eliminate a suspect.',
  flavorText: 'A remedy for life, or a dose for eternal silence.',
  minCount: 0,
  maxCount: 1,
  nightConfig: {
    actionType: 'SINGLE_TARGET',
    actionMode: 'INDIVIDUAL',
    priority: 40,
    durationSeconds: 15,
    allowSkip: true,
    requiresTarget: false,
    canTargetSelf: true,
  },
  audio: {
    wake: 'doctor_wake.mp3',
    action: 'doctor_action.mp3',
    sleep: 'doctor_sleep.mp3',
  },
  investigationResult: {
    type: 'ALIGNMENT_ONLY',
    revealedAlignment: 'GOOD',
  },
};
