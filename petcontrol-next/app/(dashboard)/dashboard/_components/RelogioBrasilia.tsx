"use client";

import { useSyncExternalStore } from "react";
import { agora, formatarDataHoraBrasilia } from "@/lib/domain/data-local";

const MARCADOR = "--/--/---- --:--:--";

type Ouvinte = () => void;

function criarStore() {
  const ouvintes = new Set<Ouvinte>();

  return {
    subscribe(ouvinte: Ouvinte) {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
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
    <time
      dateTime={texto === null ? undefined : agora().toISOString()}
      aria-label="Data e hora atuais (horário de Brasília)"
      data-testid="relogio-brasilia"
      className="text-red-700 font-semibold tabular-nums whitespace-nowrap"
    >
      {texto ?? MARCADOR}
    </time>
  );
}
