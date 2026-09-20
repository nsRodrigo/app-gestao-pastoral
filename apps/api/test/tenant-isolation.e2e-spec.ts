import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RoleName } from "@gestao-pastoral/shared";
import { createTestApp } from "./test-app";
import {
  TEST_PASSWORD,
  cleanTenantData,
  createFamily,
  createMember,
  createOrganizationWithUser,
} from "./fixtures";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Testes de isolamento multi-tenant (IDOR) — seção 53.10 do prompt mestre:
 * "Usuário da Igreja A tenta acessar contribuição da Igreja B. Resultado:
 * acesso negado." Aqui cobrimos famílias e dizimistas (entidades já
 * implementadas na Fase 1).
 */
describe("Isolamento multi-tenant / IDOR (e2e)", () => {
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

  it("usuário da Organização A não acessa família da Organização B (404)", async () => {
    const userA = await createOrganizationWithUser(prisma, RoleName.COORDENADOR_DIZIMO);
    const userB = await createOrganizationWithUser(prisma, RoleName.COORDENADOR_DIZIMO);
    const familyB = await createFamily(prisma, userB.organizationId);

    const tokenA = await loginAndGetToken(userA.email);

    await request(app.getHttpServer())
      .get(`/api/families/${familyB.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(404);
  });

  it("usuário da Organização A não acessa dizimista da Organização B (404)", async () => {
    const userA = await createOrganizationWithUser(prisma, RoleName.COORDENADOR_DIZIMO);
    const userB = await createOrganizationWithUser(prisma, RoleName.COORDENADOR_DIZIMO);
    const memberB = await createMember(prisma, userB.organizationId);

    const tokenA = await loginAndGetToken(userA.email);

    await request(app.getHttpServer())
      .get(`/api/members/${memberB.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(404);
  });

  it("usuário da Organização A não edita dizimista da Organização B", async () => {
    const userA = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const userB = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const memberB = await createMember(prisma, userB.organizationId);

    const tokenA = await loginAndGetToken(userA.email);

    await request(app.getHttpServer())
      .patch(`/api/members/${memberB.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ fullName: "Nome Alterado Indevidamente" })
      .expect(404);

    const stillOriginal = await prisma.member.findUnique({ where: { id: memberB.id } });
    expect(stillOriginal?.fullName).not.toBe("Nome Alterado Indevidamente");
  });

  it("a listagem de dizimistas de A nunca inclui dizimistas de B", async () => {
    const userA = await createOrganizationWithUser(prisma, RoleName.COORDENADOR_DIZIMO);
    const userB = await createOrganizationWithUser(prisma, RoleName.COORDENADOR_DIZIMO);
    await createMember(prisma, userA.organizationId, { fullName: "Membro da Organização A" });
    await createMember(prisma, userB.organizationId, { fullName: "Membro da Organização B" });

    const tokenA = await loginAndGetToken(userA.email);

    const res = await request(app.getHttpServer())
      .get("/api/members")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    const names = res.body.map((m: { fullName: string }) => m.fullName);
    expect(names).toContain("Membro da Organização A");
    expect(names).not.toContain("Membro da Organização B");
  });

  it("SUPER_ADMIN não autenticado com token de outra organização não pode criar organização sem permissão adequada", async () => {
    // Ator comum (não SUPER_ADMIN) nunca deve conseguir criar organizações,
    // mesmo estando autenticado — confirma que ORGANIZATION_MANAGE é
    // exclusivo do perfil de plataforma.
    const user = await createOrganizationWithUser(prisma, RoleName.PAROCO);
    const token = await loginAndGetToken(user.email);

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Outra Paróquia",
        admin: { name: "X", email: "x@example.com", password: TEST_PASSWORD },
      })
      .expect(403);
  });
});
