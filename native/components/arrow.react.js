// @flow

import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

function Arrow(): React.Node {
  return (
    <Svg
      width={27}
      height={30}
      viewBox="0 0 27 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Path
        d="M1 26H.5v.5H1V26Zm25.354.354a.5.5 0 0 0 0-.708l-3.182-3.181a.5.5 0 1 0-.707.707L25.293 26l-2.828 2.828a.5.5 0 1 0 .707.707l3.182-3.181ZM.5 0v26h1V0h-1ZM1 26.5h25v-1H1v1Z"
        fill="#808080"
      />
    </Svg>
  );
}

export default Arrow;
