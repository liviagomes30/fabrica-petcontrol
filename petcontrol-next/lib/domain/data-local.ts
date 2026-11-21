/**
 * `new Date().toISOString().split("T")[0]` converte para UTC antes de fatiar
 * a data — depois das 21h em horário de Brasília (UTC-3), devolve o dia
 * seguinte. Esta função monta "YYYY-MM-DD" a partir dos componentes locais,
 * sem passar por UTC.
 */
export function hojeLocal(): string {
  return dataParaISOLocal(new Date());
}

export function dataParaISOLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export const FUSO_BRASILIA = "America/Sao_Paulo";

/** Único ponto novo que lê o relógio do dispositivo. */
export function agora(): Date {
  return new Date();
}

const formatadorBrasilia = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_BRASILIA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Formata o instante como `dd/MM/aaaa HH:mm:ss` no fuso de Brasília, independente do fuso do dispositivo. */
export function formatarDataHoraBrasilia(instante: Date): string {
  const partes: Record<string, string> = {};
  for (const parte of formatadorBrasilia.formatToParts(instante)) {
    partes[parte.type] = parte.value;
  }
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}:${partes.second}`;
}
