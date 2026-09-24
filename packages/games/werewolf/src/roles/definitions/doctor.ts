import type { RoleDefinition } from '../../types/role.js';

export const DoctorRole: RoleDefinition = {
  id: 'doctor',
  name: 'Doctor',
  category: 'VILLAGER',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 2,
  description: 'Visits one villager each night to heal their wounds, saving them from werewolf attacks.',
  nightConfig: {
    priority: 35,
    durationSeconds: 15,
    actionMode: 'INDIVIDUAL',
    actionType: 'PROTECT',
    allowSkip: false,
  },
  audio: {
    wake: 'doctor_wake',
    action: 'doctor_action',
    sleep: 'doctor_sleep',
  },
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
