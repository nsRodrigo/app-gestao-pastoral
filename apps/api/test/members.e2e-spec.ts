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

describe("Members (e2e)", () => {
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

  it("cria dizimista sem exigir valor de contribuição (seção 5)", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const token = await loginAndGetToken(staff.email);

    const res = await request(app.getHttpServer())
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "José Pereira", termsAccepted: true })
      .expect(201);

    expect(res.body.fullName).toBe("José Pereira");
    expect(res.body.suggestedAmountCents).toBeNull();
    expect(res.body.qrCodeToken).toMatch(/^DIZ-[A-Z0-9]{8}$/);
  });

  it("rejeita CPF inválido", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const token = await loginAndGetToken(staff.email);

    await request(app.getHttpServer())
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "CPF Inválido", cpf: "111.111.111-11", termsAccepted: true })
      .expect(400);
  });

  it("rejeita CPF duplicado na mesma organização", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const token = await loginAndGetToken(staff.email);
    const validCpf = "52998224725"; // CPF válido conhecido para testes

    await request(app.getHttpServer())
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Primeiro Cadastro", cpf: validCpf, termsAccepted: true })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Segundo Cadastro", cpf: validCpf, termsAccepted: true })
      .expect(409);
  });

  it("cadastro rápido cria família automaticamente quando familyName é informado", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.APOIADOR);
    const token = await loginAndGetToken(staff.email);

    const res = await request(app.getHttpServer())
      .post("/api/members/quick")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Novo Dizimista", familyName: "Família Costa", termsAccepted: true })
      .expect(201);

    expect(res.body.familyId).toEqual(expect.any(String));

    const family = await prisma.family.findUnique({ where: { id: res.body.familyId } });
    expect(family?.name).toBe("Família Costa");
  });

  it("apoiador sem MEMBER_UPDATE não pode editar dizimista", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.APOIADOR);
    const token = await loginAndGetToken(staff.email);

    const created = await request(app.getHttpServer())
      .post("/api/members/quick")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Dizimista Apoiador", termsAccepted: true })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/members/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Tentativa de Edição" })
      .expect(403);
  });

  describe("visibilidade de campos financeiros (seção 3)", () => {
    it("SECRETARIA não vê campos financeiros por padrão", async () => {
      const secretaria = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
      await prisma.member.create({
        data: {
          organizationId: secretaria.organizationId,
          fullName: "Dizimista Financeiro",
          suggestedAmountCents: 20000,
          contributionFrequency: "MENSAL",
          termsAcceptedAt: new Date(),
          qrCodeToken: "DIZ-TESTE001",
        },
      });

      const token = await loginAndGetToken(secretaria.email);
      const res = await request(app.getHttpServer())
        .get("/api/members")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body[0].suggestedAmountCents).toBeUndefined();
      expect(res.body[0].contributionFrequency).toBeUndefined();
    });

    it("TESOUREIRO vê campos financeiros", async () => {
      const tesoureiro = await createOrganizationWithUser(prisma, RoleName.TESOUREIRO);
      await prisma.member.create({
        data: {
          organizationId: tesoureiro.organizationId,
          fullName: "Dizimista Financeiro",
          suggestedAmountCents: 20000,
          contributionFrequency: "MENSAL",
          termsAcceptedAt: new Date(),
          qrCodeToken: "DIZ-TESTE002",
        },
      });

      const token = await loginAndGetToken(tesoureiro.email);
      const res = await request(app.getHttpServer())
        .get("/api/members")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body[0].suggestedAmountCents).toBe(20000);
    });

    it("PAROCO só vê valores individuais quando a organização habilita a configuração", async () => {
      const parocoSemAcesso = await createOrganizationWithUser(prisma, RoleName.PAROCO, {
        parocoPodeVerValoresIndividuais: false,
      });
      await prisma.member.create({
        data: {
          organizationId: parocoSemAcesso.organizationId,
          fullName: "Dizimista X",
          suggestedAmountCents: 5000,
          termsAcceptedAt: new Date(),
          qrCodeToken: "DIZ-TESTE003",
        },
      });

      const tokenSemAcesso = await loginAndGetToken(parocoSemAcesso.email);
      const resSemAcesso = await request(app.getHttpServer())
        .get("/api/members")
        .set("Authorization", `Bearer ${tokenSemAcesso}`)
        .expect(200);
      expect(resSemAcesso.body[0].suggestedAmountCents).toBeUndefined();

      const parocoComAcesso = await createOrganizationWithUser(prisma, RoleName.PAROCO, {
        parocoPodeVerValoresIndividuais: true,
      });
      await prisma.member.create({
        data: {
          organizationId: parocoComAcesso.organizationId,
          fullName: "Dizimista Y",
          suggestedAmountCents: 7000,
          termsAcceptedAt: new Date(),
          qrCodeToken: "DIZ-TESTE004",
        },
      });

      const tokenComAcesso = await loginAndGetToken(parocoComAcesso.email);
      const resComAcesso = await request(app.getHttpServer())
        .get("/api/members")
        .set("Authorization", `Bearer ${tokenComAcesso}`)
        .expect(200);
      expect(resComAcesso.body[0].suggestedAmountCents).toBe(7000);
    });
  });

  it("arquivar dizimista revoga o QR Code e não exclui o registro (seção 30)", async () => {
    const staff = await createOrganizationWithUser(prisma, RoleName.SECRETARIA);
    const token = await loginAndGetToken(staff.email);

    const created = await request(app.getHttpServer())
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Dizimista Arquivado", termsAccepted: true })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/members/${created.body.id}/archive`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const archived = await prisma.member.findUnique({ where: { id: created.body.id } });
    expect(archived).not.toBeNull();
    expect(archived?.status).toBe("ARQUIVADO");
    expect(archived?.qrCodeRevoked).toBe(true);
  });
});
