// @flow

import * as React from 'react';

function BadgeNotifsIllustration(): React.Node {
  return (
    <svg width={46} height={86} xmlns="http://www.w3.org/2000/svg">
      <title>{'badge-notifs'}</title>
      <g transform="translate(.5 .5)" fill="none" fillRule="evenodd">
        <rect stroke="#666" width={45} height={85} rx={5.5} />
        <circle fill="#C4C4C4" fillRule="nonzero" cx={22.5} cy={75.5} r={3} />
        <rect
          fill="gray"
          fillRule="nonzero"
          x={15.5}
          y={46.5}
          width={14}
          height={14}
          rx={1.4}
        />
        <path
          d="M12.5 41.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm.62 5.701h-.78l-1.321.864v.766l1.268-.828h.03V52.5h.803v-5.299Z"
          fill="#7E57C2"
          fillRule="nonzero"
        />
      </g>
    </svg>
  );
}

export default BadgeNotifsIllustration;
