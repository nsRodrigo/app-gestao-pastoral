/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  RoleName,
} from "@gestao-pastoral/shared";
import { generateQrCodeToken } from "../src/members/qrcode-token.util";

const prisma = new PrismaClient();

const SEED_PASSWORD = "SenhaForte123";

async function hash(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function seedRolesAndPermissions() {
  for (const permission of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission },
      create: { key: permission },
      update: {},
    });
  }

  const roles: Record<RoleName, { id: string }> = {} as never;
  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName },
      update: {},
    });
    roles[roleName] = role;
  }

  for (const [roleName, permissionKeys] of Object.entries(
    DEFAULT_ROLE_PERMISSIONS,
  )) {
    const role = roles[roleName as RoleName];
    for (const key of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }

  return roles;
}

async function seedSuperAdmin() {
  const passwordHash = await hash(SEED_PASSWORD);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@dizimoconectado.com.br" },
    create: {
      name: "Super Administrador",
      email: "superadmin@dizimoconectado.com.br",
      passwordHash,
      organizationId: null,
    },
    update: {},
  });
  return superAdmin;
}

async function seedOrganization(roles: Record<RoleName, { id: string }>) {
  const organization = await prisma.organization.upsert({
    where: { slug: "nossa-senhora-da-gruta" },
    create: {
      name: "Paróquia Nossa Senhora da Gruta",
      slug: "nossa-senhora-da-gruta",
      address: "Rua das Flores, 123 — São Paulo/SP",
      phone: "(11) 4000-0000",
      email: "contato@nsgruta.org.br",
      settings: { create: { parocoPodeVerValoresIndividuais: true } },
    },
    update: {},
  });

  const staff: Array<{
    name: string;
    email: string;
    role: RoleName;
  }> = [
    { name: "Padre João Batista", email: "paroco@nsgruta.org.br", role: RoleName.PAROCO },
    { name: "Maria Tesoureira", email: "tesoureiro@nsgruta.org.br", role: RoleName.TESOUREIRO },
    { name: "Ana Secretária", email: "secretaria@nsgruta.org.br", role: RoleName.SECRETARIA },
    { name: "Carlos Coordenador", email: "coordenador@nsgruta.org.br", role: RoleName.COORDENADOR_DIZIMO },
    { name: "Pedro Apoiador", email: "apoiador@nsgruta.org.br", role: RoleName.APOIADOR },
  ];

  const passwordHash = await hash(SEED_PASSWORD);
  for (const person of staff) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      create: {
        organizationId: organization.id,
        name: person.name,
        email: person.email,
        passwordHash,
      },
      update: {},
    });

    await prisma.userRole.upsert({
      where: {
        userId_organizationId: { userId: user.id, organizationId: organization.id },
      },
      create: {
        userId: user.id,
        organizationId: organization.id,
        roleId: roles[person.role].id,
      },
      update: { roleId: roles[person.role].id },
    });
  }

  return organization;
}

async function seedFamiliesAndMembers(organizationId: string, roles: Record<RoleName, { id: string }>) {
  const familyNames = ["Silva", "Santos", "Oliveira"];
  const families: Record<string, string> = {};

  for (const name of familyNames) {
    const existing = await prisma.family.findFirst({
      where: { organizationId, name: `Família ${name}` },
    });
    const family =
      existing ??
      (await prisma.family.create({
        data: { organizationId, name: `Família ${name}` },
      }));
    families[name] = family.id;
  }

  const passwordHash = await hash(SEED_PASSWORD);

  const membersData = [
    {
      fullName: "Maria da Silva",
      family: "Silva",
      email: "maria.silva@example.com",
      status: "ATIVO" as const,
      contributionFrequency: "MENSAL" as const,
      suggestedAmountCents: 15000,
      contributionPreference: "PIX" as const,
      createLogin: true,
    },
    {
      fullName: "José da Silva",
      family: "Silva",
      email: "jose.silva@example.com",
      status: "ATIVO" as const,
      createLogin: false,
    },
    {
      fullName: "João dos Santos",
      family: "Santos",
      email: "joao.santos@example.com",
      status: "ATIVO" as const,
      contributionFrequency: "MENSAL" as const,
      suggestedAmountCents: 10000,
      contributionPreference: "DINHEIRO" as const,
      createLogin: false,
    },
    {
      fullName: "Rita dos Santos",
      family: "Santos",
      status: "INATIVO" as const,
      createLogin: false,
    },
    {
      fullName: "Antônio Oliveira",
      family: "Oliveira",
      email: "antonio.oliveira@example.com",
      status: "ATIVO" as const,
      contributionFrequency: "TRIMESTRAL" as const,
      suggestedAmountCents: 30000,
      contributionPreference: "CARTAO" as const,
      createLogin: false,
    },
  ];

  for (const data of membersData) {
    const existing = await prisma.member.findFirst({
      where: { organizationId, fullName: data.fullName },
    });
    if (existing) continue;

    let userId: string | undefined;
    if (data.createLogin && data.email) {
      const user = await prisma.user.create({
        data: {
          organizationId,
          name: data.fullName,
          email: data.email,
          passwordHash,
        },
      });
      await prisma.userRole.create({
        data: {
          userId: user.id,
          organizationId,
          roleId: roles[RoleName.DIZIMISTA].id,
        },
      });
      userId = user.id;
    }

    await prisma.member.create({
      data: {
        organizationId,
        familyId: families[data.family],
        fullName: data.fullName,
        email: data.email,
        status: data.status,
        contributionFrequency: data.contributionFrequency,
        suggestedAmountCents: data.suggestedAmountCents,
        contributionPreference: data.contributionPreference,
        termsAcceptedAt: new Date(),
        communicationConsent: true,
        qrCodeToken: generateQrCodeToken(),
        userId,
      },
    });
  }
}

async function main() {
  console.log("Seed: papéis e permissões...");
  const roles = await seedRolesAndPermissions();

  console.log("Seed: super administrador...");
  await seedSuperAdmin();

  console.log("Seed: organização e equipe...");
  const organization = await seedOrganization(roles);

  console.log("Seed: famílias e dizimistas...");
  await seedFamiliesAndMembers(organization.id, roles);

  console.log("\nSeed concluído. Credenciais de teste (senha para todos):");
  console.log(`  Senha: ${SEED_PASSWORD}`);
  console.log("  superadmin@dizimoconectado.com.br (Super Administrador)");
  console.log("  paroco@nsgruta.org.br (Pároco)");
  console.log("  tesoureiro@nsgruta.org.br (Tesoureiro)");
  console.log("  secretaria@nsgruta.org.br (Secretaria)");
  console.log("  coordenador@nsgruta.org.br (Coordenador do Dízimo)");
  console.log("  apoiador@nsgruta.org.br (Apoiador)");
  console.log("  maria.silva@example.com (Dizimista)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
