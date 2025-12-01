"use client";

/**
 * Storm sector paths (sector-0 through sector-17)
 * Extracted from dune-board.svg
 * Auto-generated - do not edit manually. Run scripts/extract-svg-to-components.ts to regenerate.
 */
interface StormSectorsProps {
  stormSector?: number;
}

export default function StormSectors({ stormSector }: StormSectorsProps) {
  // Highlight the current storm sector
  const getSectorStyle = (sector: number) => {
    if (stormSector === sector) {
      return {
        fill: "#dc2626", // red-600
        fillOpacity: 0.5,
        stroke: "#dc2626",
        strokeWidth: 5,
      };
    }
    return {
      fill: "none",
      stroke: "black",
      strokeWidth: 3,
    };
  };

  return (
    <>
      <path
        id="sector-0"
        d="M410.06 982.744C360.635 974.276 313.06 957.277 269.459 932.508L451.837 611.481C458.216 615.105 462.649 633.143 469.881 634.382L410.06 982.744Z"
        {...getSectorStyle(0)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-1"
        d="M559.251 982.198C509.89 991.028 459.369 991.206 409.946 982.725L469.644 634.851C478.733 636.411 488.024 636.378 497.102 634.754L559.251 982.198Z"
        {...getSectorStyle(1)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-2"
        d="M699.705 930.805C656.302 955.919 608.862 973.293 559.506 982.152L497.106 634.502C506.155 632.878 512.01 624.77 519.968 620.166L699.705 930.805Z"
        {...getSectorStyle(2)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-3"
        d="M814.029 834.916C781.743 873.285 743.032 905.747 699.623 930.851L519.609 619.607C519.609 619.607 520.215 611.301 522.005 605.683C523.795 600.064 526.461 597.603 528.514 595.164L814.029 834.916Z"
        {...getSectorStyle(3)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-4"
        d="M888.711 706.567C871.307 753.594 845.857 797.237 813.499 835.545L528.16 594.52C532.573 589.295 536.044 583.343 538.418 576.929L888.711 706.567Z"
        {...getSectorStyle(4)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-5"
        d="M915.572 561.138C915.029 611.28 905.77 660.946 888.21 707.916L537.464 576.782C539.821 570.478 549.803 565.129 549.876 558.4L915.572 561.138Z"
        {...getSectorStyle(5)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-6"
        d="M891.008 412.703C907.675 459.997 915.991 509.829 915.583 559.972L550.347 557.002C550.411 549.205 555.728 538.922 553.136 531.568L891.008 412.703Z"
        {...getSectorStyle(6)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-7"
        d="M816.683 281.18C848.599 319.857 873.546 363.789 890.409 411.014L552.92 531.524C550.029 523.428 543.06 518.137 537.588 511.506L816.683 281.18Z"
        {...getSectorStyle(7)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-8"
        d="M702.162 183.539C745.398 208.937 783.889 241.662 815.913 280.249L537.473 511.329C532.241 505.024 514.56 518.916 507.496 514.766L702.162 183.539Z"
        {...getSectorStyle(8)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-9"
        d="M561.768 131.171C611.077 140.292 658.423 157.919 701.692 183.263L507.245 515.519C502.129 512.522 498.231 507.243 492.4 506.164L561.768 131.171Z"
        {...getSectorStyle(9)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-10"
        d="M410.469 130.097C459.902 121.677 510.423 121.917 559.773 130.807L492.266 505.556C486.365 504.493 480.808 509.998 474.897 511.005L410.469 130.097Z"
        {...getSectorStyle(10)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-11"
        d="M268.232 181.103C311.751 156.191 359.271 139.037 408.668 130.408L475.195 511.225C469.951 512.142 464.907 513.963 460.286 516.607L268.232 181.103Z"
        {...getSectorStyle(11)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-12"
        d="M152.168 277.991C184.454 239.623 223.166 207.161 266.574 182.057L460.564 516.263C454.709 519.649 442.819 513.724 438.464 518.899L152.168 277.991Z"
        {...getSectorStyle(12)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-13"
        d="M77.0271 407.581C94.2878 360.501 119.604 316.781 151.846 278.375L438.075 518.978C432.985 525.041 421.714 525.519 418.989 532.952L77.0271 407.581Z"
        {...getSectorStyle(13)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-14"
        d="M50.5969 556.455C50.5969 506.311 59.3172 456.548 76.3681 409.391L418.814 532.889C415.747 541.369 405.324 547.438 405.324 556.456L50.5969 556.455Z"
        {...getSectorStyle(14)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-15"
        d="M76.9085 705.006C59.6854 657.912 50.7832 608.181 50.5999 558.037L404.299 556.744C404.333 565.88 398.911 578.17 402.049 586.75L76.9085 705.006Z"
        {...getSectorStyle(15)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-16"
        d="M152.795 835.663C120.423 797.367 94.9576 753.733 77.5366 706.712L402.101 586.464C405.58 595.855 418.412 598.363 424.877 606.011L152.795 835.663Z"
        {...getSectorStyle(16)}
        strokeDasharray="6 6"
      />
      <path
        id="sector-17"
        d="M269.011 932.253C225.44 907.431 186.518 875.222 153.984 837.064L424.624 606.192C430.082 612.593 445.881 607.85 453.19 612.014L269.011 932.253Z"
        {...getSectorStyle(17)}
        strokeDasharray="6 6"
      />
    </>
  );
}
