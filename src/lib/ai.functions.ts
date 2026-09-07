import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { aiJson, clamp, clampScore, AiError } from "./ai.server";
import type {
  AtsAnalysis,
  CoverLetterDraft,
  MatchComputation,
  OptimizedResumeContent,
  ParsedJob,
  ParsedResume,
  RecommendationDraft,
} from "@/types/domain";

function fail(error: unknown): never {
  if (error instanceof AiError) throw new Error(error.message);
  throw new Error(
    error instanceof Error
      ? error.message
      : "Algo deu errado. Tente novamente em instantes.",
  );
}

async function notify(
  supabase: { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } },
  userId: string,
  title: string,
  body: string,
  type: string,
  link?: string,
) {
  await supabase
    .from("notifications")
    .insert({ user_id: userId, title, body, type, link: link ?? null });
}

/* ------------------------------------------------------------------ */
/* 1. analyze_resume — extrai dados estruturados + análise ATS         */
/* ------------------------------------------------------------------ */
export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: resume, error } = await supabase
      .from("resumes")
      .select("id, raw_text, title")
      .eq("id", data.resumeId)
      .single();
    if (error || !resume) throw new Error("Currículo não encontrado.");
    if (!resume.raw_text || resume.raw_text.trim().length < 60) {
      await supabase
        .from("resumes")
        .update({
          status: "error",
          error_message:
            "Não conseguimos ler texto suficiente neste arquivo. Envie um PDF com texto selecionável ou um DOCX.",
        })
        .eq("id", resume.id);
      throw new Error(
        "Não conseguimos ler texto suficiente neste arquivo. Envie um PDF com texto selecionável ou um DOCX.",
      );
    }

    await supabase.from("resumes").update({ status: "analyzing" }).eq("id", resume.id);

    try {
      const parsed = await aiJson<ParsedResume>({
        system:
          "Você é um especialista em análise de currículos e sistemas ATS. Extraia apenas o que estiver escrito no currículo. Se um campo não existir, use null ou lista vazia.",
        user: `Extraia os dados deste currículo no JSON exato:
{"nome":string|null,"email":string|null,"telefone":string|null,"linkedin":string|null,"github":string|null,"portfolio":string|null,"localizacao":string|null,"cargo_atual":string|null,"resumo_profissional":string|null,
"experiencias":[{"empresa":string,"cargo":string,"periodo":string|null,"local":string|null,"descricao":string|null,"conquistas":string[]}],
"formacao":[{"instituicao":string,"curso":string,"periodo":string|null,"situacao":string|null}],
"cursos":[{"nome":string,"instituicao":string|null,"ano":string|null}],
"certificacoes":[{"nome":string,"emissor":string|null,"ano":string|null}],
"competencias_tecnicas":string[],"soft_skills":string[],
"idiomas":[{"idioma":string,"nivel":string|null}],
"projetos":[{"nome":string,"descricao":string|null,"tecnologias":string[]}]}

CURRÍCULO:
${clamp(resume.raw_text)}`,
      });

      const ats = await aiJson<AtsAnalysis>({
        system:
          "Você é um auditor de compatibilidade com sistemas ATS (Applicant Tracking Systems). Avalie de forma rigorosa e construtiva.",
        user: `Avalie o currículo abaixo quanto a: palavras-chave, estrutura, clareza, descrição de experiências, competências, formação, títulos profissionais, formatação e legibilidade por ATS.

Responda no JSON exato:
{"ats_score":number(0-100),
"criterios":[{"nome":string,"nota":number(0-100),"comentario":string}],
"pontos_fortes":string[],
"problemas":string[],
"recomendacoes":string[],
"palavras_chave_detectadas":string[]}

CURRÍCULO:
${clamp(resume.raw_text)}`,
      });

      const score = clampScore(ats.ats_score);
      await supabase
        .from("resumes")
        .update({
          parsed: parsed as unknown as Json,
          ats_analysis: { ...ats, ats_score: score } as unknown as Json,
          ats_score: score,
          status: "completed",
          error_message: null,
          title: parsed.cargo_atual ? `Currículo — ${parsed.cargo_atual}` : resume.title,
        })
        .eq("id", resume.id);

      await notify(
        supabase as never,
        userId,
        "Análise do currículo concluída",
        `Seu ATS Score é ${score}/100.`,
        "success",
        "/resume",
      );

      return { atsScore: score, parsed, ats };
    } catch (e) {
      await supabase
        .from("resumes")
        .update({
          status: "error",
          error_message: e instanceof Error ? e.message : "Erro na análise.",
        })
        .eq("id", resume.id);
      fail(e);
    }
  });

