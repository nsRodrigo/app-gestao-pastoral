export interface Family {
  id: string;
  name: string;
  addressCity: string | null;
  _count?: { members: number };
  createdAt: string;
}

export interface Member {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: "ATIVO" | "INATIVO" | "ARQUIVADO";
  familyId: string | null;
  qrCodeToken: string;
  suggestedAmountCents?: number | null;
  contributionFrequency?: string | null;
  contributionPreference?: string | null;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  role: string | null;
  lastLoginAt: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}
