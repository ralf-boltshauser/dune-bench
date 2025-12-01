"use client";

import type { GameState } from "@/lib/game/types";

/**
 * Special game areas (tleilaxu-tanks, spice-bank)
 * Extracted from dune-board.svg
 * Auto-generated - do not edit manually. Run scripts/extract-svg-to-components.ts to regenerate.
 */
interface SpecialAreasProps {
  gameState?: GameState | null;
}

export default function SpecialAreas({
  gameState: _gameState,
}: SpecialAreasProps) {
  return (
    <>
      <path
        id="tleilaxu-tanks"
        d="M340.613 1097.47L11.5157 1097.94C5.43443 1097.95 0.5 1093.02 0.5 1086.94V893.956C0.5 887.88 5.42487 882.956 11.5 882.956H100.291C103.355 882.956 106.247 884.198 108.355 886.422C121.037 899.805 168.269 948.612 206.097 973.956C249.026 1002.72 320.856 1028.74 344.097 1036.77C348.593 1038.33 351.597 1042.53 351.597 1047.29V1086.47C351.597 1092.54 346.682 1097.46 340.613 1097.47Z"
        stroke="black"
      />
      <path
        id="spice-bank"
        d="M628.581 1097.47L957.581 1097.94C963.662 1097.95 968.597 1093.02 968.597 1086.94V893.956C968.597 887.88 963.672 882.956 957.597 882.956H868.836C865.771 882.956 862.878 884.199 860.771 886.424C848.091 899.808 800.873 948.613 763.057 973.955C720.14 1002.72 648.332 1028.73 625.096 1036.77C620.601 1038.32 617.597 1042.53 617.597 1047.29V1086.47C617.597 1092.54 622.512 1097.46 628.581 1097.47Z"
        stroke="black"
      />
    </>
  );
}
