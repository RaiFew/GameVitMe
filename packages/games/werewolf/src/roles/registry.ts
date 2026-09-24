import type { RoleCategory, RoleDefinition } from '../types/role.js';
import { WerewolfRole } from './definitions/werewolf.js';
import { WitchRole } from './definitions/witch.js';
import { DefenderRole } from './definitions/defender.js';
import { ConstableRole } from './definitions/constable.js';
import { SeerRole } from './definitions/seer.js';
import { VillagerRole } from './definitions/villager.js';
import { DoctorRole } from './definitions/doctor.js';
import { HunterRole } from './definitions/hunter.js';
import { MasonRole } from './definitions/mason.js';
import { MayorRole } from './definitions/mayor.js';
import { AlphaWolfRole } from './definitions/alpha_wolf.js';
import { WolfCubRole } from './definitions/wolf_cub.js';
import { SorcererRole } from './definitions/sorcerer.js';
import { MinionRole } from './definitions/minion.js';
import { TannerRole } from './definitions/tanner.js';
import { FoolRole } from './definitions/fool.js';
import { SerialKillerRole } from './definitions/serial_killer.js';
import { ApprenticeSeerRole } from './definitions/apprentice_seer.js';
import { CursedRole } from './definitions/cursed.js';

export class RoleRegistry {
  private static instance: RoleRegistry;
  private roles = new Map<string, RoleDefinition>();

  private constructor() {
    // Villager category
    this.register(VillagerRole);
    this.register(SeerRole);
    this.register(WitchRole);
    this.register(DefenderRole);
    this.register(ConstableRole);
    this.register(DoctorRole);
    this.register(HunterRole);
    this.register(MasonRole);
    this.register(MayorRole);

    // Werewolf category
    this.register(WerewolfRole);
    this.register(AlphaWolfRole);
    this.register(WolfCubRole);
    this.register(SorcererRole);
    this.register(MinionRole);

    // Neutral category
    this.register(TannerRole);
    this.register(FoolRole);
    this.register(SerialKillerRole);

    // Additional category
    this.register(ApprenticeSeerRole);
    this.register(CursedRole);
  }

  static getInstance(): RoleRegistry {
    if (!RoleRegistry.instance) {
      RoleRegistry.instance = new RoleRegistry();
    }
    return RoleRegistry.instance;
  }

  register(role: RoleDefinition): void {
    this.roles.set(role.id, role);
  }

  get(roleId: string): RoleDefinition | undefined {
    return this.roles.get(roleId);
  }

  list(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  listByCategory(category: RoleCategory): RoleDefinition[] {
    return Array.from(this.roles.values()).filter((r) => r.category === category);
  }
}
