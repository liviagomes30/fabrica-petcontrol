/**
 * Testes de aceite (QA) da feature 002-saudacao-dashboard.
 *
 * Rastreabilidade:
 *  - US1 cenários 1 a 4: FR-001, FR-002, FR-003, FR-004, FR-006
 *  - US2 cenários 1 a 3: FR-005, SC-003
 *  - SC-001 (todas as horas, varredura), SC-002 (seis limites), SC-004 (dois fusos)
 *  - SC-005 / FR-009 (contraste), SC-006 (localização imediata)
 *  - Edge cases: 1ª exibição (SSR/hidratação), aba em segundo plano, tela pequena (estrutural)
 *  - FR-007 (apenas informativa), FR-008 (somente área autenticada)
 *
 * Todos os testes usam relógio falso e mock das actions: nenhum acesso ao Supabase real,
 * nenhuma leitura de `.env.local` e nenhuma rede. Horários de Brasília são escritos com
 * o deslocamento explícito -03:00 (sem horário de verão desde 17/02/2019).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { RelogioBrasilia } from "@/app/(dashboard)/dashboard/_components/RelogioBrasilia";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

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

const RELOGIO_ID = "relogio-brasilia";
const SAUDACAO_ID = "saudacao-dashboard";
const TZ_ORIGINAL = process.env.TZ;
const RAIZ = process.cwd();
if (!existsSync(path.join(RAIZ, "vitest.config.mts"))) {
  throw new Error(`Execute os testes a partir de petcontrol-next/ (cwd atual: ${RAIZ})`);
}

/**
 * Saudação esperada por hora de Brasília (índice = hora 0..23), escrita à mão a partir de FR-004:
 * 05:00–11:59 Bom dia; 12:00–17:59 Boa tarde; 18:00–04:59 Boa noite.
 */
const ESPERADA_POR_HORA: readonly string[] = [
  "Boa noite", // 00
  "Boa noite", // 01
  "Boa noite", // 02
  "Boa noite", // 03
  "Boa noite", // 04
  "Bom dia", // 05
  "Bom dia", // 06
  "Bom dia", // 07
  "Bom dia", // 08
  "Bom dia", // 09
  "Bom dia", // 10
  "Bom dia", // 11
  "Boa tarde", // 12
  "Boa tarde", // 13
  "Boa tarde", // 14
  "Boa tarde", // 15
  "Boa tarde", // 16
  "Boa tarde", // 17
  "Boa noite", // 18
  "Boa noite", // 19
  "Boa noite", // 20
  "Boa noite", // 21
  "Boa noite", // 22
  "Boa noite", // 23
];

beforeEach(() => {
  vi.useFakeTimers();
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

function abrirEm(instante: string) {
  vi.setSystemTime(new Date(instante));
  return render(<RelogioBrasilia />);
}

function relogio(): string {
  return screen.getByTestId(RELOGIO_ID).textContent ?? "";
}

function saudacao(): string {
  return screen.getByTestId(SAUDACAO_ID).textContent ?? "";
}

function elementoSaudacao(): HTMLElement {
  return screen.getByTestId(SAUDACAO_ID);
}

function avancar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function definirVisibilidade(estado: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => estado,
  });
}

/** Oráculo de texto de `dd/MM/aaaa HH:mm:ss` em Brasília, a partir do instante com -03:00. */
function horaBrasilia(instante: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(instante),
  );
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

