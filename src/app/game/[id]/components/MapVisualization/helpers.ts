/**
 * Helper functions for SVG manipulation in map visualization
 */

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Darken a hex color by a specified amount (0-1)
 */
export function darkenColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const newR = Math.max(0, Math.floor(r * (1 - amount)));
  const newG = Math.max(0, Math.floor(g * (1 - amount)));
  const newB = Math.max(0, Math.floor(b * (1 - amount)));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG
    .toString(16)
    .padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// =============================================================================
// SVG MANIPULATION
// =============================================================================

/**
 * Set fill color and opacity on an SVG element
 */
export function setFillColor(
  element: Element,
  color: string,
  opacity: string
): void {
  element.setAttribute('fill', color);
  element.setAttribute('fill-opacity', opacity);
}

/**
 * Center text in a rectangle
 */
export function centerTextInRect(
  rect: Element,
  text: Element | null,
  tspan: Element | null
): void {
  if (!text || !rect) return;

  const rectX = parseFloat(rect.getAttribute('x') || '0');
  const rectY = parseFloat(rect.getAttribute('y') || '0');
  const rectWidth = parseFloat(rect.getAttribute('width') || '0');
  const rectHeight = parseFloat(rect.getAttribute('height') || '0');

  const centerX = rectX + rectWidth / 2;
  const centerY = rectY + rectHeight / 2;

  text.setAttribute('fill', 'white');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('x', centerX.toString());
  text.setAttribute('y', centerY.toString());

  if (tspan) {
    tspan.setAttribute('fill', 'white');
    tspan.setAttribute('font-weight', 'bold');
    tspan.setAttribute('x', centerX.toString());
    tspan.setAttribute('y', centerY.toString());
    tspan.setAttribute('text-anchor', 'middle');
    tspan.setAttribute('dominant-baseline', 'middle');
  }
}

/**
 * Parse SVG string and return the root element
 */
export function parseSvg(svgString: string): {
  svgElement: SVGSVGElement;
  error: Error | null;
} {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Check for parsing errors
    const parserError = svgElement.querySelector('parsererror');
    if (parserError) {
      return {
        svgElement: svgElement as unknown as SVGSVGElement,
        error: new Error('SVG parsing failed'),
      };
    }

    return { svgElement: svgElement as unknown as SVGSVGElement, error: null };
  } catch (error) {
    return {
      svgElement: document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement,
      error: error instanceof Error ? error : new Error('Unknown SVG parsing error'),
    };
  }
}

