import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
