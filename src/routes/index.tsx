import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Download,
  Loader2,
  Target,
  FileText,
  User,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import {
  analyzeMatch,
  buildResume,
  fetchJobFromUrl,
  type MatchResult,
  type OptimizedResume,
  type PublicProfile,
} from "@/lib/public-ai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emprego Agora — Match de vagas e currículo ATS com IA" },
      {
        name: "description",
        content:
          "Compare seu perfil com qualquer vaga, veja seu score de compatibilidade e gere um currículo otimizado para ATS em segundos. Sem cadastro.",
      },
      { property: "og:title", content: "Emprego Agora — Match de vagas e currículo ATS com IA" },
      {
        property: "og:description",
        content:
          "Score de compatibilidade, pontos fortes, lacunas e currículo otimizado para ATS. Direto no navegador, sem login.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EMPTY: PublicProfile = {
  nome: "",
  cargo_alvo: "",
  email: "",
  telefone: "",
  localizacao: "",
  linkedin: "",
  resumo: "",
  experiencias: "",
  formacao: "",
  habilidades: "",
  idiomas: "",
};

const STORAGE_KEY = "emprego-agora:perfil";

function useProfile() {
  const [profile, setProfile] = useState<PublicProfile>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile({ ...EMPTY, ...(JSON.parse(raw) as PublicProfile) });
    } catch {
      /* ignora perfil corrompido */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* armazenamento indisponível */
    }
  }, [profile, loaded]);

  return { profile, setProfile };
}

