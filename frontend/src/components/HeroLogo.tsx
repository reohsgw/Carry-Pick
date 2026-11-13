import { useEffect, useId, useState } from 'react';

/*
 * Animated "CARRY PICK" wordmark for the home hero: a plane flies along a blue trail that
 * weaves over and under the letters, then fades and repeats every 6 seconds.
 * Everything is one SVG so it scales with the screen.
 */

const RED = '#B03035';
const BLUE = '#4FA9DE';

const FLIGHT =
  'M 18 464 C 23.3 457.8, 41.3 436.9, 50 427 C 58.7 417.1, 63.3 411.8, 70 404.5 C 76.7 397.2, 83.3 390.1, 90 383.5 C 96.7 376.9, 103.3 371.1, 110 365 C 116.7 358.9, 123.3 352.9, 130 347 C 136.7 341.1, 143.3 335.0, 150 329.5 C 156.7 324.0, 163.3 319.0, 170 314 C 176.7 309.0, 183.3 304.0, 190 299.5 C 196.7 295.0, 203.3 290.5, 210 287 C 216.7 283.5, 220.0 280.7, 230 278.5 C 240.0 276.3, 260.0 274.4, 270 274 C 280.0 273.6, 283.3 275.1, 290 276 C 296.7 276.9, 303.3 277.8, 310 279.5 C 316.7 281.2, 323.3 283.8, 330 286.5 C 336.7 289.2, 343.3 292.4, 350 295.5 C 356.7 298.6, 363.3 301.8, 370 305 C 376.7 308.2, 383.3 311.7, 390 315 C 396.7 318.3, 403.3 321.7, 410 325 C 416.7 328.3, 423.3 331.7, 430 335 C 436.7 338.3, 443.3 342.0, 450 345 C 456.7 348.0, 463.3 350.5, 470 353 C 476.7 355.5, 483.3 357.7, 490 360 C 496.7 362.3, 503.3 364.8, 510 367 C 516.7 369.2, 523.3 371.7, 530 373.5 C 536.7 375.3, 543.3 376.8, 550 378 C 556.7 379.2, 563.3 380.2, 570 380.5 C 576.7 380.8, 583.3 380.6, 590 380 C 596.7 379.4, 603.3 378.7, 610 377 C 616.7 375.3, 623.3 372.8, 630 370 C 636.7 367.2, 643.3 363.7, 650 360.5 C 656.7 357.3, 663.3 354.4, 670 351 C 676.7 347.6, 683.3 343.5, 690 340 C 696.7 336.5, 703.3 333.2, 710 330 C 716.7 326.8, 723.3 324.2, 730 321 C 736.7 317.8, 743.3 314.5, 750 311 C 756.7 307.5, 763.3 303.5, 770 300 C 776.7 296.5, 783.3 293.2, 790 290 C 796.7 286.8, 803.3 283.8, 810 281 C 816.7 278.2, 823.3 275.3, 830 273 C 836.7 270.7, 843.3 268.7, 850 267 C 856.7 265.3, 863.3 263.9, 870 263 C 876.7 262.1, 883.3 261.6, 890 261.5 C 896.7 261.4, 903.3 261.8, 910 262.5 C 916.7 263.2, 923.3 264.1, 930 266 C 936.7 267.9, 943.3 270.4, 950 274 C 956.7 277.6, 963.3 282.2, 970 287.5 C 976.7 292.8, 983.3 300.2, 990 306 C 996.7 311.8, 1003.3 319.0, 1010 322.5 C 1016.7 326.0, 1023.3 325.8, 1030 327 C 1036.7 328.2, 1043.3 329.3, 1050 330 C 1056.7 330.7, 1063.3 331.1, 1070 331 C 1076.7 330.9, 1083.3 331.0, 1090 329.5 C 1096.7 328.0, 1103.3 324.8, 1110 322 C 1116.7 319.2, 1123.3 315.8, 1130 312.5 C 1136.7 309.2, 1143.3 305.8, 1150 302 C 1156.7 298.2, 1163.3 293.8, 1170 290 C 1176.7 286.2, 1183.3 282.8, 1190 279.5 C 1196.7 276.2, 1203.3 273.0, 1210 270.5 C 1216.7 268.0, 1223.3 266.0, 1230 264.5 C 1236.7 263.0, 1243.3 261.8, 1250 261.5 C 1256.7 261.2, 1263.3 261.6, 1270 263 C 1276.7 264.4, 1283.3 267.0, 1290 270 C 1296.7 273.0, 1303.3 276.3, 1310 281 C 1316.7 285.7, 1323.3 291.8, 1330 298 C 1336.7 304.2, 1343.3 311.0, 1350 318 C 1356.7 325.0, 1363.3 333.0, 1370 340 C 1376.7 347.0, 1383.3 354.5, 1390 360 C 1396.7 365.5, 1403.3 369.4, 1410 373 C 1416.7 376.6, 1422.0 378.8, 1430 381.5 C 1438.0 384.2, 1453.3 387.8, 1458 389';

