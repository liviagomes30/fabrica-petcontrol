import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FUSO_BRASILIA,
  agora,
  dataParaISOLocal,
  formatarDataHoraBrasilia,
  hojeLocal,
  msAteProximoSegundo,
  saudacaoDaDataHoraBrasilia,
  saudacaoPorHora,
} from "@/lib/domain/data-local";

const CASOS: ReadonlyArray<readonly [string, string]> = [
  ["2026-11-15T17:35:07Z", "15/11/2026 14:35:07"],
  ["2026-11-16T02:59:59Z", "15/11/2026 23:59:59"],
  ["2026-11-16T03:00:00Z", "16/11/2026 00:00:00"],
  ["2018-11-04T02:59:59Z", "03/11/2018 23:59:59"],
  ["2018-11-04T03:00:00Z", "04/11/2018 01:00:00"],
];

const TZ_ORIGINAL = process.env.TZ;

afterEach(() => {
  if (TZ_ORIGINAL === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = TZ_ORIGINAL;
  }
  vi.useRealTimers();
});

describe("formatarDataHoraBrasilia", () => {
  it.each(CASOS)("formata %s como %s", (iso, esperado) => {
    expect(formatarDataHoraBrasilia(new Date(iso))).toBe(esperado);
  });

  it.each(["Asia/Tokyo", "America/New_York"])(
    "independe do fuso do dispositivo (%s)",
    (tz) => {
      process.env.TZ = tz;
      for (const [iso, esperado] of CASOS) {
        expect(formatarDataHoraBrasilia(new Date(iso))).toBe(esperado);
      }
    },
  );
});

describe("msAteProximoSegundo", () => {
  it.each([
    [250, 750],
    [0, 1000],
    [999, 1],
    [1, 999],
  ])("com %i ms faltam %i ms", (ms, esperado) => {
    const instante = new Date("2026-11-15T17:35:07.000Z");
    instante.setMilliseconds(ms);
    expect(msAteProximoSegundo(instante)).toBe(esperado);
  });

  it("sempre devolve um valor entre 1 e 1000", () => {
    for (let ms = 0; ms < 1000; ms++) {
      const instante = new Date(2026, 10, 15, 12, 0, 0, ms);
      const espera = msAteProximoSegundo(instante);
      expect(espera).toBeGreaterThanOrEqual(1);
      expect(espera).toBeLessThanOrEqual(1000);
    }
  });
});

describe("FUSO_BRASILIA e agora", () => {
  it("expõe o fuso de Brasília", () => {
    expect(FUSO_BRASILIA).toBe("America/Sao_Paulo");
  });

  it("agora() devolve o instante atual do relógio do dispositivo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T17:35:07Z"));
    expect(agora().toISOString()).toBe("2026-11-15T17:35:07.000Z");
  });
});

describe("hojeLocal e dataParaISOLocal", () => {
  it("dataParaISOLocal monta YYYY-MM-DD com componentes locais", () => {
    expect(dataParaISOLocal(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("hojeLocal usa a data local atual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 22, 30));
    expect(hojeLocal()).toBe("2026-11-15");
  });
});

describe("saudacaoPorHora", () => {
  it.each(
    Array.from({ length: 24 }, (_, hora) => {
      const esperado =
        hora >= 5 && hora <= 11
          ? "Bom dia"
          : hora >= 12 && hora <= 17
            ? "Boa tarde"
            : "Boa noite";
      return [hora, esperado] as const;
    }),
  )("hora %i resulta em %s", (hora, esperado) => {
    expect(saudacaoPorHora(hora)).toBe(esperado);
  });
});

describe("saudacaoDaDataHoraBrasilia", () => {
  it.each([
    ["21/11/2026 04:59:59", "Boa noite"],
    ["21/11/2026 05:00:00", "Bom dia"],
    ["21/11/2026 11:59:59", "Bom dia"],
    ["21/11/2026 12:00:00", "Boa tarde"],
    ["21/11/2026 17:59:59", "Boa tarde"],
    ["21/11/2026 18:00:00", "Boa noite"],
  ])("texto %s resulta em %s", (texto, esperado) => {
    expect(saudacaoDaDataHoraBrasilia(texto)).toBe(esperado);
  });

  const INSTANTES: ReadonlyArray<readonly [string, string]> = [
    ["2026-11-21T14:59:59Z", "Bom dia"],
    ["2026-11-21T15:00:00Z", "Boa tarde"],
    ["2026-11-21T07:59:59Z", "Boa noite"],
    ["2026-11-21T08:00:00Z", "Bom dia"],
  ];

  it.each(INSTANTES)("compõe com formatarDataHoraBrasilia em %s", (iso, esperado) => {
    expect(
      saudacaoDaDataHoraBrasilia(formatarDataHoraBrasilia(new Date(iso))),
    ).toBe(esperado);
  });

  it.each(["Asia/Tokyo", "America/New_York"])(
    "independe do fuso do dispositivo (%s)",
    (tz) => {
      process.env.TZ = tz;
      for (const [iso, esperado] of INSTANTES) {
        expect(
          saudacaoDaDataHoraBrasilia(formatarDataHoraBrasilia(new Date(iso))),
        ).toBe(esperado);
      }
    },
  );
});