/* ------------------------------------------------------------------ */
/* 2. analyze_job — extrai a vaga e salva                              */
/* ------------------------------------------------------------------ */
export const analyzeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rawText?: string; sourceUrl?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let text = (data.rawText ?? "").trim();
    const url = (data.sourceUrl ?? "").trim();

    // Extração a partir da URL: algumas plataformas bloqueiam robôs.
    // Nesse caso pedimos que o usuário cole o texto manualmente.
    if (!text && url) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; EmpregoAgoraBot/1.0)" },
        });
        if (!res.ok) throw new Error();
        const html = await res.text();
        text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch {
        throw new Error(
          "Esta plataforma não permite a leitura automática da vaga. Copie e cole o texto da vaga no campo abaixo.",
        );
      }
    }

    if (text.length < 80)
      throw new Error(
        "Não encontramos conteúdo suficiente da vaga. Cole o texto completo do anúncio.",
      );

    try {
      const parsed = await aiJson<ParsedJob>({
        system:
          "Você é um especialista em recrutamento e seleção. Extraia somente o que está escrito no anúncio da vaga.",
        user: `Extraia os dados desta vaga no JSON exato:
{"empresa":string|null,"cargo":string|null,"localizacao":string|null,"modalidade":"Remoto"|"Híbrido"|"Presencial"|null,"senioridade":"Estágio"|"Júnior"|"Pleno"|"Sênior"|"Especialista"|null,"salario":string|null,
"responsabilidades":string[],"requisitos_obrigatorios":string[],"requisitos_desejaveis":string[],
"competencias":string[],"ferramentas":string[],"tecnologias":string[],"palavras_chave":string[],"beneficios":string[],"resumo":string|null}

VAGA:
${clamp(text)}`,
      });

      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          user_id: userId,
          company: parsed.empresa,
          title: parsed.cargo,
          location: parsed.localizacao,
          work_mode: parsed.modalidade,
          seniority: parsed.senioridade,
          salary: parsed.salario,
          source_url: url || null,
          raw_text: text.slice(0, 40000),
          responsibilities: parsed.responsabilidades ?? [],
          required_skills: parsed.requisitos_obrigatorios ?? [],
          desired_skills: parsed.requisitos_desejaveis ?? [],
          tools: [...(parsed.ferramentas ?? []), ...(parsed.tecnologias ?? [])],
          keywords: parsed.palavras_chave ?? [],
          parsed: parsed as unknown as Json,
          status: "analyzed",
        })
        .select("id")
        .single();
      if (error || !job) throw new Error("Não foi possível salvar a vaga.");

      await notify(
        supabase as never,
        userId,
        "Vaga analisada",
        `${parsed.cargo ?? "Vaga"}${parsed.empresa ? ` — ${parsed.empresa}` : ""}`,
        "info",
        "/jobs",
      );

      return { jobId: job.id as string };
    } catch (e) {
      fail(e);
    }
  });

