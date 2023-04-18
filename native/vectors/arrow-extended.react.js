// @flow

import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

function ExtendedArrow(): React.Node {
  return (
    <Svg
      width={27}
      height={38}
      viewBox="0 0 27 38"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Path
        d="M 1 19 H 0.5 v 26 h 1 V 26 Z m 25.354 0.354 a 0.5 0.5 0 0 0 0 -0.708 l -3.182 -3.181 a 0.5 0.5 0 1 0 -0.707 0.707 L 25.293 19 l -2.828 2.828 a 0.5 0.5 0 1 0 0.707 0.707 l 3.182 -3.181 Z M 0.5 0 v 26 h 1 V 0 h -1 Z m 0.5 19.5 h 25 v -1 H 1 v 0.5 Z"
        fill="#808080"
        fillRule="nonzero"
      />
    </Svg>
  );
}

export default ExtendedArrow;
