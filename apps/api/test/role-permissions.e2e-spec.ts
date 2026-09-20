import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Permission, RoleName } from "@gestao-pastoral/shared";
import { createTestApp } from "./test-app";
import {
  TEST_PASSWORD,
  cleanTenantData,
  createOrganizationWithUser,
  createSuperAdmin,
} from "./fixtures";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Permissões customizáveis por organização (seção 3): cada paróquia pode
 * liberar/travar o que cada perfil (exceto SUPER_ADMIN, PAROCO e DIZIMISTA,
 * que ficam fixos) vê ou vê e edita.
 */
describe("Permissões por papel/organização (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  afterAll(async () => {
    await cleanTenantData(prisma);
    await app.close();
  });

  afterEach(async () => {
    await cleanTenantData(prisma);
  });

  async function loginAndGetToken(email: string) {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return res.body.accessToken as string;
  }

  it("PAROCO vê os defaults da própria organização", async () => {
    const paroco = await createOrganizationWithUser(prisma, RoleName.PAROCO);
    const token = await loginAndGetToken(paroco.email);

    const res = await request(app.getHttpServer())
      .get(`/api/organizations/${paroco.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const byRole = Object.fromEntries(
      res.body.map((entry: { role: string; permissions: string[] }) => [
        entry.role,
        entry.permissions,
      ]),
    );
    expect(byRole[RoleName.TESOUREIRO]).toEqual(
      expect.arrayContaining([Permission.MEMBER_READ, Permission.MEMBER_FINANCIAL_READ]),
    );
    expect(byRole[RoleName.SECRETARIA]).not.toContain(Permission.MEMBER_FINANCIAL_READ);
  });

  it("PAROCO consegue liberar uma permissão para um perfil da própria organização", async () => {
    const paroco = await createOrganizationWithUser(prisma, RoleName.PAROCO);
    const token = await loginAndGetToken(paroco.email);

    await request(app.getHttpServer())
      .patch(`/api/organizations/${paroco.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        roles: [
          {
            role: RoleName.SECRETARIA,
            permissions: [
              Permission.MEMBER_READ,
              Permission.MEMBER_CREATE,
              Permission.MEMBER_UPDATE,
              Permission.MEMBER_ARCHIVE,
              Permission.MEMBER_FINANCIAL_READ,
              Permission.FAMILY_READ,
              Permission.FAMILY_CREATE,
              Permission.FAMILY_UPDATE,
            ],
          },
        ],
      })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/organizations/${paroco.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const secretaria = res.body.find((e: { role: string }) => e.role === RoleName.SECRETARIA);
    expect(secretaria.permissions).toContain(Permission.MEMBER_FINANCIAL_READ);
  });

  it("mudança de permissão passa a valer para o usuário após um novo login (JWT é reconstruído)", async () => {
    const secretaria = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    await prisma.member.create({
      data: {
        organizationId: secretaria.organizationId,
        fullName: "Dizimista Financeiro",
        suggestedAmountCents: 15000,
        termsAcceptedAt: new Date(),
        qrCodeToken: "DIZ-RP-TESTE001",
      },
    });

    const tokenBefore = await loginAndGetToken(secretaria.email);
    const before = await request(app.getHttpServer())
      .get("/api/members")
      .set("Authorization", `Bearer ${tokenBefore}`)
      .expect(200);
    expect(before.body[0].suggestedAmountCents).toBeUndefined();

    // Concede a permissão diretamente (equivalente ao Pároco salvando a tela).
    const role = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SECRETARIA } });
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: Permission.MEMBER_FINANCIAL_READ },
    });
    await prisma.rolePermission.create({
      data: { organizationId: secretaria.organizationId, roleId: role.id, permissionId: permission.id },
    });

    const tokenAfter = await loginAndGetToken(secretaria.email);
    const after = await request(app.getHttpServer())
      .get("/api/members")
      .set("Authorization", `Bearer ${tokenAfter}`)
      .expect(200);
    expect(after.body[0].suggestedAmountCents).toBe(15000);
  });

  it("perfil sem gestão de permissões não acessa a tela (403)", async () => {
    const tesoureiro = await createOrganizationWithUser(prisma, RoleName.TESOUREIRO);
    const token = await loginAndGetToken(tesoureiro.email);

    await request(app.getHttpServer())
      .get(`/api/organizations/${tesoureiro.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/organizations/${tesoureiro.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ roles: [{ role: RoleName.APOIADOR, permissions: [] }] })
      .expect(403);
  });

  it("PAROCO de uma organização não acessa/edita a matriz de outra (403) e não a altera", async () => {
    const parocoA = await createOrganizationWithUser(prisma, RoleName.PAROCO);
    const orgB = await createOrganizationWithUser(prisma, RoleName.APOIADOR);
    const tokenA = await loginAndGetToken(parocoA.email);

    await request(app.getHttpServer())
      .get(`/api/organizations/${orgB.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/organizations/${orgB.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ roles: [{ role: RoleName.APOIADOR, permissions: [Permission.MEMBER_FINANCIAL_READ] }] })
      .expect(403);

    const role = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.APOIADOR } });
    const rows = await prisma.rolePermission.findMany({
      where: { organizationId: orgB.organizationId, roleId: role.id },
      include: { permission: true },
    });
    expect(rows.map((r) => r.permission.key)).not.toContain(Permission.MEMBER_FINANCIAL_READ);
  });

  it("SUPER_ADMIN lista organizações e gerencia a matriz de qualquer uma", async () => {
    const superAdmin = await createSuperAdmin(prisma);
    const org = await createOrganizationWithUser(prisma, RoleName.APOIADOR);
    const token = await loginAndGetToken(superAdmin.email);

    const list = await request(app.getHttpServer())
      .get("/api/organizations")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.map((o: { id: string }) => o.id)).toContain(org.organizationId);

    await request(app.getHttpServer())
      .patch(`/api/organizations/${org.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ roles: [{ role: RoleName.APOIADOR, permissions: [Permission.MEMBER_FINANCIAL_READ] }] })
      .expect(200);

    const role = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.APOIADOR } });
    const rows = await prisma.rolePermission.findMany({
      where: { organizationId: org.organizationId, roleId: role.id },
      include: { permission: true },
    });
    expect(rows.map((r) => r.permission.key)).toEqual([Permission.MEMBER_FINANCIAL_READ]);
  });

  it("usuário comum (não Pároco/Super Admin) não pode listar organizações (403)", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.PAROCO);
    const token = await loginAndGetToken(staff.email);

    await request(app.getHttpServer())
      .get("/api/organizations")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("rejeita ORGANIZATION_MANAGE na matriz (400)", async () => {
    const paroco = await createOrganizationWithUser(prisma, RoleName.PAROCO);
    const token = await loginAndGetToken(paroco.email);

    await request(app.getHttpServer())
      .patch(`/api/organizations/${paroco.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        roles: [{ role: RoleName.APOIADOR, permissions: [Permission.ORGANIZATION_MANAGE] }],
      })
      .expect(400);
  });

  it("rejeita papel não customizável (PAROCO) na matriz (400)", async () => {
    const paroco = await createOrganizationWithUser(prisma, RoleName.PAROCO);
    const token = await loginAndGetToken(paroco.email);

    await request(app.getHttpServer())
      .patch(`/api/organizations/${paroco.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ roles: [{ role: RoleName.PAROCO, permissions: [Permission.MEMBER_READ] }] })
      .expect(400);
  });

  it("alterar a matriz de uma organização não afeta outra (isolamento)", async () => {
    const parocoA = await createOrganizationWithUser(prisma, RoleName.PAROCO);
    const orgB = await createOrganizationWithUser(prisma, RoleName.TESOUREIRO);
    const tokenA = await loginAndGetToken(parocoA.email);

    await request(app.getHttpServer())
      .patch(`/api/organizations/${parocoA.organizationId}/role-permissions`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ roles: [{ role: RoleName.TESOUREIRO, permissions: [] }] })
      .expect(200);

    const role = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.TESOUREIRO } });
    const rowsB = await prisma.rolePermission.findMany({
      where: { organizationId: orgB.organizationId, roleId: role.id },
      include: { permission: true },
    });
    expect(rowsB.map((r) => r.permission.key)).toEqual(
      expect.arrayContaining([Permission.MEMBER_READ, Permission.MEMBER_FINANCIAL_READ, Permission.FAMILY_READ]),
    );
  });
});
