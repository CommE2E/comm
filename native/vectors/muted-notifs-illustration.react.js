// @flow

import * as React from 'react';
import Svg, { G, Rect, Circle, Path } from 'react-native-svg';

function MutedNotifsIllustration(): React.Node {
  return (
    <Svg xmlns="http://www.w3.org/2000/svg" width={46} height={86}>
      <G fill="none" transform="translate(.5 .5)">
        <Rect width={45} height={85} stroke="#666" rx={5.5} />
        <Circle cx={22.5} cy={75.5} r={3} fill="#C4C4C4" />
        <Path
          stroke="#7E57C2"
          d="M19.5 47.5h-5s2-4 2-8a6.002 6.002 0 0 1 6-6 6 6 0 0 1 6 6c0 3 2 8 2 8h-5m-6 0v1a3 3 0 1 0 6 0v-1m-6 0h6M11.561 31.5 33.5 53.439"
        />
      </G>
    </Svg>
  );
}

export default MutedNotifsIllustration;
