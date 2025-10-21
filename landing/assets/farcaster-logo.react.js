// @flow

import * as React from 'react';

type Props = {
  +size?: number,
  +className?: string,
};

function FarcasterLogo(props: Props): React.Node {
  const { size, ...rest } = props;

  return (
    <svg
      width={size ?? 50}
      height={size ?? 50}
      viewBox="0 0 660 660"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        d="M589.801 101V162.681H528.172V224.31H547.054V224.331H589.801V557.795H486.57L486.507 557.49L433.832 308.03C428.81 284.251 415.667 262.736 396.827 247.434C377.988 232.133 354.255 223.71 330.006 223.71H329.8C305.551 223.71 281.818 232.133 262.979 247.434C244.139 262.736 230.996 284.259 225.974 308.03L173.239 557.795H70V224.323H112.747V224.31H131.626V162.681H70V101H589.801Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default FarcasterLogo;
