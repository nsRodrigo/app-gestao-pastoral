/**
 * Perfis de acesso — seção 3 do prompt mestre.
 * Fixos no sistema (não editáveis por organização nesta fase).
 */
export const RoleName = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PAROCO: "PAROCO",
  TESOUREIRO: "TESOUREIRO",
  SECRETARIA: "SECRETARIA",
  COORDENADOR_DIZIMO: "COORDENADOR_DIZIMO",
  APOIADOR: "APOIADOR",
  DIZIMISTA: "DIZIMISTA",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const ALL_ROLES: RoleName[] = Object.values(RoleName);

/**
 * Perfis com atuação administrativa/operacional (acessam o Painel Web ou
 * o app do Apoiador). O DIZIMISTA acessa apenas sua própria área.
 */
export const STAFF_ROLES: RoleName[] = [
  RoleName.SUPER_ADMIN,
  RoleName.PAROCO,
  RoleName.TESOUREIRO,
  RoleName.SECRETARIA,
  RoleName.COORDENADOR_DIZIMO,
  RoleName.APOIADOR,
];