function scoreTone(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function resumeToText(r: OptimizedResume): string {
  const lines: string[] = [r.nome.toUpperCase()];
  if (r.cargo_alvo) lines.push(r.cargo_alvo);
  if (r.contato) lines.push(r.contato);
  lines.push("", "RESUMO PROFISSIONAL", r.resumo);
  if (r.competencias.length) lines.push("", "COMPETÊNCIAS", r.competencias.join(" • "));
  if (r.experiencias.length) {
    lines.push("", "EXPERIÊNCIA PROFISSIONAL");
    for (const e of r.experiencias) {
      lines.push(`${e.cargo} — ${e.empresa}${e.periodo ? ` (${e.periodo})` : ""}`);
      for (const b of e.bullets) lines.push(`- ${b}`);
      lines.push("");
    }
  }
  if (r.formacao.length) lines.push("FORMAÇÃO", ...r.formacao.map((f) => `- ${f}`), "");
  if (r.idiomas.length) lines.push("IDIOMAS", r.idiomas.join(" • "));
  return lines.join("\n").trim();
}

function Index() {
  const { profile, setProfile } = useProfile();
  const [job, setJob] = useState("");
  const [url, setUrl] = useState("");
  const [tab, setTab] = useState("perfil");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [resume, setResume] = useState<OptimizedResume | null>(null);
  const [loading, setLoading] = useState<null | "url" | "match" | "resume">(null);

  const runMatch = useServerFn(analyzeMatch);
  const runResume = useServerFn(buildResume);
  const runFetch = useServerFn(fetchJobFromUrl);

  const set = (k: keyof PublicProfile) => (v: string) => setProfile((p) => ({ ...p, [k]: v }));

  const completion = useMemo(() => {
    const fields = Object.values(profile).filter((v) => v.trim().length > 0).length;
    return Math.round((fields / Object.keys(EMPTY).length) * 100);
  }, [profile]);

  const err = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "Algo deu errado. Tente novamente.");

  async function importUrl() {
    setLoading("url");
    try {
      const { text } = await runFetch({ data: { url } });
      setJob(text);
      toast.success("Descrição da vaga importada.");
    } catch (e) {
      err(e);
    } finally {
      setLoading(null);
    }
  }

  async function doMatch() {
    setLoading("match");
    try {
      const result = await runMatch({ data: { profile, job } });
      setMatch(result);
      setTab("match");
    } catch (e) {
      err(e);
    } finally {
      setLoading(null);
    }
  }

  async function doResume() {
    setLoading("resume");
    try {
      const result = await runResume({ data: { profile, job } });
      setResume(result);
      setTab("curriculo");
    } catch (e) {
      err(e);
    } finally {
      setLoading(null);
    }
  }

  function downloadTxt() {
    if (!resume) return;
    const blob = new Blob([resumeToText(resume)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `curriculo-${resume.nome.replace(/\s+/g, "-").toLowerCase() || "ats"}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />

      <header className="no-print border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-base font-bold leading-none">Emprego Agora</p>
              <p className="text-xs text-muted-foreground">Match de vagas + currículo ATS</p>
            </div>
          </div>
          <Badge className="bg-ai text-ai-foreground hover:bg-ai">Sem cadastro</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <section className="no-print mb-8 text-center">
          <h1 className="text-3xl leading-tight sm:text-4xl">
            Descubra seu <span className="text-gradient-brand">match</span> com a vaga e gere um
            currículo aprovado por ATS
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Preencha seu perfil uma vez (fica salvo neste navegador), cole a vaga e deixe a
            inteligência artificial fazer o resto.
          </p>
        </section>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="no-print grid w-full grid-cols-3">
            <TabsTrigger value="perfil">
              <User className="mr-1.5 size-4" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="match">
              <Target className="mr-1.5 size-4" /> Vaga & Match
            </TabsTrigger>
            <TabsTrigger value="curriculo">
              <FileText className="mr-1.5 size-4" /> Currículo
            </TabsTrigger>
          </TabsList>

          {/* PERFIL */}
          <TabsContent value="perfil" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Seu perfil base</CardTitle>
                <CardDescription>
                  Salvo automaticamente apenas neste navegador. Perfil {completion}% preenchido.
                </CardDescription>
                <Progress value={completion} className="mt-2 h-2" />
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo" value={profile.nome} onChange={set("nome")} />
                <Field
                  label="Cargo desejado"
                  value={profile.cargo_alvo}
                  onChange={set("cargo_alvo")}
                  placeholder="Analista de Dados Pleno"
                />
                <Field label="E-mail" value={profile.email} onChange={set("email")} />
                <Field label="Telefone" value={profile.telefone} onChange={set("telefone")} />
                <Field
                  label="Cidade / Estado"
                  value={profile.localizacao}
                  onChange={set("localizacao")}
                />
                <Field label="LinkedIn ou portfólio" value={profile.linkedin} onChange={set("linkedin")} />
                <Area
                  className="sm:col-span-2"
                  label="Resumo profissional"
                  value={profile.resumo}
                  onChange={set("resumo")}
                  placeholder="Quem você é profissionalmente, em 3 a 5 linhas."
                />
                <Area
                  className="sm:col-span-2"
                  label="Experiências"
                  rows={7}
                  value={profile.experiencias}
                  onChange={set("experiencias")}
                  placeholder={"Cargo — Empresa (2022–2025)\n- O que você fez e resultados reais\n\nCargo — Empresa (2019–2022)\n- ..."}
                />
                <Area
                  label="Formação e cursos"
                  value={profile.formacao}
                  onChange={set("formacao")}
                  placeholder="Curso — Instituição (ano)"
                />
                <Area
                  label="Habilidades e ferramentas"
                  value={profile.habilidades}
                  onChange={set("habilidades")}
                  placeholder="SQL, Python, Power BI, gestão de projetos..."
                />
                <Field
                  className="sm:col-span-2"
                  label="Idiomas"
                  value={profile.idiomas}
                  onChange={set("idiomas")}
                  placeholder="Português nativo, Inglês avançado"
                />
                <div className="sm:col-span-2">
                  <Button className="w-full sm:w-auto" onClick={() => setTab("match")}>
                    Continuar para a vaga
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MATCH */}
          <TabsContent value="match" className="mt-6 space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>A vaga</CardTitle>
                <CardDescription>Cole o link ou o texto completo do anúncio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    inputMode="url"
                  />
                  <Button
                    variant="secondary"
                    onClick={importUrl}
                    disabled={!url.trim() || loading !== null}
                  >
                    {loading === "url" ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-1.5 size-4" />
                    )}
                    Importar do link
                  </Button>
                </div>
                <Textarea
                  rows={10}
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  placeholder="Cole aqui a descrição da vaga: responsabilidades, requisitos, tecnologias..."
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={doMatch} disabled={loading !== null} className="sm:w-auto">
                    {loading === "match" ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Target className="mr-1.5 size-4" />
                    )}
                    Calcular compatibilidade
                  </Button>
                  <Button
                    variant="outline"
                    onClick={doResume}
                    disabled={loading !== null}
                    className="sm:w-auto"
                  >
                    {loading === "resume" ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 size-4" />
                    )}
                    Gerar currículo para esta vaga
                  </Button>
                </div>
              </CardContent>
            </Card>

            {match && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-soft md:col-span-2">
                  <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-center">
                    <div className="text-center">
                      <p className={`text-6xl font-extrabold ${scoreTone(match.match_score)}`}>
                        {match.match_score}%
                      </p>
                      <p className="text-xs text-muted-foreground">compatibilidade</p>
                    </div>
                    <div className="flex-1 space-y-3">
                      <Progress value={match.match_score} className="h-3" />
                      <p className="text-sm text-muted-foreground">{match.resumo}</p>
                      <div className="flex flex-wrap gap-2">
                        {match.vaga.cargo && <Badge variant="secondary">{match.vaga.cargo}</Badge>}
                        {match.vaga.empresa && (
                          <Badge variant="secondary">{match.vaga.empresa}</Badge>
                        )}
                        {match.vaga.senioridade && (
                          <Badge variant="secondary">{match.vaga.senioridade}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {match.criterios.length > 0 && (
                  <Card className="shadow-soft md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Critérios avaliados</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      {match.criterios.map((c, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span>{c.nome}</span>
                            <span className="font-semibold">{c.nota}%</span>
                          </div>
                          <Progress value={c.nota} className="h-2" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="size-4 text-success" /> Pontos fortes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {match.pontos_fortes.map((p, i) => (
                      <p key={i}>• {p}</p>
                    ))}
                  </CardContent>
                </Card>

                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="size-4 text-warning" /> Lacunas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {match.lacunas.map((p, i) => (
                      <p key={i}>• {p}</p>
                    ))}
                  </CardContent>
                </Card>

                {match.palavras_chave_faltantes.length > 0 && (
                  <Card className="shadow-soft md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Palavras-chave ausentes no perfil</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {match.palavras_chave_faltantes.map((k, i) => (
                        <Badge key={i} className="bg-ai text-ai-foreground hover:bg-ai">
                          {k}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* CURRÍCULO */}
          <TabsContent value="curriculo" className="mt-6">
            {!resume ? (
              <Card className="shadow-soft">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Preencha o perfil, cole a vaga e clique em “Gerar currículo para esta vaga”.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="no-print flex flex-wrap items-center gap-2">
                  <Badge className="bg-ai text-ai-foreground hover:bg-ai">
                    ATS estimado: {resume.ats_score_estimado}%
                  </Badge>
                  <div className="flex-1" />
                  <Button variant="outline" onClick={downloadTxt}>
                    <Download className="mr-1.5 size-4" /> Baixar .txt
                  </Button>
                  <Button onClick={() => window.print()}>
                    <Printer className="mr-1.5 size-4" /> Salvar em PDF
                  </Button>
                </div>

                <Card className="shadow-soft">
                  <CardContent className="space-y-5 p-8 text-sm leading-relaxed">
                    <div className="text-center">
                      <h2 className="text-2xl">{resume.nome}</h2>
                      <p className="text-muted-foreground">{resume.cargo_alvo}</p>
                      <p className="text-xs text-muted-foreground">{resume.contato}</p>
                    </div>
                    <Separator />
                    <Block title="Resumo profissional">
                      <p>{resume.resumo}</p>
                    </Block>
                    {resume.competencias.length > 0 && (
                      <Block title="Competências">
                        <div className="flex flex-wrap gap-1.5">
                          {resume.competencias.map((c, i) => (
                            <Badge key={i} variant="secondary">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </Block>
                    )}
                    {resume.experiencias.length > 0 && (
                      <Block title="Experiência profissional">
                        <div className="space-y-4">
                          {resume.experiencias.map((e, i) => (
                            <div key={i}>
                              <p className="font-semibold">
                                {e.cargo} — {e.empresa}
                              </p>
                              {e.periodo && (
                                <p className="text-xs text-muted-foreground">{e.periodo}</p>
                              )}
                              <ul className="mt-1 list-disc space-y-1 pl-5">
                                {e.bullets.map((b, j) => (
                                  <li key={j}>{b}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </Block>
                    )}
                    {resume.formacao.length > 0 && (
                      <Block title="Formação">
                        <ul className="list-disc space-y-1 pl-5">
                          {resume.formacao.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </Block>
                    )}
                    {resume.idiomas.length > 0 && (
                      <Block title="Idiomas">
                        <p>{resume.idiomas.join(" • ")}</p>
                      </Block>
                    )}
                  </CardContent>
                </Card>

                {resume.palavras_chave_aplicadas.length > 0 && (
                  <Card className="no-print shadow-soft">
                    <CardHeader>
                      <CardTitle className="text-base">Palavras-chave da vaga aplicadas</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {resume.palavras_chave_aplicadas.map((k, i) => (
                        <Badge key={i} variant="secondary">
                          {k}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">{title}</h3>
      {children}
    </section>
  );
}

function slug(label: string) {
  return (
    "f-" +
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = slug(label);
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}) {
  const id = slug(label);
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
