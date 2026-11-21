"use client";

import { useSyncExternalStore } from "react";
import {
  agora,
  formatarDataHoraBrasilia,
  msAteProximoSegundo,
  saudacaoDaDataHoraBrasilia,
} from "@/lib/domain/data-local";

const MARCADOR = "--/--/---- --:--:--";

type Ouvinte = () => void;

function criarStore() {
  return {
    subscribe(ouvinte: Ouvinte) {
      let temporizador: ReturnType<typeof setTimeout> | undefined;

      // Cada disparo recalcula a hora a partir do relógio, sem contador, para não derivar.
      const agendar = () => {
        temporizador = setTimeout(() => {
          ouvinte();
          agendar();
        }, msAteProximoSegundo(agora()));
      };

      const aoMudarVisibilidade = () => {
        if (document.visibilityState !== "visible") return;
        clearTimeout(temporizador);
        ouvinte();
        agendar();
      };

      document.addEventListener("visibilitychange", aoMudarVisibilidade);
      agendar();

      return () => {
        clearTimeout(temporizador);
        document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      };
    },
    getSnapshot: () => formatarDataHoraBrasilia(agora()),
    getServerSnapshot: (): null => null,
  };
}

const store = criarStore();

export function RelogioBrasilia() {
  const texto = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return (
    <div className="flex flex-col items-start sm:items-end">
      <time
        dateTime={texto === null ? undefined : agora().toISOString()}
        aria-label="Data e hora atuais (horário de Brasília)"
        data-testid="relogio-brasilia"
        className="text-red-700 font-semibold tabular-nums whitespace-nowrap"
      >
        {texto ?? MARCADOR}
      </time>
      <p
        data-testid="saudacao-dashboard"
        className="text-sm font-medium text-gray-700 whitespace-nowrap min-h-5"
      >
        {texto === null ? "" : saudacaoDaDataHoraBrasilia(texto)}
      </p>
    </div>
  );
}
