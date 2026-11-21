import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
