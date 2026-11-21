import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { RelogioBrasilia } from "@/app/(dashboard)/dashboard/_components/RelogioBrasilia";

const TZ_ORIGINAL = process.env.TZ;
const TEXTOS = ["Bom dia", "Boa tarde", "Boa noite"];

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
  vi.useRealTimers();
});

function relogio() {
  return screen.getByTestId("relogio-brasilia").textContent;
}

function definirVisibilidade(estado: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => estado,
  });
}

function avancar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function saudacao() {
  return screen.getByTestId("saudacao-dashboard");
}

describe("Saudação do dashboard (US1)", () => {
  it.each([
    ["2026-11-21T13:00:00Z", "Bom dia"],
    ["2026-11-21T15:00:00Z", "Boa tarde"],
    ["2026-11-21T21:00:00Z", "Boa noite"],
    ["2026-11-21T05:00:00Z", "Boa noite"],
  ])("em %s mostra %s", (instante, esperado) => {
    vi.setSystemTime(new Date(instante));
    render(<RelogioBrasilia />);
    expect(saudacao().textContent).toBe(esperado);
  });

  it("é o irmão imediatamente seguinte do relógio", () => {
    vi.setSystemTime(new Date("2026-11-21T17:35:07Z"));
    render(<RelogioBrasilia />);
    expect(screen.getByTestId("relogio-brasilia").nextElementSibling).toBe(
      saudacao(),
    );
  });

  it("mostra exatamente um dos três textos", () => {
    vi.setSystemTime(new Date("2026-11-21T17:35:07Z"));
    render(<RelogioBrasilia />);
    expect(TEXTOS).toContain(saudacao().textContent);
  });

  it.each(["Asia/Tokyo", "America/New_York"])(
    "usa a hora de Brasília com o dispositivo em %s",
    (tz) => {
      process.env.TZ = tz;
      vi.setSystemTime(new Date("2026-11-21T14:59:59Z"));
      render(<RelogioBrasilia />);
      expect(saudacao().textContent).toBe("Bom dia");
    },
  );

  it("não renderiza saudação no servidor", () => {
    vi.setSystemTime(new Date("2026-11-21T17:35:07Z"));
    const html = renderToString(<RelogioBrasilia />);
    for (const texto of TEXTOS) {
      expect(html).not.toContain(texto);
    }
  });

  it("usa a classe de contraste text-gray-700", () => {
    vi.setSystemTime(new Date("2026-11-21T17:35:07Z"));
    render(<RelogioBrasilia />);
    expect(saudacao().classList.contains("text-gray-700")).toBe(true);
  });
});

describe("Saudação do dashboard (US2)", () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "visibilityState");
    vi.restoreAllMocks();
  });

  it.each([
    ["2026-11-21T14:59:58Z", "11:59:59", "Bom dia", "12:00:00", "Boa tarde"],
    ["2026-11-21T20:59:58Z", "17:59:59", "Boa tarde", "18:00:00", "Boa noite"],
    ["2026-11-21T07:59:58Z", "04:59:59", "Boa noite", "05:00:00", "Bom dia"],
  ])(
    "a virada a partir de %s troca relógio e saudação no mesmo act",
    (instante, horaAntes, antes, horaDepois, depois) => {
      vi.setSystemTime(new Date(instante));
      render(<RelogioBrasilia />);
      avancar(1000);
      expect(relogio()).toContain(horaAntes);
      expect(saudacao().textContent).toBe(antes);
      avancar(1000);
      expect(relogio()).toContain(horaDepois);
      expect(saudacao().textContent).toBe(depois);
    },
  );

  it("mantém um único temporizador agendado", () => {
    vi.setSystemTime(new Date("2026-11-21T14:59:58Z"));
    render(<RelogioBrasilia />);
    expect(vi.getTimerCount()).toBe(1);
    avancar(2000);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("corrige relógio e saudação juntos ao voltar de aba oculta", () => {
    vi.setSystemTime(new Date("2026-11-21T14:59:50Z"));
    render(<RelogioBrasilia />);
    definirVisibilidade("hidden");
    vi.setSystemTime(new Date("2026-11-21T15:00:30Z"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(saudacao().textContent).toBe("Bom dia");
    definirVisibilidade("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(relogio()).toContain("12:00:30");
    expect(saudacao().textContent).toBe("Boa tarde");
    expect(vi.getTimerCount()).toBe(1);
  });

  it("não deixa timers nem listeners ao desmontar", () => {
    const remover = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<RelogioBrasilia />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(
      remover.mock.calls.filter(([tipo]) => tipo === "visibilitychange"),
    ).toHaveLength(1);
  });
});
