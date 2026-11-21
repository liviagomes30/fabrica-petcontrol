/**
 * Testes de aceite (QA) da feature 001-dashboard-data-hora-atual.
 *
 * Rastreabilidade:
 *  - US1 (cenários 1 a 3), FR-001 a FR-004, FR-006, FR-007, SC-001 a SC-003, SC-005
 *  - US2 (cenários 1 e 2), FR-005, SC-004
 *  - Edge cases: 1ª exibição, horário de verão, tela pequena (estrutural), aba em segundo plano
 *
 * Todos os testes usam relógio falso e mocks de actions: nenhum acesso a Supabase
 * real, nenhuma leitura de `.env.local` e nenhuma rede.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { RelogioBrasilia } from "@/app/(dashboard)/dashboard/_components/RelogioBrasilia";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import {
  buscarEstatisticasDashboard,
  buscarProximosCompromissos,
} from "@/app/(dashboard)/_actions/dashboard.actions";

vi.mock("@/app/(dashboard)/_actions/dashboard.actions", () => ({
  buscarEstatisticasDashboard: vi.fn(async () => ({
    success: true as const,
    data: {
      totalAnimais: 0,
      animaisDisponiveis: 0,
      animaisAdotados: 0,
      animaisEmTratamento: 0,
      vacinacoesPendentes: 0,
      medicacoesPendentes: 0,
      receitasAtivas: 0,
      protocolosAtivos: 0,
    },
  })),
  buscarProximosCompromissos: vi.fn(async () => ({
    success: true as const,
    data: [],
  })),
}));

const MARCADOR = "--/--/---- --:--:--";
const TESTID = "relogio-brasilia";
const TZ_ORIGINAL = process.env.TZ;
// Os scripts npm (`npm --prefix petcontrol-next run test`) executam a partir de petcontrol-next/.
const RAIZ = process.cwd();
if (!existsSync(path.join(RAIZ, "vitest.config.mts"))) {
  throw new Error(`Execute os testes a partir de petcontrol-next/ (cwd atual: ${RAIZ})`);
}

/**
 * Oráculo independente de Intl: o horário de Brasília é UTC-3 fixo desde 17/02/2019
 * (sem horário de verão). Usado para comparar com o texto exibido.
 */
function esperadoBrasilia(instante: Date, deslocamentoHoras = -3): string {
  const d = new Date(instante.getTime() + deslocamentoHoras * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}

/** Oráculo do horário de verão de 2018/2019: UTC-2 de 04/11/2018 03:00Z a 17/02/2019 02:00Z. */
function esperadoBrasiliaHistorico(instante: Date): string {
  const inicio = Date.UTC(2018, 10, 4, 3, 0, 0);
  const fim = Date.UTC(2019, 1, 17, 2, 0, 0);
  const emVerao = instante.getTime() >= inicio && instante.getTime() < fim;
  return esperadoBrasilia(instante, emVerao ? -2 : -3);
}

function textoRelogio(): string | null {
  return screen.getByTestId(TESTID).textContent;
}

function definirVisibilidade(estado: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => estado,
  });
}

function disparar(evento: "visibilitychange") {
  act(() => {
    document.dispatchEvent(new Event(evento));
  });
}

function avancar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Lista recursiva de arquivos .ts/.tsx de uma pasta. */
function listarFontes(diretorio: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(diretorio)) {
    const caminho = path.join(diretorio, nome);
    if (statSync(caminho).isDirectory()) {
      saida.push(...listarFontes(caminho));
    } else if (/\.tsx?$/.test(nome)) {
      saida.push(caminho);
    }
  }
  return saida;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-15T17:35:07Z"));
});