describe("US1 - Saudação correta abaixo da data e hora", () => {
  it("cenário 1: entre 05:00:00 e 11:59:59 de Brasília vê Bom dia abaixo da data e hora", () => {
    abrirEm("2026-11-21T05:00:00-03:00");
    expect(relogio()).toBe("21/11/2026 05:00:00");
    expect(saudacao()).toBe("Bom dia");
    expect(screen.getByTestId(RELOGIO_ID).nextElementSibling).toBe(elementoSaudacao());
    cleanup();

    abrirEm("2026-11-21T11:59:59-03:00");
    expect(relogio()).toBe("21/11/2026 11:59:59");
    expect(saudacao()).toBe("Bom dia");
  });

  it("cenário 2: entre 12:00:00 e 17:59:59 de Brasília vê Boa tarde abaixo da data e hora", () => {
    abrirEm("2026-11-21T12:00:00-03:00");
    expect(relogio()).toBe("21/11/2026 12:00:00");
    expect(saudacao()).toBe("Boa tarde");
    expect(screen.getByTestId(RELOGIO_ID).nextElementSibling).toBe(elementoSaudacao());
    cleanup();

    abrirEm("2026-11-21T17:59:59-03:00");
    expect(relogio()).toBe("21/11/2026 17:59:59");
    expect(saudacao()).toBe("Boa tarde");
  });

  it("cenário 3: entre 18:00:00 e 04:59:59 de Brasília (atravessando a meia-noite) vê Boa noite", () => {
    abrirEm("2026-11-21T18:00:00-03:00");
    expect(relogio()).toBe("21/11/2026 18:00:00");
    expect(saudacao()).toBe("Boa noite");
    cleanup();

    abrirEm("2026-11-22T00:00:00-03:00");
    expect(relogio()).toBe("22/11/2026 00:00:00");
    expect(saudacao()).toBe("Boa noite");
    cleanup();

    abrirEm("2026-11-22T04:59:59-03:00");
    expect(relogio()).toBe("22/11/2026 04:59:59");
    expect(saudacao()).toBe("Boa noite");
  });

  it.each(["Asia/Tokyo", "America/New_York"])(
    "cenário 4: dispositivo em %s mostra a saudação do horário de Brasília, não o do dispositivo",
    (tz) => {
      process.env.TZ = tz;
      // 15:00:00Z = 12:00 em Brasília (Boa tarde). Em Tóquio são 00:00 (Boa noite) e em Nova York 10:00 (Bom dia).
      const instante = new Date("2026-11-21T15:00:00Z");
      const horaDoDispositivo = instante.getHours();
      expect(horaDoDispositivo).not.toBe(12); // prova de que o fuso do dispositivo mudou
      abrirEm("2026-11-21T15:00:00Z");
      expect(relogio()).toBe("21/11/2026 12:00:00");
      expect(saudacao()).toBe("Boa tarde");
    },
  );
});

describe("US2 - Saudação acompanha a mudança de período sem recarregar", () => {
  /** Abre em `inicio` (com o relógio no segundo cheio) e confere a virada no mesmo tique do relógio. */
  function verificarViradaNoMesmoTique(
    inicio: string,
    horaAntes: string,
    saudacaoAntes: string,
    horaDepois: string,
    saudacaoDepois: string,
  ) {
    abrirEm(inicio);
    const nodoAntes = elementoSaudacao();
    expect(relogio()).toBe(horaAntes);
    expect(saudacao()).toBe(saudacaoAntes);

    // Um milissegundo antes do novo segundo: o relógio e a saudação ainda mostram o anterior.
    avancar(999);
    expect(relogio()).toBe(horaAntes);
    expect(saudacao()).toBe(saudacaoAntes);

    // No tique: relógio e saudação mudam juntos, sem recarregar (mesmo nó DOM).
    avancar(1);
    expect(relogio()).toBe(horaDepois);
    expect(saudacao()).toBe(saudacaoDepois);
    expect(elementoSaudacao()).toBe(nodoAntes);
  }

  it("cenário 1: às 11:59:59 a saudação passa de Bom dia para Boa tarde quando o relógio marca 12:00:00", () => {
    verificarViradaNoMesmoTique(
      "2026-11-21T11:59:59.000-03:00",
      "21/11/2026 11:59:59",
      "Bom dia",
      "21/11/2026 12:00:00",
      "Boa tarde",
    );
  });

  it("cenário 2: às 17:59:59 a saudação passa de Boa tarde para Boa noite quando o relógio marca 18:00:00", () => {
    verificarViradaNoMesmoTique(
      "2026-11-21T17:59:59.000-03:00",
      "21/11/2026 17:59:59",
      "Boa tarde",
      "21/11/2026 18:00:00",
      "Boa noite",
    );
  });

  it("cenário 3: às 04:59:59 a saudação passa de Boa noite para Bom dia quando o relógio marca 05:00:00", () => {
    verificarViradaNoMesmoTique(
      "2026-11-21T04:59:59.000-03:00",
      "21/11/2026 04:59:59",
      "Boa noite",
      "21/11/2026 05:00:00",
      "Bom dia",
    );
  });
});

