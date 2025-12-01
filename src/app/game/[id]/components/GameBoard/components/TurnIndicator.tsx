"use client";

/**
 * Turn indicator circle and segments
 * Extracted from dune-board.svg
 * Auto-generated - do not edit manually. Run scripts/extract-svg-to-components.ts to regenerate.
 */
interface TurnIndicatorProps {
  turn?: number;
}

export default function TurnIndicator({ turn = 1 }: TurnIndicatorProps) {
  // Calculate which segment to highlight (turn 1 = segment 1, turn 2 = segment 2, etc.)
  // The segments are numbered 1-10, so we need to map turn to segment
  const segmentNumber = ((turn - 1) % 10) + 1;

  const getSegmentStyle = (segment: number) => {
    if (segment === segmentNumber) {
      return {
        fill: "#FFD700", // Gold
        fillOpacity: 0.6,
        stroke: "#FFA500", // Orange
        strokeWidth: 3,
      };
    }
    return {
      fill: "none",
      stroke: "black",
      strokeWidth: 2,
    };
  };
  return (
    <>
      <circle
        id="turn-indicator"
        cx="90.8936"
        cy="108.508"
        r="82.7253"
        stroke="black"
      />
      <g id="turn-indicator-1">
        <mask id="path-677-inside-1_2028_809" fill="white">
          <path d="M90.8936 25.2822C108.469 25.2822 125.593 30.8462 139.812 41.1768L105.576 88.2987C101.308 85.198 96.1687 83.528 90.8936 83.528L90.8936 25.2822Z" />
        </mask>
        <path
          d="M90.8936 25.2822C108.469 25.2822 125.593 30.8462 139.812 41.1768L105.576 88.2987C101.308 85.198 96.1687 83.528 90.8936 83.528L90.8936 25.2822Z"
          {...getSegmentStyle(1)}
          mask="url(#path-677-inside-1_2028_809)"
        />
      </g>
      <g id="turn-indicator-2">
        <mask id="path-678-inside-2_2028_809" fill="white">
          <path d="M139.812 41.1769C154.031 51.5075 164.614 66.0743 170.046 82.7895L114.651 100.788C113.02 95.7715 109.844 91.3994 105.576 88.2987L139.812 41.1769Z" />
        </mask>
        <path
          d="M139.812 41.1769C154.031 51.5075 164.614 66.0743 170.046 82.7895L114.651 100.788C113.02 95.7715 109.844 91.3994 105.576 88.2987L139.812 41.1769Z"
          {...getSegmentStyle(2)}
          mask="url(#path-678-inside-2_2028_809)"
        />
      </g>
      <g id="turn-indicator-3">
        <mask id="path-679-inside-3_2028_809" fill="white">
          <path d="M170.046 82.7895C175.477 99.5048 175.477 117.51 170.046 134.226L114.651 116.227C116.281 111.21 116.281 105.805 114.651 100.788L170.046 82.7895Z" />
        </mask>
        <path
          d="M170.046 82.7895C175.477 99.5048 175.477 117.51 170.046 134.226L114.651 116.227C116.281 111.21 116.281 105.805 114.651 100.788L170.046 82.7895Z"
          {...getSegmentStyle(3)}
          mask="url(#path-679-inside-3_2028_809)"
        />
      </g>
      <g id="turn-indicator-4">
        <mask id="path-680-inside-4_2028_809" fill="white">
          <path d="M170.046 134.226C164.614 150.941 154.031 165.508 139.812 175.838L105.576 128.716C109.844 125.616 113.02 121.244 114.651 116.227L170.046 134.226Z" />
        </mask>
        <path
          d="M170.046 134.226C164.614 150.941 154.031 165.508 139.812 175.838L105.576 128.716C109.844 125.616 113.02 121.244 114.651 116.227L170.046 134.226Z"
          {...getSegmentStyle(4)}
          mask="url(#path-680-inside-4_2028_809)"
        />
      </g>
      <g id="turn-indicator-5">
        <mask id="path-681-inside-5_2028_809" fill="white">
          <path d="M139.812 175.838C125.593 186.169 108.469 191.733 90.8936 191.733L90.8936 133.487C96.1687 133.487 101.308 131.817 105.576 128.716L139.812 175.838Z" />
        </mask>
        <path
          d="M139.812 175.838C125.593 186.169 108.469 191.733 90.8936 191.733L90.8936 133.487C96.1687 133.487 101.308 131.817 105.576 128.716L139.812 175.838Z"
          {...getSegmentStyle(5)}
          mask="url(#path-681-inside-5_2028_809)"
        />
      </g>
      <g id="turn-indicator-6">
        <mask id="path-682-inside-6_2028_809" fill="white">
          <path d="M90.8936 191.733C73.3181 191.733 56.1938 186.169 41.975 175.838L76.211 128.716C80.4787 131.817 85.6184 133.487 90.8936 133.487L90.8936 191.733Z" />
        </mask>
        <path
          d="M90.8936 191.733C73.3181 191.733 56.1938 186.169 41.975 175.838L76.211 128.716C80.4787 131.817 85.6184 133.487 90.8936 133.487L90.8936 191.733Z"
          {...getSegmentStyle(6)}
          mask="url(#path-682-inside-6_2028_809)"
        />
      </g>
      <g id="turn-indicator-7">
        <mask id="path-683-inside-7_2028_809" fill="white">
          <path d="M41.9749 175.838C27.7561 165.508 17.1727 150.941 11.7416 134.226L67.1366 116.227C68.7667 121.244 71.9433 125.616 76.211 128.716L41.9749 175.838Z" />
        </mask>
        <path
          d="M41.9749 175.838C27.7561 165.508 17.1727 150.941 11.7416 134.226L67.1366 116.227C68.7667 121.244 71.9433 125.616 76.211 128.716L41.9749 175.838Z"
          {...getSegmentStyle(7)}
          mask="url(#path-683-inside-7_2028_809)"
        />
      </g>
      <g id="turn-indicator-8">
        <mask id="path-684-inside-8_2028_809" fill="white">
          <path d="M11.7415 134.226C6.31044 117.51 6.31044 99.5048 11.7415 82.7895L67.1366 100.788C65.5065 105.805 65.5065 111.21 67.1366 116.227L11.7415 134.226Z" />
        </mask>
        <path
          d="M11.7415 134.226C6.31044 117.51 6.31044 99.5048 11.7415 82.7895L67.1366 100.788C65.5065 105.805 65.5065 111.21 67.1366 116.227L11.7415 134.226Z"
          {...getSegmentStyle(8)}
          mask="url(#path-684-inside-8_2028_809)"
        />
      </g>
      <g id="turn-indicator-9">
        <mask id="path-685-inside-9_2028_809" fill="white">
          <path d="M11.7416 82.7895C17.1727 66.0743 27.7561 51.5075 41.9749 41.1769L76.2109 88.2987C71.9433 91.3994 68.7667 95.7715 67.1366 100.788L11.7416 82.7895Z" />
        </mask>
        <path
          d="M11.7416 82.7895C17.1727 66.0743 27.7561 51.5075 41.9749 41.1769L76.2109 88.2987C71.9433 91.3994 68.7667 95.7715 67.1366 100.788L11.7416 82.7895Z"
          {...getSegmentStyle(9)}
          mask="url(#path-685-inside-9_2028_809)"
        />
      </g>
      <g id="turn-indicator-10">
        <mask id="path-686-inside-10_2028_809" fill="white">
          <path d="M41.9749 41.1768C56.1938 30.8463 73.3181 25.2822 90.8935 25.2822L90.8935 83.528C85.6184 83.528 80.4786 85.198 76.211 88.2987L41.9749 41.1768Z" />
        </mask>
        <path
          d="M41.9749 41.1768C56.1938 30.8463 73.3181 25.2822 90.8935 25.2822L90.8935 83.528C85.6184 83.528 80.4786 85.198 76.211 88.2987L41.9749 41.1768Z"
          {...getSegmentStyle(10)}
          mask="url(#path-686-inside-10_2028_809)"
        />
      </g>
      <text
        id="turn-indicator-text-1"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="102.523" y="60.0417">
          1
        </tspan>
      </text>
      <text
        id="turn-indicator-text-2"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="131.481" y="81.99">
          2
        </tspan>
      </text>
      <text
        id="turn-indicator-text-9"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="33.385" y="81.99">
          9
        </tspan>
      </text>
      <text
        id="turn-indicator-text-4"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="131.821" y="151.563">
          4
        </tspan>
      </text>
      <text
        id="turn-indicator-text-7"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="35.4985" y="151.563">
          7
        </tspan>
      </text>
      <text
        id="turn-indicator-text-5"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="103.145" y="174.339">
          5
        </tspan>
      </text>
      <text
        id="turn-indicator-text-6"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="63.2021" y="174.339">
          6
        </tspan>
      </text>
      <text
        id="turn-indicator-text-3"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="143.553" y="116.362">
          3
        </tspan>
      </text>
      <text
        id="turn-indicator-text-8"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="18.0505" y="116.362">
          8
        </tspan>
      </text>
      <text
        id="turn-indicator-text-10"
        fill="black"
        xmlSpace="preserve"
        style={{ whiteSpace: "pre" }}
        fontFamily="Inter"
        fontSize="24"
        fontWeight="bold"
        letterSpacing="0em"
      >
        <tspan x="55.8342" y="60.0417">
          10
        </tspan>
      </text>
    </>
  );
}
