// @flow

import * as React from 'react';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

function BackgroundTabIllustration(): React.Node {
  return (
    <Svg
      width={133}
      height={100}
      viewBox="0 0 133 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Rect
        x={20.5}
        y={32}
        width={87}
        height={67.522}
        rx={5.194}
        fill="#563894"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M63.115 63.61l-33.54-31.226a1.317 1.317 0 01-.288-.384h-3.593a5.19 5.19 0 00-1.69.281c.175 1.4.822 2.778 2.031 3.904l33.54 31.227a6.492 6.492 0 008.849 0l33.54-31.227c1.21-1.126 1.857-2.503 2.032-3.904a5.181 5.181 0 00-1.69-.281h-3.593a1.32 1.32 0 01-.288.384L64.885 63.61a1.299 1.299 0 01-1.77 0z"
        fill="#331F5C"
      />
      <Circle cx={99.5} cy={33} r={33} fill="#AE94DB" />
      <Path
        d="M93.202 15.26a13.003 13.003 0 016.298-1.634c7.217 0 13.25 6.034 13.25 13.252 0 3.38.414 6.346.988 8.835M87.354 21.65a12.953 12.953 0 00-1.104 5.228c0 11.043-4.417 17.67-4.417 17.67h28.709M81.833 15.835l35.334 35.338"
        stroke="#6D49AB"
        strokeWidth={3.713}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M106.125 46.756a6.625 6.625 0 11-13.25 0"
        stroke="#6D49AB"
        strokeWidth={3.713}
      />
    </Svg>
  );
}

export default BackgroundTabIllustration;