describe("SC-002 - seis limites de faixa", () => {
  it.each([
    ["2026-11-21T04:59:59-03:00", "Boa noite"],
    ["2026-11-21T05:00:00-03:00", "Bom dia"],
    ["2026-11-21T11:59:59-03:00", "Bom dia"],
    ["2026-11-21T12:00:00-03:00", "Boa tarde"],
    ["2026-11-21T17:59:59-03:00", "Boa tarde"],
    ["2026-11-21T18:00:00-03:00", "Boa noite"],
  ])("em %s a saudação é %s", (instante, esperada) => {
    abrirEm(instante);
    expect(saudacao()).toBe(esperada);
  });
});

describe("SC-001 - coerência em todas as horas", () => {
  it("em 48 h, em intervalos de 15 min, a saudação segue a faixa da hora exibida (FR-006)", () => {
    const inicio = Date.parse("2026-11-21T00:00:00-03:00");
    let verificadas = 0;
    for (let minuto = 0; minuto < 48 * 60; minuto += 15) {
      const instante = new Date(inicio + minuto * 60_000);
      vi.setSystemTime(instante);
      const { unmount } = render(<RelogioBrasilia />);
      const hora = Number(relogio().slice(11, 13));
      expect(hora).toBe(horaBrasilia(instante));
      expect(saudacao()).toBe(ESPERADA_POR_HORA[hora]);
      unmount();
      verificadas++;
    }
    expect(verificadas).toBe(192);
  });

  it("cobre as 24 horas de Brasília com a faixa esperada (tabela literal de FR-004)", () => {
    for (let hora = 0; hora < 24; hora++) {
      const hh = String(hora).padStart(2, "0");
      abrirEm(`2026-11-21T${hh}:30:00-03:00`);
      expect(saudacao()).toBe(ESPERADA_POR_HORA[hora]);
      cleanup();
    }
  });
});

describe("SC-004 - dispositivo em outro fuso", () => {
  it.each(["Asia/Tokyo", "America/New_York"])(
    "com o dispositivo em %s, as faixas seguem Brasília nos limites 11:59:59, 12:00:00 e 18:00:00",
    (tz) => {
      process.env.TZ = tz;
      const instantes: [string, string][] = [
        ["2026-11-21T11:59:59-03:00", "Bom dia"],
        ["2026-11-21T12:00:00-03:00", "Boa tarde"],
        ["2026-11-21T18:00:00-03:00", "Boa noite"],
      ];
      for (const [instante, esperada] of instantes) {
        abrirEm(instante);
        expect(saudacao()).toBe(esperada);
        cleanup();
      }
    },
  );
});

