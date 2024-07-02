// @flow

import * as React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

function AllNotifsIllustration(): React.Node {
  return (
    <Svg xmlns="http://www.w3.org/2000/svg" width={46} height={86}>
      <G fill="none" transform="translate(.5 .5)">
        <Path
          stroke="#666"
          d="M5.5 0h34A5.5 5.5 0 0 1 45 5.5v74a5.5 5.5 0 0 1-5.5 5.5h-34A5.5 5.5 0 0 1 0 79.5v-74A5.5 5.5 0 0 1 5.5 0Z"
        />
        <Circle cx={22.5} cy={75.5} r={3} fill="#C4C4C4" />
        <Path
          fill="#7E57C2"
          d="M41.5 13.643a3.143 3.143 0 0 0-3.143-3.143H6.643A3.143 3.143 0 0 0 3.5 13.643v4.714A3.143 3.143 0 0 0 6.643 21.5h31.714a3.143 3.143 0 0 0 3.143-3.143v-4.714Z"
        />
        <Path
          fill="gray"
          d="M16.9 46.5h11.2a1.4 1.4 0 0 1 1.4 1.4v11.2a1.4 1.4 0 0 1-1.4 1.4H16.9a1.4 1.4 0 0 1-1.4-1.4V47.9a1.4 1.4 0 0 1 1.4-1.4Z"
        />
        <Path
          fill="#7E57C2"
          d="M12.5 41.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm.62 5.701h-.78l-1.321.864v.766l1.268-.828h.03V52.5h.803v-5.299Z"
        />
      </G>
    </Svg>
  );
}

export default AllNotifsIllustration;
