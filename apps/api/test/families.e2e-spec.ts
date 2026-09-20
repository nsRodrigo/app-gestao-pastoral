import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RoleName } from "@gestao-pastoral/shared";
import { createTestApp } from "./test-app";
import {
  TEST_PASSWORD,
  cleanTenantData,
  createOrganizationWithUser,
} from "./fixtures";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Families (e2e)", () => {
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

  it("SECRETARIA cria e lista famílias", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const token = await loginAndGetToken(staff.email);

    const created = await request(app.getHttpServer())
      .post("/api/families")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Família Pereira" })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get("/api/families")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(list.body.map((f: { id: string }) => f.id)).toContain(created.body.id);
  });

  it("rejeita nome de família vazio", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const token = await loginAndGetToken(staff.email);

    await request(app.getHttpServer())
      .post("/api/families")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" })
      .expect(400);
  });

  it("DIZIMISTA (sem permissões de staff) não pode criar família", async () => {
    const dizimista = await createOrganizationWithUser(prisma, RoleName.DIZIMISTA);
    const token = await loginAndGetToken(dizimista.email);

    await request(app.getHttpServer())
      .post("/api/families")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Família Qualquer" })
      .expect(403);
  });

  it("atualiza uma família existente", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const token = await loginAndGetToken(staff.email);

    const created = await request(app.getHttpServer())
      .post("/api/families")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Família Original" })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/families/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Família Atualizada" })
      .expect(200);

    expect(updated.body.name).toBe("Família Atualizada");
  });
});
