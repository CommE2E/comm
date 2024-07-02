// @flow

import * as React from 'react';
import Svg, { G, Rect, Circle, Path } from 'react-native-svg';

function BadgeNotifsIllustration(): React.Node {
  return (
    <Svg xmlns="http://www.w3.org/2000/svg" width={46} height={86}>
      <G fill="none" transform="translate(.5 .5)">
        <Rect width={45} height={85} stroke="#666" rx={5.5} />
        <Circle cx={22.5} cy={75.5} r={3} fill="#C4C4C4" />
        <Rect width={14} height={14} x={15.5} y={46.5} fill="gray" rx={1.4} />
        <Path
          fill="#7E57C2"
          d="M12.5 41.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm.62 5.701h-.78l-1.321.864v.766l1.268-.828h.03V52.5h.803v-5.299Z"
        />
      </G>
    </Svg>
  );
}

export default BadgeNotifsIllustration;
