import { createServerFn } from "@tanstack/react-start";
import { aiJson, clamp, clampScore } from "./ai.server";

export type PublicProfile = {
  nome: string;
  cargo_alvo: string;
  email: string;
  telefone: string;
  localizacao: string;
  linkedin: string;
  resumo: string;
  experiencias: string;
  formacao: string;
  habilidades: string;
  idiomas: string;
};

export type MatchResult = {
  match_score: number;
  resumo: string;
  pontos_fortes: string[];
  lacunas: string[];
  palavras_chave_faltantes: string[];
  criterios: { nome: string; nota: number }[];
  vaga: { empresa: string | null; cargo: string | null; senioridade: string | null };
};

export type OptimizedResume = {
  nome: string;
  cargo_alvo: string;
  contato: string;
  resumo: string;
  competencias: string[];
  experiencias: { cargo: string; empresa: string; periodo: string; bullets: string[] }[];
  formacao: string[];
  idiomas: string[];
  palavras_chave_aplicadas: string[];
  ats_score_estimado: number;
};

function profileToText(p: PublicProfile): string {
  return [
    `Nome: ${p.nome}`,
    `Cargo alvo: ${p.cargo_alvo}`,
    `Contato: ${p.email} | ${p.telefone} | ${p.localizacao} | ${p.linkedin}`,
    `Resumo profissional: ${p.resumo}`,
    `Experiências:\n${p.experiencias}`,
    `Formação:\n${p.formacao}`,
    `Habilidades: ${p.habilidades}`,
    `Idiomas: ${p.idiomas}`,
  ].join("\n\n");
}

type Input = { profile: PublicProfile; job: string };

const validate = (input: Input): Input => {
  if (!input?.profile?.nome?.trim()) throw new Error("Preencha ao menos o seu nome no perfil.");
  if (!input?.job?.trim() || input.job.trim().length < 30)
    throw new Error("Cole a descrição da vaga (texto com pelo menos 30 caracteres).");
  return input;
};

export const analyzeMatch = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }): Promise<MatchResult> => {
    const raw = await aiJson<MatchResult>({
      system:
        "Você é um especialista em recrutamento e sistemas ATS. Compare o perfil do candidato com a descrição da vaga e produza uma avaliação honesta e específica. " +
        'Responda no formato: {"match_score":0-100,"resumo":"","pontos_fortes":[""],"lacunas":[""],"palavras_chave_faltantes":[""],"criterios":[{"nome":"","nota":0}],"vaga":{"empresa":null,"cargo":null,"senioridade":null}}. ' +
        "Use no máximo 5 itens em cada lista e 5 critérios (Experiência, Competências técnicas, Palavras-chave, Senioridade, Formação).",
      user: `PERFIL DO CANDIDATO:\n${clamp(profileToText(data.profile), 12000)}\n\nVAGA:\n${clamp(data.job, 12000)}`,
    });
    return {
      match_score: clampScore(raw?.match_score),
      resumo: String(raw?.resumo ?? ""),
      pontos_fortes: Array.isArray(raw?.pontos_fortes) ? raw.pontos_fortes.map(String) : [],
      lacunas: Array.isArray(raw?.lacunas) ? raw.lacunas.map(String) : [],
      palavras_chave_faltantes: Array.isArray(raw?.palavras_chave_faltantes)
        ? raw.palavras_chave_faltantes.map(String)
        : [],
      criterios: Array.isArray(raw?.criterios)
        ? raw.criterios.map((c) => ({ nome: String(c?.nome ?? ""), nota: clampScore(c?.nota) }))
        : [],
      vaga: {
        empresa: raw?.vaga?.empresa ?? null,
        cargo: raw?.vaga?.cargo ?? null,
        senioridade: raw?.vaga?.senioridade ?? null,
      },
    };
  });

export const buildResume = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }): Promise<OptimizedResume> => {
    const raw = await aiJson<OptimizedResume>({
      system:
        "Você é um redator de currículos otimizados para ATS. Reescreva e reorganize APENAS os fatos fornecidos pelo candidato, usando as palavras-chave da vaga quando forem verdadeiras para o candidato. Nunca invente empresas, cargos, datas, números ou tecnologias. " +
        'Responda no formato: {"nome":"","cargo_alvo":"","contato":"","resumo":"","competencias":[""],"experiencias":[{"cargo":"","empresa":"","periodo":"","bullets":[""]}],"formacao":[""],"idiomas":[""],"palavras_chave_aplicadas":[""],"ats_score_estimado":0-100}. ' +
        "Bullets começam com verbo de ação, no máximo 4 por experiência.",
      user: `PERFIL DO CANDIDATO:\n${clamp(profileToText(data.profile), 14000)}\n\nVAGA ALVO:\n${clamp(data.job, 10000)}`,
      maxTokens: 5000,
    });
    return {
      nome: String(raw?.nome ?? data.profile.nome),
      cargo_alvo: String(raw?.cargo_alvo ?? data.profile.cargo_alvo ?? ""),
      contato: String(raw?.contato ?? ""),
      resumo: String(raw?.resumo ?? ""),
      competencias: Array.isArray(raw?.competencias) ? raw.competencias.map(String) : [],
      experiencias: Array.isArray(raw?.experiencias)
        ? raw.experiencias.map((e) => ({
            cargo: String(e?.cargo ?? ""),
            empresa: String(e?.empresa ?? ""),
            periodo: String(e?.periodo ?? ""),
            bullets: Array.isArray(e?.bullets) ? e.bullets.map(String) : [],
          }))
        : [],
      formacao: Array.isArray(raw?.formacao) ? raw.formacao.map(String) : [],
      idiomas: Array.isArray(raw?.idiomas) ? raw.idiomas.map(String) : [],
      palavras_chave_aplicadas: Array.isArray(raw?.palavras_chave_aplicadas)
        ? raw.palavras_chave_aplicadas.map(String)
        : [],
      ats_score_estimado: clampScore(raw?.ats_score_estimado),
    };
  });

/** Busca o texto visível de uma página de vaga a partir do link. */
export const fetchJobFromUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => {
    const u = input?.url?.trim() ?? "";
    if (!/^https?:\/\/\S+$/i.test(u)) throw new Error("Informe um link válido começando com http.");
    return { url: u };
  })
  .handler(async ({ data }) => {
    let html = "";
    try {
      const res = await fetch(data.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JobMatchBot/1.0)" },
      });
      if (!res.ok) throw new Error(String(res.status));
      html = await res.text();
    } catch {
      throw new Error(
        "Não foi possível ler essa página. Muitos sites de vagas bloqueiam leitura automática — copie e cole o texto da vaga.",
      );
    }
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 200)
      throw new Error(
        "A página não trouxe texto suficiente. Copie e cole a descrição da vaga.",
      );
    return { text: text.slice(0, 12000) };
  });
