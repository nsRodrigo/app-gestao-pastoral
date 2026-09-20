import { ALL_PERMISSIONS, Permission } from "./permissions";
import { PERMISSION_RESOURCE_GROUPS } from "./permission-groups";
import { CUSTOMIZABLE_ROLES, RolePermissionsEntrySchema } from "./schemas/organization";

describe("PERMISSION_RESOURCE_GROUPS", () => {
  it("cobre toda permissão exceto ORGANIZATION_MANAGE (nunca fica órfã de grupo)", () => {
    const covered = new Set(
      PERMISSION_RESOURCE_GROUPS.flatMap((group) => [
        ...(group.ver ?? []),
        ...(group.verEEditar ?? []),
      ]),
    );

    for (const permission of ALL_PERMISSIONS) {
      if (permission === Permission.ORGANIZATION_MANAGE) {
        expect(covered.has(permission)).toBe(false);
        continue;
      }
      expect(covered.has(permission)).toBe(true);
    }
  });

  it("cada grupo tem ao menos um nível (ver ou ver e editar)", () => {
    for (const group of PERMISSION_RESOURCE_GROUPS) {
      expect(group.ver || group.verEEditar).toBeTruthy();
    }
  });

  it("'ver e editar' sempre inclui as permissões de 'ver' do mesmo grupo", () => {
    for (const group of PERMISSION_RESOURCE_GROUPS) {
      if (!group.ver || !group.verEEditar) continue;
      for (const permission of group.ver) {
        expect(group.verEEditar).toContain(permission);
      }
    }
  });
});

describe("RolePermissionsEntrySchema", () => {
  it("aceita um perfil customizável com permissões válidas", () => {
    const result = RolePermissionsEntrySchema.safeParse({
      role: CUSTOMIZABLE_ROLES[0],
      permissions: [Permission.MEMBER_READ],
    });
    expect(result.success).toBe(true);
  });

  it("rejeita ORGANIZATION_MANAGE (ação de plataforma, não delegável)", () => {
    const result = RolePermissionsEntrySchema.safeParse({
      role: CUSTOMIZABLE_ROLES[0],
      permissions: [Permission.ORGANIZATION_MANAGE],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita papel fora da lista de customizáveis (ex.: PAROCO)", () => {
    const result = RolePermissionsEntrySchema.safeParse({
      role: "PAROCO",
      permissions: [Permission.MEMBER_READ],
    });
    expect(result.success).toBe(false);
  });
});
