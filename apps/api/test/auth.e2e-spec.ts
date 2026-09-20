import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RoleName } from "@gestao-pastoral/shared";
import { createTestApp } from "./test-app";
import {
  TEST_PASSWORD,
  cleanTenantData,
  createOrganizationWithUser,
  createSuperAdmin,
} from "./fixtures";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth (e2e)", () => {
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

  it("faz login com credenciais válidas e retorna tokens", async () => {
    const user = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);

    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.role).toBe(RoleName.SECRETARIA);
  });

  it("rejeita senha inválida com mensagem genérica", async () => {
    const user = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);

    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: user.email, password: "senhaErrada123" })
      .expect(401);

    expect(res.body.message).toBe("E-mail ou senha inválidos.");
  });

  it("rejeita e-mail inexistente com a mesma mensagem genérica (não vaza existência)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "ninguem@example.com", password: TEST_PASSWORD })
      .expect(401);

    expect(res.body.message).toBe("E-mail ou senha inválidos.");
  });

  it("rejeita login de usuário inativo", async () => {
    const user = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    await prisma.user.update({
      where: { id: user.userId },
      data: { isActive: false },
    });

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(401);
  });

  it("recusa endpoint protegido sem token", async () => {
    await request(app.getHttpServer()).get("/api/members").expect(401);
  });

  it("rotaciona o refresh token e invalida o anterior após uso", async () => {
    const user = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);

    const firstRefresh = login.body.refreshToken;

    const refreshed = await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send({ refreshToken: firstRefresh })
      .expect(200);

    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).not.toBe(firstRefresh);

    // Reutilizar o refresh token antigo deve falhar (rotação/revogação).
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send({ refreshToken: firstRefresh })
      .expect(401);
  });

  it("revoga o refresh token no logout", async () => {
    const user = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/auth/logout")
      .send({ refreshToken: login.body.refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
  });

  it("SUPER_ADMIN (sem UserRole, apenas isSuperAdmin) recebe o papel e todas as permissões no JWT", async () => {
    const superAdmin = await createSuperAdmin(prisma);

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: superAdmin.email, password: TEST_PASSWORD })
      .expect(200);

    expect(login.body.user.role).toBe(RoleName.SUPER_ADMIN);
    expect(login.body.user.organizationId).toBeNull();

    // Confirma que o token realmente carrega privilégios de SUPER_ADMIN
    // fazendo uma ação exclusiva do perfil: criar uma organização.
    const created = await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({
        name: "Nova Paróquia via Super Admin",
        admin: {
          name: "Admin Inicial",
          email: `admin-${Date.now()}@example.com`,
          password: TEST_PASSWORD,
        },
      })
      .expect(201);

    expect(created.body.name).toBe("Nova Paróquia via Super Admin");
  });
});
