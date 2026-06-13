import { z } from "zod";

// Validación de esquema en SERVIDOR para toda mutación. La UI nunca es la
// frontera de confianza.

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(60, "Máximo 60 caracteres"),
  description: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
  avatar_url: z
    .string()
    .trim()
    .url("URL inválida")
    .max(500)
    .optional()
    .or(z.literal("")),
});

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(80, "Máximo 80 caracteres"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

// El correo invitado debe ser Gmail (requisito). Se normaliza a minúsculas.
export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo inválido")
    .refine((e) => e.endsWith("@gmail.com"), "Debe ser un correo @gmail.com"),
});

export const predictionSchema = z.object({
  match_id: z.coerce.number().int().positive(),
  home_score: z.coerce.number().int().min(0).max(30),
  away_score: z.coerce.number().int().min(0).max(30),
});

export const predictionsBatchSchema = z.object({
  group_id: z.string().uuid(),
  predictions: z.array(predictionSchema).max(120),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
