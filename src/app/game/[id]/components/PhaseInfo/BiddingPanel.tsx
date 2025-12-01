"use client";

import { FACTION_COLORS } from "@/app/components/constants";
import FactionBadge from "@/app/components/ui/FactionBadge";
import InfoCard from "@/app/components/ui/InfoCard";
import type { BiddingInfo } from "../../hooks/usePhaseInfo";
import { formatTimestamp } from "../../utils/display-helpers";

interface BiddingPanelProps {
  biddingInfo: BiddingInfo | null;
}

/**
 * Component to display bidding phase information
 * Shows auction history and current active auction
 */
export default function BiddingPanel({ biddingInfo }: BiddingPanelProps) {
  // Don't render if no bidding info
  if (!biddingInfo || biddingInfo.auctions.length === 0) {
    return null;
  }

  // formatTime is now imported from display-helpers

  return (
    <InfoCard title="Bidding Phase">
      <div className="max-h-[600px] overflow-y-auto space-y-4">
        {[...biddingInfo.auctions].reverse().map((auction, reversedIndex) => {
          const originalIndex = biddingInfo.auctions.length - 1 - reversedIndex;
          const isActive = auction.status === "active";
          const isCurrentAuction = biddingInfo.currentAuction === originalIndex;

          return (
            <div
              key={originalIndex}
              className={`border rounded-lg p-3 ${
                isActive || isCurrentAuction
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              {/* Auction Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Auction #{auction.number}
                  </span>
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded">
                      Active
                    </span>
                  )}
                  {auction.status === "completed" && (
                    <span className="text-xs px-2 py-0.5 bg-gray-500 text-white rounded">
                      Completed
                    </span>
                  )}
                </div>
                {auction.card && (
                  <span className="text-xs text-gray-600 font-medium">
                    {auction.card}
                  </span>
                )}
              </div>

              {/* Bids */}
              {auction.bids.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    Bids
                  </div>
                  <div className="space-y-1">
                    {[...auction.bids].reverse().map((bid, bidIndex) => (
                      <div
                        key={bidIndex}
                        className="flex items-center justify-between px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: `${FACTION_COLORS[bid.faction]}15`,
                        }}
                      >
                        <FactionBadge faction={bid.faction} size="sm" />
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">
                            {bid.amount}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {formatTimestamp(bid.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Passes */}
              {auction.passes.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    Passed
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {auction.passes.map((faction) => (
                      <FactionBadge key={faction} faction={faction} size="sm" />
                    ))}
                  </div>
                </div>
              )}

              {/* Winner */}
              {auction.winner && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">
                      Winner:
                    </span>
                    <FactionBadge
                      faction={auction.winner}
                      size="sm"
                      variant="outline"
                    />
                  </div>
                </div>
              )}

              {/* No bids message */}
              {auction.bids.length === 0 && auction.passes.length === 0 && (
                <div className="text-xs text-gray-500 italic">No bids yet</div>
              )}
            </div>
          );
        })}
      </div>
    </InfoCard>
  );
}
