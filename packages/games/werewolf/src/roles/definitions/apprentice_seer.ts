import type { RoleDefinition } from '../../types/role.js';

export const ApprenticeSeerRole: RoleDefinition = {
  id: 'apprentice_seer',
  name: 'Apprentice Seer',
  category: 'ADDITIONAL',
  alignment: 'GOOD',
  team: 'VILLAGE',
  minCount: 0,
  maxCount: 1,
  description: 'Studies under the Seer. If the true Seer perishes, the Apprentice ascends to inherit the gift of divination.',
  investigationResult: {
    revealedAlignment: 'GOOD',
  },
};
