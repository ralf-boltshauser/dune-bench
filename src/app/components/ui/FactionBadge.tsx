/**
 * Shared FactionBadge component for displaying faction names with colors
 * Single source of truth for faction badge styling
 * Uses shadcn Badge component internally
 */

import { Faction } from '@/lib/game/types/enums';
import { FACTION_NAMES } from '@/lib/game/types/enums';
import { FACTION_COLORS } from '../constants';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface FactionBadgeProps {
  faction: Faction;
  variant?: 'default' | 'subtle' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Displays a faction name with its color
 * Used consistently across all components
 * Built on top of shadcn Badge component
 */
export default function FactionBadge({
  faction,
  variant = 'default',
  size = 'md',
  showDot = false,
  className = '',
}: FactionBadgeProps) {
  const color = FACTION_COLORS[faction];
  const name = FACTION_NAMES[faction];

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Map FactionBadge variants to shadcn Badge variants
  // We'll override styles with faction colors, but use outline variant for outline
  const badgeVariant = variant === 'outline' ? 'outline' : 'default';

  // Variant styles - applied via style prop to override shadcn defaults with faction colors
  const variantStyles = {
    default: {
      backgroundColor: `${color}20`,
      color,
      borderColor: 'transparent',
    },
    subtle: {
      backgroundColor: `${color}15`,
      color,
      borderColor: 'transparent',
    },
    outline: {
      backgroundColor: 'transparent',
      color,
      borderColor: color,
    },
  };

  return (
    <Badge
      variant={badgeVariant}
      className={cn(sizeClasses[size], className)}
      style={variantStyles[variant]}
    >
      {showDot && (
        <span
          className="inline-block w-2 h-2 rounded-full mr-1"
          style={{ backgroundColor: color }}
        />
      )}
      {name}
    </Badge>
  );
}

