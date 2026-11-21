import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { RelogioBrasilia } from "@/app/(dashboard)/dashboard/_components/RelogioBrasilia";

const TZ_ORIGINAL = process.env.TZ;

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

function saudacaoEm(instante: string) {
  vi.setSystemTime(new Date(instante));
  render(<RelogioBrasilia />);
  return screen.getByTestId("saudacao-dashboard").textContent;
}

describe("US1 - Saudação correta abaixo da data e hora", () => {
  it("cenário 1: de 05:00 a 11:59 em Brasília exibe Bom dia", () => {
    expect(saudacaoEm("2026-11-21T08:00:00Z")).toBe("Bom dia");
    cleanup();
    expect(saudacaoEm("2026-11-21T14:59:59Z")).toBe("Bom dia");
  });

  it("cenário 2: de 12:00 a 17:59 em Brasília exibe Boa tarde", () => {
    expect(saudacaoEm("2026-11-21T15:00:00Z")).toBe("Boa tarde");
    cleanup();
    expect(saudacaoEm("2026-11-21T20:59:59Z")).toBe("Boa tarde");
  });

  it("cenário 3: de 18:00 a 04:59 em Brasília exibe Boa noite", () => {
    expect(saudacaoEm("2026-11-21T21:00:00Z")).toBe("Boa noite");
    cleanup();
    expect(saudacaoEm("2026-11-21T07:59:59Z")).toBe("Boa noite");
  });

  it.each(["Asia/Tokyo", "America/New_York"])(
    "cenário 4: dispositivo em %s mostra a saudação da hora de Brasília",
    (tz) => {
      process.env.TZ = tz;
      expect(saudacaoEm("2026-11-21T15:00:00Z")).toBe("Boa tarde");
    },
  );
});

describe("US2 - Saudação acompanha a mudança de período sem recarregar", () => {
  function virar(inicio: string) {
    vi.setSystemTime(new Date(inicio));
    render(<RelogioBrasilia />);
    const antes = screen.getByTestId("saudacao-dashboard").textContent;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    return [antes, screen.getByTestId("saudacao-dashboard").textContent];
  }

  it("cenário 1: Bom dia passa a Boa tarde às 12:00 sem recarregar", () => {
    expect(virar("2026-11-21T14:59:58Z")).toEqual(["Bom dia", "Bom dia"]);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("saudacao-dashboard").textContent).toBe(
      "Boa tarde",
    );
  });

  it("cenário 2: Boa tarde passa a Boa noite às 18:00 sem recarregar", () => {
    expect(virar("2026-11-21T20:59:58Z")).toEqual(["Boa tarde", "Boa tarde"]);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("saudacao-dashboard").textContent).toBe(
      "Boa noite",
    );
  });

  it("cenário 3: Boa noite passa a Bom dia às 05:00 sem recarregar", () => {
    expect(virar("2026-11-21T07:59:58Z")).toEqual(["Boa noite", "Boa noite"]);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("saudacao-dashboard").textContent).toBe(
      "Bom dia",
    );
  });
});
