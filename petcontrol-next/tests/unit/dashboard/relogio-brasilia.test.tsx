import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { RelogioBrasilia } from "@/app/(dashboard)/dashboard/_components/RelogioBrasilia";
import { agora, formatarDataHoraBrasilia } from "@/lib/domain/data-local";

const TZ_ORIGINAL = process.env.TZ;
const MARCADOR = "--/--/---- --:--:--";

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
  vi.useRealTimers();
});

describe("RelogioBrasilia (US1)", () => {
  it("renderiza no servidor apenas o marcador, sem hora", () => {
    const html = renderToString(<RelogioBrasilia />);
    expect(html).toContain(MARCADOR);
    expect(html).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("exibe data e hora no formato dd/MM/aaaa HH:mm:ss igual ao domínio", () => {
    render(<RelogioBrasilia />);
    const texto = screen.getByTestId("relogio-brasilia").textContent ?? "";
    expect(texto).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    expect(texto).toBe(formatarDataHoraBrasilia(agora()));
    expect(texto).toBe("15/11/2026 14:35:07");
  });

  it.each(["Asia/Tokyo", "America/New_York"])(
    "não muda o texto quando o fuso do dispositivo é %s",
    (tz) => {
      process.env.TZ = tz;
      render(<RelogioBrasilia />);
      expect(screen.getByTestId("relogio-brasilia").textContent).toBe(
        "15/11/2026 14:35:07",
      );
    },
  );

  it("tem classe vermelha, aria-label e dateTime do contrato", () => {
    render(<RelogioBrasilia />);
    const el = screen.getByTestId("relogio-brasilia");
    expect(el.tagName).toBe("TIME");
    expect(el.classList.contains("text-red-700")).toBe(true);
    expect(el.getAttribute("aria-label")).toBe(
      "Data e hora atuais (horário de Brasília)",
    );
    expect(el.getAttribute("datetime")).toBe("2026-11-15T17:35:07.000Z");
  });
});

function definirVisibilidade(estado: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => estado,
  });
}

function textoRelogio() {
  return screen.getByTestId("relogio-brasilia").textContent;
}

describe("RelogioBrasilia (US2)", () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "visibilityState");
    vi.restoreAllMocks();
  });

  it("atualiza o texto após 1 s", () => {
    render(<RelogioBrasilia />);
    expect(textoRelogio()).toBe("15/11/2026 14:35:07");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(textoRelogio()).toBe("15/11/2026 14:35:08");
  });

  it("alinha o tique ao próximo segundo cheio", () => {
    vi.setSystemTime(new Date("2026-11-15T17:35:07.250Z"));
    render(<RelogioBrasilia />);
    act(() => {
      vi.advanceTimersByTime(749);
    });
    expect(textoRelogio()).toBe("15/11/2026 14:35:07");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(textoRelogio()).toBe("15/11/2026 14:35:08");
  });

  it("continua igual ao domínio 5 min depois, sem deriva", () => {
    render(<RelogioBrasilia />);
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(textoRelogio()).toBe(formatarDataHoraBrasilia(agora()));
    expect(textoRelogio()).toBe("15/11/2026 14:40:07");
  });

  it("vira o dia de 23:59:59 para 00:00:00", () => {
    vi.setSystemTime(new Date("2026-11-16T02:59:59Z"));
    render(<RelogioBrasilia />);
    expect(textoRelogio()).toBe("15/11/2026 23:59:59");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(textoRelogio()).toBe("16/11/2026 00:00:00");
  });

  it("atualiza de imediato ao voltar a aba para visível", () => {
    render(<RelogioBrasilia />);
    definirVisibilidade("hidden");
    // Simula o navegador congelando os temporizadores: o relógio avança sem tiques.
    vi.setSystemTime(new Date("2026-11-15T17:40:30Z"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(textoRelogio()).toBe("15/11/2026 14:35:07");
    definirVisibilidade("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(textoRelogio()).toBe("15/11/2026 14:40:30");
    expect(vi.getTimerCount()).toBe(1);
  });

  it("limpa temporizador e listener ao desmontar", () => {
    const adicionar = vi.spyOn(document, "addEventListener");
    const remover = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<RelogioBrasilia />);
    expect(vi.getTimerCount()).toBe(1);

    const adicionados = adicionar.mock.calls.filter(
      ([tipo]) => tipo === "visibilitychange",
    );
    expect(adicionados).toHaveLength(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    const removidos = remover.mock.calls.filter(
      ([tipo]) => tipo === "visibilitychange",
    );
    expect(removidos).toHaveLength(1);
    expect(removidos[0][1]).toBe(adicionados[0][1]);
  });
});