/* ------------------------------------------------------------------ */
/* 3. calculate_match — compara currículo x vaga                        */
/* ------------------------------------------------------------------ */
export const calculateMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string; resumeId?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (!job) throw new Error("Vaga não encontrada.");

    let resumeQuery = supabase
      .from("resumes")
      .select("id, raw_text, parsed, ats_score")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);
    if (data.resumeId) resumeQuery = resumeQuery.eq("id", data.resumeId);
    const { data: resumes } = await resumeQuery;
    const resume = resumes?.[0];
    if (!resume)
      throw new Error(
        "Você ainda não possui um currículo analisado. Envie seu currículo primeiro.",
      );

    const { data: profile } = await supabase
      .from("profiles")
      .select("desired_role, seniority, location, work_mode, skills")
      .eq("id", userId)
      .single();

    try {
      const result = await aiJson<MatchComputation>({
        system:
          "Você é um avaliador imparcial de compatibilidade entre candidato e vaga. Nunca afirme que o candidato NÃO possui algo — diga apenas que não foi identificado no currículo.",
        user: `Compare o currículo com a vaga e calcule a compatibilidade.

Responda no JSON exato:
{"match_score":number(0-100),"ats_score":number(0-100),"experiencia":number(0-100),"competencias":number(0-100),"palavras_chave":number(0-100),"senioridade":number(0-100),"formacao":number(0-100),
"resumo":string,
"pontos_fortes":[{"titulo":string,"detalhe":string}],
"lacunas":[{"titulo":string,"detalhe":string,"impacto":"alto"|"medio"|"baixo"}],
"recomendacoes":[{"titulo":string,"detalhe":string,"prioridade":"alta"|"media"|"baixa","categoria":"competencia"|"curso"|"certificacao"|"projeto"|"tecnologia"|"linkedin"|"github"|"curriculo"}],
"palavras_chave_faltantes":string[]}

PERFIL DECLARADO: ${JSON.stringify(profile ?? {})}

VAGA:
Cargo: ${job.title ?? "-"} | Empresa: ${job.company ?? "-"} | Local: ${job.location ?? "-"} | Modalidade: ${job.work_mode ?? "-"} | Senioridade: ${job.seniority ?? "-"}
Requisitos obrigatórios: ${(job.required_skills ?? []).join(", ")}
Requisitos desejáveis: ${(job.desired_skills ?? []).join(", ")}
Ferramentas/Tecnologias: ${(job.tools ?? []).join(", ")}
Palavras-chave: ${(job.keywords ?? []).join(", ")}
Texto: ${clamp(job.raw_text, 8000)}

CURRÍCULO (estruturado): ${clamp(JSON.stringify(resume.parsed ?? {}), 8000)}
CURRÍCULO (texto): ${clamp(resume.raw_text, 6000)}`,
      });

      const { data: match, error } = await supabase
        .from("match_results")
        .insert({
          user_id: userId,
          resume_id: resume.id,
          job_id: job.id,
          match_score: clampScore(result.match_score),
          ats_score: clampScore(result.ats_score, resume.ats_score ?? 0),
          experience_score: clampScore(result.experiencia),
          skills_score: clampScore(result.competencias),
          keywords_score: clampScore(result.palavras_chave),
          seniority_score: clampScore(result.senioridade),
          education_score: clampScore(result.formacao),
          strengths: result.pontos_fortes ?? [],
          gaps: result.lacunas ?? [],
          recommendations: result.recomendacoes ?? [],
          summary: result.resumo ?? null,
        })
        .select("id, match_score")
        .single();
      if (error || !match) throw new Error("Não foi possível salvar o resultado.");

      const recs = (result.recomendacoes ?? []).slice(0, 12).map((r) => ({
        user_id: userId,
        job_id: job.id,
        priority:
          r.prioridade === "alta" ? "alta" : r.prioridade === "baixa" ? "baixa" : "media",
        category: r.categoria ?? "competencia",
        title: r.titulo,
        description: r.detalhe,
      }));
      if (recs.length) await supabase.from("career_recommendations").insert(recs);

      const score = match.match_score as number;
      await notify(
        supabase as never,
        userId,
        score >= 80 ? `Match de ${score}% encontrado!` : "Análise de match concluída",
        `${job.title ?? "Vaga"}${job.company ? ` — ${job.company}` : ""}: ${score}% de compatibilidade.`,
        score >= 80 ? "success" : "info",
        `/matches/${match.id}`,
      );

      return { matchId: match.id as string };
    } catch (e) {
      fail(e);
    }
  });

