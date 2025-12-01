/**
 * InfoCard component - specialized card for displaying information sections
 * Combines Card with common info card patterns
 * Uses shadcn Card components
 */

import { ReactNode } from 'react';
import { Card as ShadcnCard, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface InfoCardProps {
  title: string;
  children: ReactNode;
  borderColor?: string;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Specialized card for information display
 * Handles empty states and consistent styling
 * Uses shadcn Card components
 */
export default function InfoCard({
  title,
  children,
  borderColor,
  className = '',
  emptyMessage,
  isEmpty = false,
}: InfoCardProps) {
  const borderStyle = borderColor ? { borderLeftColor: borderColor } : {};
  const borderClass = borderColor ? 'border-l-4' : '';

  return (
    <ShadcnCard
      className={cn(
        'bg-white shadow-md',
        borderClass,
        className
      )}
      style={borderStyle}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty && emptyMessage ? (
          <div className="text-sm text-gray-500 italic">{emptyMessage}</div>
        ) : (
          children
        )}
      </CardContent>
    </ShadcnCard>
  );
}

