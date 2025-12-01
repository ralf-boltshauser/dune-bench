/**
 * Shared Card component for consistent styling across all info cards
 * Wrapper around shadcn Card with backward compatibility
 */

import { ReactNode } from 'react';
import { Card as ShadcnCard, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  borderColor?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Base card component with consistent styling
 * Used by all info cards (Setup, Phase, etc.)
 * Wraps shadcn Card while maintaining backward compatibility
 */
export default function Card({ 
  children, 
  className = '', 
  title,
  borderColor 
}: CardProps) {
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
      {title ? (
        <>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </>
      ) : (
        <CardContent>
          {children}
        </CardContent>
      )}
    </ShadcnCard>
  );
}

