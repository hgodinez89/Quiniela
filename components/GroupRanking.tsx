"use client";

import { useState } from "react";
import { STAGE_LABEL, type Stage } from "@/lib/types";
import { availablePhases, type PhaseRankMember } from "@/lib/ranking";
import {
  type Champion,
  type PhaseWinner,
  type PhasePointRow,
  type PhaseStatusRow,
  type WinnerEntry,
} from "@/lib/winners";
import { ChampionBanner, type BannerData } from "@/components/WinnersPanel";
import RankingTable, { type RankingEntry } from "@/components/RankingTable";

function names(winners: WinnerEntry[]): string {
  return winners.map((w) => w.display_name || "Sin nombre").join(", ");
}

export default function GroupRanking({
  entries,
  members,
  phasePoints,
  phaseStatus,
  champion,
  phases,
  meId,
  creatorId,
}: {
  entries: RankingEntry[];
  members: PhaseRankMember[];
  phasePoints: PhasePointRow[];
  phaseStatus: PhaseStatusRow[];
  champion: Champion;
  phases: PhaseWinner[];
  meId: string;
  creatorId: string;
}) {
  const { phases: availStages, defaultStage } = availablePhases(phaseStatus);
  const finalPlayed =
    (phaseStatus.find((s) => s.stage === "final")?.finished ?? 0) > 0;

  const [mode, setMode] = useState<"tournament" | "phase">(
    finalPlayed ? "tournament" : "phase"
  );
  const [stage, setStage] = useState<Stage>(defaultStage);

  // Datos del banner según el modo/fase seleccionado
  let banner: BannerData;
  if (mode === "tournament") {
    if (champion.state === "none") {
      banner = {
        icon: "🏆",
        label: "",
        names: null,
        points: 0,
        emptyText: "El campeón se definirá conforme avancen los resultados.",
      };
    } else {
      const isChamp = champion.state === "champion";
      banner = {
        icon: isChamp ? "🏆" : "👑",
        label: isChamp ? "Campeón de la quiniela" : "Líder del torneo (en curso)",
        names: names(champion.winners),
        points: champion.points,
        emphasize: isChamp,
      };
    }
  } else {
    const pw = phases.find((p) => p.stage === stage);
    const label = STAGE_LABEL[stage];
    if (!pw || pw.state === "not_started") {
      banner = {
        icon: "⏳",
        label: "",
        names: null,
        points: 0,
        emptyText: `${label}: aún no inicia.`,
      };
    } else if (pw.winners.length === 0) {
      banner = {
        icon: "⏳",
        label: "",
        names: null,
        points: 0,
        emptyText: `${label}: se definirá conforme avancen los resultados.`,
      };
    } else {
      const complete = pw.state === "complete";
      banner = {
        icon: complete ? "🏅" : "👑",
        label: complete
          ? `Ganador de ${label}`
          : `Líder de ${label} (en curso)`,
        names: names(pw.winners),
        points: pw.points,
        emphasize: complete,
      };
    }
  }

  return (
    <div className="space-y-5">
      <ChampionBanner data={banner} />
      <RankingTable
        entries={entries}
        members={members}
        phasePoints={phasePoints}
        phases={availStages}
        mode={mode}
        stage={stage}
        onModeChange={setMode}
        onStageChange={setStage}
        meId={meId}
        creatorId={creatorId}
      />
    </div>
  );
}
