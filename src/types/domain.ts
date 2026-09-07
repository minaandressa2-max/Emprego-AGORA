export type Seniority = "Estágio" | "Júnior" | "Pleno" | "Sênior" | "Especialista";
export type WorkMode = "Remoto" | "Híbrido" | "Presencial";

export const SENIORITIES: Seniority[] = [
  "Estágio",
  "Júnior",
  "Pleno",
  "Sênior",
  "Especialista",
];
export const WORK_MODES: WorkMode[] = ["Remoto", "Híbrido", "Presencial"];

export const APPLICATION_STATUSES = [
  "interesse",
  "candidatura_enviada",
  "entrevista",
  "teste",
  "segunda_entrevista",
  "oferta",
  "rejeitado",
  "contratado",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  interesse: "Interesse",
  candidatura_enviada: "Candidatura enviada",
  entrevista: "Entrevista",
  teste: "Teste",
  segunda_entrevista: "Segunda entrevista",
  oferta: "Oferta",
  rejeitado: "Rejeitado",
  contratado: "Contratado",
};

export const EVENT_TYPES = ["entrevista", "teste", "prazo", "follow_up"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_LABEL: Record<EventType, string> = {
  entrevista: "Entrevista",
  teste: "Teste",
  prazo: "Prazo",
  follow_up: "Follow-up",
};

/* ---------- Estruturas devolvidas pela IA ---------- */

export type ParsedResume = {
  nome: string | null;
  email: string | null;
  telefone: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  localizacao: string | null;
  cargo_atual: string | null;
  resumo_profissional: string | null;
  experiencias: {
    empresa: string;
    cargo: string;
    periodo: string | null;
    local: string | null;
    descricao: string | null;
    conquistas: string[];
  }[];
  formacao: {
    instituicao: string;
    curso: string;
    periodo: string | null;
    situacao: string | null;
  }[];
  cursos: { nome: string; instituicao: string | null; ano: string | null }[];
  certificacoes: { nome: string; emissor: string | null; ano: string | null }[];
  competencias_tecnicas: string[];
  soft_skills: string[];
  idiomas: { idioma: string; nivel: string | null }[];
  projetos: { nome: string; descricao: string | null; tecnologias: string[] }[];
};

export type AtsAnalysis = {
  ats_score: number;
  criterios: { nome: string; nota: number; comentario: string }[];
  pontos_fortes: string[];
  problemas: string[];
  recomendacoes: string[];
  palavras_chave_detectadas: string[];
};

export type ParsedJob = {
  empresa: string | null;
  cargo: string | null;
  localizacao: string | null;
  modalidade: WorkMode | null;
  senioridade: Seniority | null;
  salario: string | null;
  responsabilidades: string[];
  requisitos_obrigatorios: string[];
  requisitos_desejaveis: string[];
  competencias: string[];
  ferramentas: string[];
  tecnologias: string[];
  palavras_chave: string[];
  beneficios: string[];
  resumo: string | null;
};

export type MatchStrength = { titulo: string; detalhe: string };
export type MatchGap = {
  titulo: string;
  detalhe: string;
  impacto: "alto" | "medio" | "baixo";
};
export type RecommendationDraft = {
  titulo: string;
  detalhe: string;
  prioridade: "alta" | "media" | "baixa";
  categoria: string;
  link?: string | null;
};

export type MatchComputation = {
  match_score: number;
  ats_score: number;
  experiencia: number;
  competencias: number;
  palavras_chave: number;
  senioridade: number;
  formacao: number;
  resumo: string;
  pontos_fortes: MatchStrength[];
  lacunas: MatchGap[];
  recomendacoes: RecommendationDraft[];
  palavras_chave_faltantes: string[];
};

export type OptimizedResumeContent = {
  nome: string;
  cargo_alvo: string;
  contato: {
    email: string | null;
    telefone: string | null;
    localizacao: string | null;
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
  };
  resumo: string;
  competencias: string[];
  experiencias: {
    cargo: string;
    empresa: string;
    periodo: string | null;
    bullets: string[];
  }[];
  formacao: { curso: string; instituicao: string; periodo: string | null }[];
  certificacoes: string[];
  idiomas: string[];
  projetos: { nome: string; descricao: string }[];
  palavras_chave_aplicadas: string[];
  ats_score_estimado: number;
};

export type CoverLetterDraft = { titulo: string; conteudo: string };

/* ---------- Helpers de apresentação ---------- */

export function scoreBand(score: number): {
  label: string;
  tone: "destructive" | "warning" | "brand" | "success";
} {
  if (score < 50) return { label: "Necessita melhorias", tone: "destructive" };
  if (score < 70) return { label: "Regular", tone: "warning" };
  if (score < 85) return { label: "Bom", tone: "brand" };
  return { label: "Excelente", tone: "success" };
}
