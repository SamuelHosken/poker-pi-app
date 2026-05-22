import { z } from "zod";
import { BLIND_TEMPLATE_KEYS, EVENT_STATES } from "@/lib/types/domain";

/**
 * Schemas Zod para validação de input das Server Actions.
 * Mensagens em português pt-BR.
 */

const requiredString = (msg = "Campo obrigatório") =>
  z.string({ message: msg }).min(1, msg);

export const CreateEventSchema = z.object({
  name: requiredString("Nome do evento é obrigatório").max(100, "Nome muito longo (máx 100)"),
  eventDate: z
    .string({ message: "Data do evento é obrigatória" })
    .min(1, "Data do evento é obrigatória")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data inválida"),
  buyInCents: z
    .number({ message: "Buy-in é obrigatório" })
    .int("Buy-in deve ser inteiro (centavos)")
    .min(0, "Buy-in não pode ser negativo"),
  rebuyCents: z
    .number()
    .int("Rebuy deve ser inteiro (centavos)")
    .min(0, "Rebuy não pode ser negativo")
    .nullable()
    .optional(),
  rebuyLimitPerPlayer: z
    .number()
    .int()
    .min(0, "Limite de rebuy não pode ser negativo")
    .default(1),
  rebuyUntilLevel: z
    .number()
    .int()
    .min(0, "Nível limite de rebuy não pode ser negativo")
    .default(3),
  tableSize: z
    .number()
    .int()
    .min(2, "Tamanho da mesa deve ser pelo menos 2")
    .max(12, "Tamanho da mesa não pode passar de 12")
    .default(8),
  numberOfPhysicalTables: z
    .number()
    .int()
    .min(1, "Pelo menos 1 mesa física")
    .max(10, "Máximo de 10 mesas físicas")
    .default(2),
  blindTemplate: z.enum(BLIND_TEMPLATE_KEYS, {
    message: "Selecione um template de blinds",
  }),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  id: requiredString("ID do evento é obrigatório"),
});

export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

export const TransitionEventStateSchema = z.object({
  id: requiredString("ID do evento é obrigatório"),
  newState: z.enum(EVENT_STATES, { message: "Estado inválido" }),
});

export type TransitionEventStateInput = z.infer<typeof TransitionEventStateSchema>;

export const CreatePlayerSchema = z.object({
  eventId: requiredString("ID do evento é obrigatório"),
  name: requiredString("Nome do jogador é obrigatório").max(100, "Nome muito longo"),
  nickname: z.string().max(50, "Apelido muito longo").optional().nullable(),
  phone: z.string().max(20, "Telefone muito longo").optional().nullable(),
  // V1.2: opcional — se passado, liga player a profile cadastrado
  profileId: z.string().uuid({ message: "ID de perfil inválido" }).optional().nullable(),
});

export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;

// V1.2 — Schemas de Profile

export const CreateProfileSchema = z.object({
  email: z.email({ message: "E-mail inválido" }),
  password: requiredString("Senha é obrigatória").min(6, "Senha mínima de 6 caracteres"),
  name: requiredString("Nome é obrigatório").max(100, "Nome muito longo"),
  nickname: z.string().max(50, "Apelido muito longo").optional().nullable(),
  isAdmin: z.boolean().default(false),
});

export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;

export const UpdateProfileSchema = z.object({
  id: requiredString("ID do perfil é obrigatório"),
  name: z.string().min(1).max(100).optional(),
  nickname: z.string().max(50).optional().nullable(),
  isAdmin: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// V1.2 — Self-service: player entra em mesa

export const JoinTableSchema = z.object({
  physicalTableId: z.uuid({ message: "Mesa inválida" }),
});

export type JoinTableInput = z.infer<typeof JoinTableSchema>;

export const LoginSchema = z.object({
  email: z.email({ message: "E-mail inválido" }),
  password: requiredString("Senha é obrigatória").min(6, "Senha curta demais"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
