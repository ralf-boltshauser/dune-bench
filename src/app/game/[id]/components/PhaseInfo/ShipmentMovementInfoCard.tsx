"use client";

import { FACTION_COLORS } from "@/app/components/constants";
import FactionBadge from "@/app/components/ui/FactionBadge";
import InfoCard from "@/app/components/ui/InfoCard";
import { ArrowRight, ArrowRightLeft, Package, Ship } from "lucide-react";
import type { ShipmentMovementInfo } from "../../hooks/usePhaseInfo";
import { getTerritoryDisplayName } from "../../utils/display-helpers";

interface ShipmentMovementInfoCardProps {
  shipmentMovementInfo: ShipmentMovementInfo | null;
}

/**
 * Component to display shipment & movement phase information
 * Shows storm order and all faction actions (shipments and movements)
 */
export default function ShipmentMovementInfoCard({
  shipmentMovementInfo,
}: ShipmentMovementInfoCardProps) {
  // Don't render if no info
  if (!shipmentMovementInfo) {
    return null;
  }

  const hasActions = shipmentMovementInfo.factionActions.some(
    (fa) => fa.shipments.length > 0 || fa.movements.length > 0
  );

  return (
    <InfoCard
      title="Shipment & Movement"
      isEmpty={!hasActions && shipmentMovementInfo.stormOrder.length === 0}
      emptyMessage="No actions recorded yet"
    >
      {/* Storm Order */}
      {shipmentMovementInfo.stormOrder.length > 0 && (
        <div className="mb-5 pb-4 border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Storm Order
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {shipmentMovementInfo.stormOrder.map((faction, index) => (
              <div key={faction} className="flex items-center gap-1.5">
                {index > 0 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 min-w-5">
                    {index + 1}
                  </span>
                  <FactionBadge faction={faction} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Faction Actions */}
      {hasActions && (
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Faction Actions
          </div>
          <div className="space-y-3">
            {shipmentMovementInfo.factionActions.map((factionActions) => {
              const factionColor = FACTION_COLORS[factionActions.faction];
              const hasAnyActions =
                factionActions.shipments.length > 0 ||
                factionActions.movements.length > 0;

              return (
                <div
                  key={factionActions.faction}
                  className="border-l-4 rounded-r-lg pl-3 pr-2 py-2"
                  style={{
                    borderLeftColor: factionColor,
                    backgroundColor: `${factionColor}08`,
                  }}
                >
                  <div className="mb-2.5">
                    <FactionBadge faction={factionActions.faction} size="sm" />
                  </div>

                  {hasAnyActions ? (
                    <div className="space-y-2 text-sm">
                      {/* Shipments */}
                      {factionActions.shipments.length > 0 && (
                        <div className="space-y-1.5">
                          {factionActions.shipments.map((shipment, idx) => (
                            <ShipmentItem
                              key={idx}
                              shipment={shipment}
                              factionColor={factionColor}
                            />
                          ))}
                        </div>
                      )}

                      {/* Movements */}
                      {factionActions.movements.length > 0 && (
                        <div className="space-y-1.5">
                          {factionActions.movements.map((movement, idx) => (
                            <MovementItem
                              key={idx}
                              movement={movement}
                              factionColor={factionColor}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500 italic">
                      <span>•</span>
                      <span>Passed</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </InfoCard>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface ShipmentItemProps {
  shipment: {
    from?: string;
    to?: string;
    territory?: string;
    sector?: number;
    count: number;
    cost?: number;
    type: string;
  };
  factionColor: string;
}

function ShipmentItem({ shipment, factionColor }: ShipmentItemProps) {
  const getShipmentIcon = () => {
    if (shipment.type === "cross-ship") {
      return <ArrowRightLeft className="w-3.5 h-3.5" />;
    } else if (shipment.type === "off-planet") {
      return <Package className="w-3.5 h-3.5" />;
    }
    return <Ship className="w-3.5 h-3.5" />;
  };

  const formatShipment = () => {
    if (shipment.type === "cross-ship" && shipment.from && shipment.to) {
      return (
        <>
          Ship <span className="font-semibold">{shipment.count}</span> from{" "}
          <span className="font-medium">
            {getTerritoryDisplayName(shipment.from)}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {getTerritoryDisplayName(shipment.to)}
          </span>
          {shipment.cost !== undefined && (
            <span className="text-amber-700 font-medium">
              {" "}
              ({shipment.cost} spice)
            </span>
          )}
        </>
      );
    } else if (shipment.type === "off-planet" && shipment.from) {
      return (
        <>
          Ship <span className="font-semibold">{shipment.count}</span>{" "}
          off-planet from{" "}
          <span className="font-medium">
            {getTerritoryDisplayName(shipment.from)}
          </span>
          {shipment.cost !== undefined && (
            <span className="text-amber-700 font-medium">
              {" "}
              ({shipment.cost} spice)
            </span>
          )}
        </>
      );
    } else if (shipment.type === "spiritual_advisor" && shipment.territory) {
      return (
        <>
          Send spiritual advisor to{" "}
          <span className="font-medium">
            {getTerritoryDisplayName(shipment.territory)}
          </span>
          <span className="text-green-700 font-medium"> (free)</span>
        </>
      );
    } else if (shipment.territory) {
      const sectorText =
        shipment.sector !== undefined ? ` (sector ${shipment.sector})` : "";
      return (
        <>
          Ship <span className="font-semibold">{shipment.count}</span> to{" "}
          <span className="font-medium">
            {getTerritoryDisplayName(shipment.territory)}
          </span>
          {sectorText && <span className="text-gray-500">{sectorText}</span>}
          {shipment.cost !== undefined && (
            <span className="text-amber-700 font-medium">
              {" "}
              ({shipment.cost} spice)
            </span>
          )}
        </>
      );
    }
    return (
      <>
        Ship <span className="font-semibold">{shipment.count}</span> forces
      </>
    );
  };

  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-md"
      style={{ backgroundColor: `${factionColor}10` }}
    >
      <div className="mt-0.5 shrink-0" style={{ color: factionColor }}>
        {getShipmentIcon()}
      </div>
      <div className="text-gray-700 leading-relaxed flex-1">
        {formatShipment()}
      </div>
    </div>
  );
}

interface MovementItemProps {
  movement: {
    from: string;
    fromSector?: number;
    to: string;
    toSector?: number;
    count: number;
  };
  factionColor: string;
}

function MovementItem({ movement, factionColor }: MovementItemProps) {
  const fromText = getTerritoryDisplayName(movement.from);
  const toText = getTerritoryDisplayName(movement.to);
  const fromSectorText =
    movement.fromSector !== undefined ? ` (sector ${movement.fromSector})` : "";
  const toSectorText =
    movement.toSector !== undefined ? ` (sector ${movement.toSector})` : "";

  return (
    <div
      className="flex items-start gap-2 px-2 py-1.5 rounded-md"
      style={{ backgroundColor: `${factionColor}10` }}
    >
      <div className="mt-0.5 shrink-0" style={{ color: factionColor }}>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
      <div className="text-gray-700 leading-relaxed flex-1">
        Move <span className="font-semibold">{movement.count}</span> from{" "}
        <span className="font-medium">{fromText}</span>
        {fromSectorText && (
          <span className="text-gray-500">{fromSectorText}</span>
        )}{" "}
        to <span className="font-medium">{toText}</span>
        {toSectorText && <span className="text-gray-500">{toSectorText}</span>}
      </div>
    </div>
  );
}