/* ------------------------------------------------------------------ */
/* 4. optimize_resume — gera currículo ATS para a vaga                  */
/* ------------------------------------------------------------------ */
export const optimizeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: match } = await supabase
      .from("match_results")
      .select("id, resume_id, job_id")
      .eq("id", data.matchId)
      .single();
    if (!match) throw new Error("Match não encontrado.");

    const [{ data: resume }, { data: job }] = await Promise.all([
      supabase
        .from("resumes")
        .select("raw_text, parsed")
        .eq("id", match.resume_id as string)
        .single(),
      supabase.from("jobs").select("*").eq("id", match.job_id as string).single(),
    ]);
    if (!resume || !job) throw new Error("Dados insuficientes para gerar o currículo.");

    try {
      const content = await aiJson<OptimizedResumeContent>({
        system:
          "Você reescreve currículos para máxima compatibilidade com ATS. É terminantemente proibido criar empresas, cargos, datas, certificações, formações, resultados numéricos ou tecnologias que não estejam no currículo original. Você pode apenas reorganizar, reescrever com verbos de ação e destacar o que já existe.",
        user: `Gere uma versão do currículo otimizada para esta vaga, usando SOMENTE informações reais do currículo original.

Responda no JSON exato:
{"nome":string,"cargo_alvo":string,"contato":{"email":string|null,"telefone":string|null,"localizacao":string|null,"linkedin":string|null,"github":string|null,"portfolio":string|null},
"resumo":string,
"competencias":string[],
"experiencias":[{"cargo":string,"empresa":string,"periodo":string|null,"bullets":string[]}],
"formacao":[{"curso":string,"instituicao":string,"periodo":string|null}],
"certificacoes":string[],"idiomas":string[],"projetos":[{"nome":string,"descricao":string}],
"palavras_chave_aplicadas":string[],"ats_score_estimado":number(0-100)}

VAGA: ${job.title ?? ""} na ${job.company ?? ""}
Palavras-chave da vaga: ${(job.keywords ?? []).join(", ")}
Requisitos: ${(job.required_skills ?? []).join(", ")}

CURRÍCULO ORIGINAL (estruturado): ${clamp(JSON.stringify(resume.parsed ?? {}), 9000)}
CURRÍCULO ORIGINAL (texto): ${clamp(resume.raw_text, 7000)}`,
        maxTokens: 5000,
      });

      const plain = renderPlainResume(content);
      const { data: row, error } = await supabase
        .from("optimized_resumes")
        .insert({
          user_id: userId,
          resume_id: match.resume_id,
          job_id: match.job_id,
          match_id: match.id,
          title: `Currículo — ${job.title ?? "Vaga"}${job.company ? ` (${job.company})` : ""}`,
          content: content as unknown as Json,
          plain_text: plain,
          ats_score: clampScore(content.ats_score_estimado),
        })
        .select("id")
        .single();
      if (error || !row) throw new Error("Não foi possível salvar o currículo gerado.");

      await notify(
        supabase as never,
        userId,
        "Currículo ATS pronto",
        `Versão otimizada para ${job.title ?? "a vaga"} foi gerada.`,
        "success",
        "/ats",
      );

      return { optimizedId: row.id as string };
    } catch (e) {
      fail(e);
    }
  });