afterEach(() => {
  cleanup();
  if (TZ_ORIGINAL === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = TZ_ORIGINAL;
  }
  Reflect.deleteProperty(document, "visibilityState");
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("US1 - Ver data e hora atuais no dashboard", () => {
  it("cenário 1: exibe dd/MM/aaaa HH:mm:ss em 24 h (exemplo da spec: 15/11/2026 14:35:07)", () => {
    render(<RelogioBrasilia />);
    const texto = textoRelogio() ?? "";
    expect(texto).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    expect(texto).toBe("15/11/2026 14:35:07");
  });

  it("cenário 2: o texto é vermelho (text-red-700) e está em elemento <time>", () => {
    render(<RelogioBrasilia />);
    const el = screen.getByTestId(TESTID);
    expect(el.tagName).toBe("TIME");
    expect(el.classList.contains("text-red-700")).toBe(true);
  });

  it.each([
    ["Asia/Tokyo", "+09:00"],
    ["America/New_York", "-05:00"],
    ["Europe/London", "+00:00"],
    ["Pacific/Auckland", "+13:00"],
    ["Asia/Kolkata", "+05:30"],
  ])(
    "cenário 3 (SC-002): dispositivo em %s (%s) continua mostrando horário de Brasília",
    (tz) => {
      process.env.TZ = tz;
      // Prova que a troca de fuso teve efeito antes de confiar no resultado.
      const deslocamentoDispositivo = new Date("2026-11-15T17:35:07Z").getTimezoneOffset();
      expect(deslocamentoDispositivo).not.toBe(180);

      render(<RelogioBrasilia />);
      expect(textoRelogio()).toBe("15/11/2026 14:35:07");
    },
  );

  it.each([
    "2026-11-15T17:35:07Z",
    "2026-11-16T02:59:59Z",
    "2026-11-16T03:00:00Z",
    "2026-12-31T23:59:59Z",
    "2028-02-29T12:00:00Z",
  ])(
    "SC-001/SC-002: %s coincide com o relógio convertido para America/Sao_Paulo em dois fusos do dispositivo",
    (iso) => {
      const instante = new Date(iso);
      for (const tz of ["Asia/Tokyo", "America/New_York"]) {
        process.env.TZ = tz;
        vi.setSystemTime(instante);
        const { unmount } = render(<RelogioBrasilia />);
        expect(textoRelogio()).toBe(esperadoBrasilia(instante));
        unmount();
      }
    },
  );

  it("SC-003 (estrutural): o relógio fica no cabeçalho do dashboard, junto ao título", async () => {
    const pagina = await DashboardPage();
    render(pagina);
    const relogio = screen.getByTestId(TESTID);
    const titulo = screen.getByRole("heading", { level: 1 });
    // Cabeçalho = contêiner que envolve o bloco do título e o relógio.
    const cabecalho = titulo.parentElement?.parentElement;
    expect(cabecalho).toBeDefined();
    expect(cabecalho?.contains(relogio)).toBe(true);
    expect(textoRelogio()).toBe("15/11/2026 14:35:07");
  });
});

describe("US2 - Manter o horário atualizado enquanto a tela está aberta", () => {
  it("cenário 1: após 1 s o horário avança para o novo segundo, sem recarregar", () => {
    render(<RelogioBrasilia />);
    expect(textoRelogio()).toBe("15/11/2026 14:35:07");
    avancar(1000);
    expect(textoRelogio()).toBe("15/11/2026 14:35:08");
    avancar(1000);
    expect(textoRelogio()).toBe("15/11/2026 14:35:09");
  });

  it("cenário 2: na virada do dia 15/11 23:59:59 -> 16/11 00:00:00 a data avança", () => {
    vi.setSystemTime(new Date("2026-11-16T02:59:59Z"));
    render(<RelogioBrasilia />);
    expect(textoRelogio()).toBe("15/11/2026 23:59:59");
    avancar(1000);
    expect(textoRelogio()).toBe("16/11/2026 00:00:00");
  });

  it("SC-004: após 5 minutos o horário continua dentro de 1 s do relógio convertido (verificado a cada segundo)", () => {
    vi.setSystemTime(new Date("2026-11-15T17:35:07.300Z"));
    render(<RelogioBrasilia />);
    // Confere a cada segundo: o desvio nunca passa de 1 s (SC-004) e aqui é de 0 s,
    // pois o relógio falso é exato. Como o tique se alinha ao segundo cheio, a
    // comparação é feita contra o segundo corrente do relógio.
    for (let segundo = 1; segundo <= 300; segundo++) {
      avancar(1000);
      expect(textoRelogio()).toBe(esperadoBrasilia(new Date()));
    }
    expect(textoRelogio()).toBe("15/11/2026 14:40:07");
  });

  it("aba em segundo plano: ao voltar à aba o horário já está correto, sem esperar o próximo tique", () => {
    render(<RelogioBrasilia />);
    definirVisibilidade("hidden");
    disparar("visibilitychange");
    // Navegador congela temporizadores em aba oculta: o relógio anda, mas não há tiques.
    vi.setSystemTime(new Date("2026-11-15T17:36:07Z"));
    definirVisibilidade("visible");
    disparar("visibilitychange");
    expect(textoRelogio()).toBe("15/11/2026 14:36:07");
    expect(textoRelogio()).toBe(esperadoBrasilia(new Date()));
  });
});

describe("Edge cases", () => {
  it("1ª exibição: o HTML do servidor traz só o marcador, nunca um horário de outro fuso", () => {
    process.env.TZ = "Asia/Tokyo";
    const html = renderToString(<RelogioBrasilia />);
    expect(html).toContain(MARCADOR);
    expect(html).not.toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
    expect(html).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("1ª exibição: a hidratação não gera aviso de mismatch e troca o marcador pela hora correta", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<RelogioBrasilia />);
    document.body.appendChild(container);
    expect(container.textContent).toBe(MARCADOR);

    const erros = vi.spyOn(console, "error").mockImplementation(() => {});
    let raiz: Root | undefined;
    act(() => {
      raiz = hydrateRoot(container, <RelogioBrasilia />);
    });

    expect(erros).not.toHaveBeenCalled();
    expect(container.querySelector(`[data-testid="${TESTID}"]`)?.textContent).toBe(
      "15/11/2026 14:35:07",
    );

    act(() => {
      raiz?.unmount();
    });
    container.remove();
  });

  it("horário de verão histórico: em 04/11/2018 a hora pula de 00:00 para 01:00 (Brasília)", () => {
    vi.setSystemTime(new Date("2018-11-04T02:59:59Z"));
    render(<RelogioBrasilia />);
    expect(textoRelogio()).toBe("03/11/2018 23:59:59");
    avancar(1000);
    expect(textoRelogio()).toBe("04/11/2018 01:00:00");
  });

  it("horário de verão histórico: em dezembro de 2018 o deslocamento vigente é UTC-2", () => {
    const instante = new Date("2018-12-01T12:00:00Z");
    vi.setSystemTime(instante);
    render(<RelogioBrasilia />);
    expect(textoRelogio()).toBe("01/12/2018 10:00:00");
    expect(textoRelogio()).toBe(esperadoBrasiliaHistorico(instante));
  });

  it("tela pequena (estrutural): o relógio não quebra linha e o cabeçalho empilha em telas pequenas", async () => {
    const pagina = await DashboardPage();
    render(pagina);
    const relogio = screen.getByTestId(TESTID);
    expect(relogio.classList.contains("whitespace-nowrap")).toBe(true);
    const cabecalho = screen.getByRole("heading", { level: 1 }).parentElement?.parentElement;
    expect(cabecalho?.classList.contains("flex-col")).toBe(true);
    expect(cabecalho?.classList.contains("sm:flex-row")).toBe(true);
  });
});

describe("FR-006 - exibição apenas informativa", () => {
  it("não dispara rede nem escrita durante 5 minutos de atualizações", () => {
    const fetchEspiao = vi.spyOn(globalThis, "fetch");
    render(<RelogioBrasilia />);
    avancar(5 * 60 * 1000);
    expect(fetchEspiao).not.toHaveBeenCalled();
    expect(textoRelogio()).toBe("15/11/2026 14:40:07");
  });

  it("no dashboard, as actions de dados são chamadas só na carga inicial, não a cada segundo", async () => {
    const pagina = await DashboardPage();
    render(pagina);
    avancar(5 * 60 * 1000);
    expect(vi.mocked(buscarEstatisticasDashboard)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(buscarProximosCompromissos)).toHaveBeenCalledTimes(1);
  });

  it("o componente não contém rede, Server Actions nem escrita (inspeção estática)", () => {
    const fonte = readFileSync(
      path.join(RAIZ, "app/(dashboard)/dashboard/_components/RelogioBrasilia.tsx"),
      "utf8",
    );
    expect(fonte).not.toMatch(/fetch\(/);
    expect(fonte).not.toMatch(/"use server"/);
    expect(fonte).not.toMatch(/_actions/);
    expect(fonte).not.toMatch(/supabase/i);
    expect(fonte).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
});

describe("FR-007 - restrito à área autenticada do dashboard (inspeção estática)", () => {
  it("só dashboard/page.tsx importa o componente", () => {
    const appDir = path.join(RAIZ, "app");
    const importadores = listarFontes(appDir)
      .filter((arquivo) => readFileSync(arquivo, "utf8").includes("RelogioBrasilia"))
      .map((arquivo) => path.relative(RAIZ, arquivo).split(path.sep).join("/"))
      .filter((arquivo) => !arquivo.endsWith("_components/RelogioBrasilia.tsx"));
    expect(importadores).toEqual(["app/(dashboard)/dashboard/page.tsx"]);
  });

  it("o layout do grupo (dashboard) continua exigindo usuário autenticado", () => {
    const layout = readFileSync(path.join(RAIZ, "app/(dashboard)/layout.tsx"), "utf8");
    expect(layout).toMatch(/getUser\(\)/);
    expect(layout).toMatch(/redirect\("\/login"\)/);
  });
});

describe("SC-005 - contraste do texto vermelho (cálculo WCAG 2.x)", () => {
  /** Converte oklch(L% C h) em luminância relativa WCAG, via OKLab -> sRGB linear. */
  function luminanciaOklch(valor: string): number {
    const m = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(valor);
    if (!m) throw new Error(`valor oklch inválido: ${valor}`);
    const L = Number(m[1]) / 100;
    const C = Number(m[2]);
    const h = (Number(m[3]) * Math.PI) / 180;
    const a = C * Math.cos(h);
    const b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    const canais = [
      4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s,
    ].map((v) => Math.min(1, Math.max(0, v)));
    return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
  }

  function razao(a: number, b: number): number {
    const [claro, escuro] = a > b ? [a, b] : [b, a];
    return (claro + 0.05) / (escuro + 0.05);
  }

  const tailwindTheme = readFileSync(
    path.join(RAIZ, "node_modules/tailwindcss/theme.css"),
    "utf8",
  );
  const token = (nome: string): string => {
    const m = new RegExp(`--color-${nome}:\\s*(oklch\\([^)]*\\))`).exec(tailwindTheme);
    if (!m) throw new Error(`token ${nome} não encontrado`);
    return m[1];
  };

  const vermelho = luminanciaOklch(token("red-700"));
  const cinzaFundo = luminanciaOklch(token("gray-50")); // fundo do layout (bg-gray-50)
  const branco = 1; // bg-white dos cartões do dashboard (#fff)

  it("texto text-red-700 sobre bg-gray-50 (fundo do layout) atinge 4,5:1", () => {
    expect(razao(vermelho, cinzaFundo)).toBeGreaterThanOrEqual(4.5);
  });

  it("texto text-red-700 sobre bg-white atinge 4,5:1", () => {
    expect(razao(vermelho, branco)).toBeGreaterThanOrEqual(4.5);
  });
});
