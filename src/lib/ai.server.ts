/**
 * Cliente seguro do Lovable AI Gateway.
 *
 * A chave `LOVABLE_API_KEY` é gerenciada automaticamente pelo Lovable Cloud e
 * vive APENAS no servidor. Nunca é exposta ao frontend.
 *
 * Caso queira usar sua própria chave da OpenAI no futuro, configure o secret
 * `OPENAI_API_KEY` no backend e troque `GATEWAY_URL`/headers abaixo — nenhum
 * componente do frontend precisa ser alterado.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const AI_MODEL = "google/gemini-3.7-flash";

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function friendlyMessage(status: number, raw: string): string {
  if (status === 429)
    return "Muitas solicitações em sequência. Aguarde alguns segundos e tente novamente.";
  if (status === 402)
    return "Os créditos de IA do espaço de trabalho acabaram. Adicione créditos para continuar usando a análise inteligente.";
  if (status === 403)
    return "O acesso à IA está bloqueado para este projeto. Verifique as configurações do backend.";
  if (status === 401)
    return "A configuração da IA está incompleta. A chave de API não foi encontrada no servidor.";
  if (status === 400)
    return "Não foi possível processar este conteúdo. Tente reduzir o tamanho do texto enviado.";
  return raw || "O serviço de IA está indisponível no momento. Tente novamente.";
}

type JsonRequest = {
  system: string;
  user: string;
  maxTokens?: number;
};

/** Chama o modelo e devolve JSON validado. Lança AiError com mensagem amigável. */
export async function aiJson<T>(req: JsonRequest): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError(friendlyMessage(401, ""), 401);

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        response_format: { type: "json_object" },
        max_tokens: req.maxTokens ?? 4000,
        messages: [
          {
            role: "system",
            content:
              req.system +
              "\n\nRegras invioláveis: nunca invente empresas, cargos, datas, certificações, resultados ou tecnologias. Trabalhe exclusivamente com as informações fornecidas. Responda SEMPRE em português do Brasil e SEMPRE com um único objeto JSON válido, sem markdown e sem texto fora do JSON.",
          },
          { role: "user", content: req.user },
        ],
      }),
    });
  } catch {
    throw new AiError(
      "Não foi possível falar com o serviço de IA. Verifique sua conexão e tente novamente.",
      503,
    );
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new AiError(friendlyMessage(response.status, ""), response.status);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content)
    throw new AiError("A IA retornou uma resposta vazia. Tente novamente.", 502);

  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1)) as T;
      } catch {
        /* cai no erro abaixo */
      }
    }
    throw new AiError(
      "A IA retornou um formato inesperado. Tente novamente em instantes.",
      502,
    );
  }
}

/** Limita o texto enviado ao modelo para evitar estourar o limite de tokens. */
export function clamp(text: string | null | undefined, max = 18000): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "\n[...texto truncado...]" : text;
}

export function clampScore(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}
