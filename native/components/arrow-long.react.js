// @flow

import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

function ArrowLong(): React.Node {
  return (
    <Svg
      width={27}
      height={38}
      viewBox="0 0 27 38"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Path
        d="M0 0h1v33.5h23.793l-2.328-2.328a.5.5 0 0 1-.058-.638l.058-.07a.5.5 0 0 1 .637-.057l.07.058 3.182 3.181a.5.5 0 0 1 .057.638l-.057.07-3.182 3.181a.5.5 0 0 1-.765-.637l.058-.07L24.79 34.5H0V0Z"
        fill="#808080"
        fillRule="nonzero"
      />
    </Svg>
  );
}

export default ArrowLong;
