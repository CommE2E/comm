// @flow

import * as React from 'react';

function MutedNotifsIllustration(): React.Node {
  return (
    <svg width={46} height={86} xmlns="http://www.w3.org/2000/svg">
      <title>{'muted-notifs'}</title>
      <g transform="translate(.5 .5)" fill="none" fillRule="evenodd">
        <rect stroke="#666" width={45} height={85} rx={5.5} />
        <circle fill="#C4C4C4" fillRule="nonzero" cx={22.5} cy={75.5} r={3} />
        <path
          d="M19.5 47.5h-5s2-4 2-8a6.002 6.002 0 0 1 6-6 6 6 0 0 1 6 6c0 3 2 8 2 8h-5m-6 0v1a3 3 0 1 0 6 0v-1m-6 0h6"
          stroke="#7E57C2"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          stroke="#7E57C2"
          strokeWidth={1.5}
          strokeLinecap="round"
          d="M11.561 31.5 33.5 53.439"
        />
      </g>
    </svg>
  );
}

export default MutedNotifsIllustration;