describe("Edge cases", () => {
  it("1ª exibição: o HTML do servidor não traz saudação e a hidratação não gera aviso", () => {
    process.env.TZ = "Asia/Tokyo";
    vi.setSystemTime(new Date("2026-11-21T15:00:00Z")); // Boa tarde em Brasília
    const html = renderToString(<RelogioBrasilia />);
    for (const texto of ["Bom dia", "Boa tarde", "Boa noite"]) {
      expect(html).not.toContain(texto);
    }

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const erros = vi.spyOn(console, "error").mockImplementation(() => {});
    let raiz: Root | undefined;
    act(() => {
      raiz = hydrateRoot(container, <RelogioBrasilia />);
    });

    expect(erros).not.toHaveBeenCalled();
    expect(container.querySelector(`[data-testid="${SAUDACAO_ID}"]`)?.textContent).toBe(
      "Boa tarde",
    );
    act(() => {
      raiz?.unmount();
    });
    container.remove();
  });

  it("saudação aparece já na primeira renderização no cliente, sem esperar temporizador (SC-006)", () => {
    abrirEm("2026-11-21T15:00:00-03:00");
    expect(saudacao()).toBe("Boa tarde");
  });

  it("aba em segundo plano: ao voltar, relógio e saudação estão corretos de imediato", () => {
    abrirEm("2026-11-21T11:59:50-03:00");
    expect(saudacao()).toBe("Bom dia");
    definirVisibilidade("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // O navegador congela os temporizadores em aba oculta; o relógio do sistema segue andando.
    vi.setSystemTime(new Date("2026-11-21T12:30:00-03:00"));
    definirVisibilidade("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(relogio()).toBe("21/11/2026 12:30:00");
    expect(saudacao()).toBe("Boa tarde");
  });

  it("tela pequena (estrutural): a saudação não quebra linha e a coluna do relógio empilha", () => {
    abrirEm("2026-11-21T15:00:00-03:00");
    const saudacaoEl = elementoSaudacao();
    expect(saudacaoEl.classList.contains("whitespace-nowrap")).toBe(true);
    expect(saudacaoEl.parentElement?.classList.contains("flex-col")).toBe(true);
    expect(screen.getByTestId(RELOGIO_ID).nextElementSibling).toBe(saudacaoEl);
  });
});

describe("Integração na página do dashboard", () => {
  it("a saudação fica imediatamente abaixo da data e hora dentro de /dashboard (FR-001)", async () => {
    vi.setSystemTime(new Date("2026-11-21T15:00:00-03:00"));
    const pagina = await DashboardPage();
    render(pagina);
    const relogioEl = screen.getByTestId(RELOGIO_ID);
    expect(relogioEl.nextElementSibling).toBe(elementoSaudacao());
    expect(saudacao()).toBe("Boa tarde");
  });
});

describe("FR-007 - exibição apenas informativa", () => {
  it("não dispara rede nem escrita durante 5 minutos de atualizações", () => {
    const fetchEspiao = vi.spyOn(globalThis, "fetch");
    abrirEm("2026-11-21T11:58:00-03:00");
    avancar(5 * 60 * 1000);
    expect(fetchEspiao).not.toHaveBeenCalled();
    expect(relogio()).toBe("21/11/2026 12:03:00");
    expect(saudacao()).toBe("Boa tarde");
  });

  it("o componente não contém rede, Server Actions nem acesso a dados (inspeção estática)", () => {
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

describe("FR-008 - somente na área autenticada", () => {
  it("só dashboard/page.tsx importa o componente da saudação e o relógio", () => {
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

describe("FR-009 / SC-005 - contraste da saudação (cálculo WCAG 2.x)", () => {
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

  const tema = readFileSync(path.join(RAIZ, "node_modules/tailwindcss/theme.css"), "utf8");
  const token = (nome: string): string => {
    const m = new RegExp(`--color-${nome}:\\s*(oklch\\([^)]*\\))`).exec(tema);
    if (!m) throw new Error(`token ${nome} não encontrado`);
    return m[1];
  };

  const cinzaTexto = luminanciaOklch(token("gray-700"));
  const branco = 1; // bg-white (#fff) dos cartões do dashboard
  const cinzaFundo = luminanciaOklch(token("gray-50")); // bg-gray-50 do layout

  it("a saudação usa text-gray-700", () => {
    abrirEm("2026-11-21T15:00:00-03:00");
    expect(elementoSaudacao().classList.contains("text-gray-700")).toBe(true);
  });

  it("text-gray-700 sobre bg-white atinge 4,5:1", () => {
    expect(razao(cinzaTexto, branco)).toBeGreaterThanOrEqual(4.5);
  });

  it("text-gray-700 sobre bg-gray-50 (fundo do layout) atinge 4,5:1", () => {
    expect(razao(cinzaTexto, cinzaFundo)).toBeGreaterThanOrEqual(4.5);
  });
});
