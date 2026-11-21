import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FUSO_BRASILIA,
  agora,
  dataParaISOLocal,
  formatarDataHoraBrasilia,
  hojeLocal,
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