function renderPlainResume(c: OptimizedResumeContent): string {
  const lines: string[] = [];
  lines.push(c.nome ?? "");
  const contact = [
    c.contato?.email,
    c.contato?.telefone,
    c.contato?.localizacao,
    c.contato?.linkedin,
    c.contato?.github,
  ].filter(Boolean);
  if (contact.length) lines.push(contact.join(" | "));
  if (c.cargo_alvo) lines.push("", c.cargo_alvo.toUpperCase());
  if (c.resumo) lines.push("", "RESUMO PROFISSIONAL", c.resumo);
  if (c.competencias?.length)
    lines.push("", "COMPETÊNCIAS", c.competencias.join(" • "));
  if (c.experiencias?.length) {
    lines.push("", "EXPERIÊNCIA PROFISSIONAL");
    for (const e of c.experiencias) {
      lines.push(`${e.cargo} — ${e.empresa}${e.periodo ? ` (${e.periodo})` : ""}`);
      for (const b of e.bullets ?? []) lines.push(`- ${b}`);
    }
  }
  if (c.formacao?.length) {
    lines.push("", "FORMAÇÃO");
    for (const f of c.formacao)
      lines.push(`${f.curso} — ${f.instituicao}${f.periodo ? ` (${f.periodo})` : ""}`);
  }
  if (c.certificacoes?.length)
    lines.push("", "CERTIFICAÇÕES", ...c.certificacoes.map((x) => `- ${x}`));
  if (c.idiomas?.length) lines.push("", "IDIOMAS", c.idiomas.join(" • "));
  if (c.projetos?.length) {
    lines.push("", "PROJETOS");
    for (const p of c.projetos) lines.push(`${p.nome}: ${p.descricao}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* 5. generate_cover_letter                                            */
/* ------------------------------------------------------------------ */
export const generateCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string; resumeId?: string; tone?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (!job) throw new Error("Vaga não encontrada.");

    const { data: resumes } = await supabase
      .from("resumes")
      .select("id, raw_text, parsed")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);
    const resume = resumes?.[0];

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, desired_role, seniority, location, skills")
      .eq("id", userId)
      .single();

    try {
      const draft = await aiJson<CoverLetterDraft>({
        system: `Você escreve cartas de apresentação profissionais em português do Brasil, com tom ${data.tone ?? "profissional"}. Use apenas fatos presentes no currículo e no perfil.`,
        user: `Escreva uma carta de apresentação para esta vaga.

Responda no JSON exato: {"titulo":string,"conteudo":string}
O campo "conteudo" deve ter de 3 a 5 parágrafos, texto puro com quebras de linha duplas, sem markdown.

VAGA: ${job.title ?? ""} — ${job.company ?? ""}
Requisitos: ${(job.required_skills ?? []).join(", ")}
Palavras-chave: ${(job.keywords ?? []).join(", ")}
Descrição: ${clamp(job.raw_text, 5000)}

PERFIL: ${JSON.stringify(profile ?? {})}
CURRÍCULO: ${clamp(JSON.stringify(resume?.parsed ?? resume?.raw_text ?? {}), 7000)}`,
      });

      const { data: row, error } = await supabase
        .from("cover_letters")
        .insert({
          user_id: userId,
          job_id: job.id,
          resume_id: resume?.id ?? null,
          title:
            draft.titulo ||
            `Carta — ${job.title ?? "Vaga"}${job.company ? ` (${job.company})` : ""}`,
          content: draft.conteudo ?? "",
        })
        .select("id")
        .single();
      if (error || !row) throw new Error("Não foi possível salvar a carta.");

      await notify(
        supabase as never,
        userId,
        "Carta de apresentação pronta",
        `Carta gerada para ${job.title ?? "a vaga"}.`,
        "success",
        "/cover-letters",
      );

      return { coverLetterId: row.id as string };
    } catch (e) {
      fail(e);
    }
  });

/* ------------------------------------------------------------------ */
/* 6. generate_career_recommendations                                  */
/* ------------------------------------------------------------------ */
export const generateCareerRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: resumes }, { data: jobs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("resumes")
        .select("parsed, ats_analysis")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("jobs")
        .select("title, required_skills, keywords")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (!resumes?.length && !profile?.desired_role)
      throw new Error(
        "Complete seu perfil ou envie um currículo para receber recomendações.",
      );

    try {
      const out = await aiJson<{ recomendacoes: RecommendationDraft[] }>({
        system:
          "Você é um mentor de carreira. Priorize recursos gratuitos e caminhos realistas. Nunca invente experiências do usuário.",
        user: `Com base no perfil, currículo e vagas analisadas, gere de 8 a 12 recomendações de desenvolvimento.

JSON exato: {"recomendacoes":[{"titulo":string,"detalhe":string,"prioridade":"alta"|"media"|"baixa","categoria":"competencia"|"curso"|"certificacao"|"projeto"|"tecnologia"|"linkedin"|"github"|"curriculo","link":string|null}]}

PERFIL: ${JSON.stringify(profile ?? {})}
CURRÍCULO: ${clamp(JSON.stringify(resumes?.[0]?.parsed ?? {}), 6000)}
ANÁLISE ATS: ${clamp(JSON.stringify(resumes?.[0]?.ats_analysis ?? {}), 3000)}
VAGAS DE INTERESSE: ${clamp(JSON.stringify(jobs ?? []), 4000)}`,
      });

      const rows = (out.recomendacoes ?? []).slice(0, 12).map((r) => ({
        user_id: userId,
        priority:
          r.prioridade === "alta" ? "alta" : r.prioridade === "baixa" ? "baixa" : "media",
        category: r.categoria ?? "competencia",
        title: r.titulo,
        description: r.detalhe,
        resource_url: r.link ?? null,
      }));
      if (rows.length) await supabase.from("career_recommendations").insert(rows);
      return { created: rows.length };
    } catch (e) {
      fail(e);
    }
  });
