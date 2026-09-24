import type { RoleDefinition } from '../types/index.js';
import { witchRole } from './definitions/witch.js';
import { constableRole } from './definitions/constable.js';
import { townCrierRole } from './definitions/town-crier.js';
import { doctorRole } from './definitions/doctor.js';
import { puritanRole } from './definitions/puritan.js';

export class SalemRoleRegistry {
  private static instance: SalemRoleRegistry;
  private roles = new Map<string, RoleDefinition>();

  private constructor() {
    this.register(witchRole);
    this.register(constableRole);
    this.register(townCrierRole);
    this.register(doctorRole);
    this.register(puritanRole);
  }

  public static getInstance(): SalemRoleRegistry {
    if (!SalemRoleRegistry.instance) {
      SalemRoleRegistry.instance = new SalemRoleRegistry();
    }
    return SalemRoleRegistry.instance;
  }

  public register(role: RoleDefinition): void {
    this.roles.set(role.id, role);
  }

  public get(id: string): RoleDefinition | undefined {
    return this.roles.get(id);
  }

  public list(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }
}