/** Each letter's x position and horizontal squeeze, so the Anton letters fill the logo width. */
const LETTERS: [string, number, number][] = [
  ['C', 76.97, 0.7473], ['A', 226.31, 0.7455], ['R', 376.39, 0.7099], ['R', 527.3, 0.7154],
  ['Y', 677.49, 0.721], ['P', 862.7, 0.6909], ['I', 1005.61, 0.7996], ['C', 1086.05, 0.7418],
  ['K', 1240.96, 0.7362],
];

/** Slices of letters drawn again on top, so the trail looks like it passes behind them there. */
const UNDER: [number, number][] = [[246, 53], [387, 59], [538, 60], [716, 100], [1015, 59], [1252, 118]];

function Letters() {
  return (
    <>
      {LETTERS.map(([ch, x, sx], i) => (
        <text key={i} transform={`translate(${x} 476) scale(${sx} 1)`}>{ch}</text>
      ))}
    </>
  );
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

/** `still` draws the finished logo with no plane or animation (used as the header brand). */
export default function HeroLogo({ label, still = false, className = 'hero-logo' }: { label?: string; still?: boolean; className?: string }) {
  const reduce = useReducedMotion() || still;
  const clipId = `logo-under-${useId().replace(/:/g, '')}`;
  return (
    <svg className={className} viewBox="-14 100 1500 400" role={label ? 'img' : undefined}
      aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <clipPath id={clipId}>
          {UNDER.map(([x, w]) => <rect key={x} x={x} y="0" width={w} height="590" />)}
        </clipPath>
      </defs>
      <g className="hero-logo-letters" fill={RED}><Letters /></g>

      <path
        className={reduce ? undefined : 'hero-logo-trail'}
        d={FLIGHT} pathLength={1640} fill="none" stroke={BLUE} strokeWidth={21}
        strokeLinecap="round" strokeLinejoin="round"
      />

      {!reduce && (
        <g opacity="0">
          <animate attributeName="opacity" dur="6s" repeatCount="indefinite"
            values="0;1;1;0;0" keyTimes="0;0.03;0.66;0.72;1" />
          <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" path={FLIGHT}
            keyPoints="0;1;1" keyTimes="0;0.66;1" calcMode="linear" />
          {/* 84px plane centred on the path, nose pointing along it */}
          <g transform="translate(-42 -42) scale(1.3125) rotate(90 32 32)">
            <path
              d="M32 4c2.6 0 4.2 3.2 4.2 7.4V24l20.8 12.4v5.4L36.2 35.2v13.4l6.6 5v4.2L32 54.6l-10.8 3.2v-4.2l6.6-5V35.2L7 41.8v-5.4L27.8 24V11.4C27.8 7.2 29.4 4 32 4z"
              fill={BLUE} stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round"
            />
            <path d="M32 9v40" stroke="#2F7FB3" strokeWidth={1.6} strokeLinecap="round" fill="none" />
          </g>
        </g>
      )}

      <g className="hero-logo-letters" fill={RED} clipPath={`url(#${clipId})`}><Letters /></g>
    </svg>
  );
}
