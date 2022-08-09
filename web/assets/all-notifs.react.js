// @flow

import * as React from 'react';

function AllNotifsIllustration(): React.Node {
  return (
    <svg width={46} height={86} xmlns="http://www.w3.org/2000/svg">
      <title>{'all-notifs'}</title>
      <g transform="translate(.5 .5)" fill="none" fillRule="evenodd">
        <path
          d="M5.5 0h34A5.5 5.5 0 0 1 45 5.5v74a5.5 5.5 0 0 1-5.5 5.5h-34A5.5 5.5 0 0 1 0 79.5v-74A5.5 5.5 0 0 1 5.5 0Z"
          stroke="#666"
        />
        <circle fill="#C4C4C4" fillRule="nonzero" cx={22.5} cy={75.5} r={3} />
        <path
          d="M41.5 13.643a3.143 3.143 0 0 0-3.143-3.143H6.643A3.143 3.143 0 0 0 3.5 13.643v4.714A3.143 3.143 0 0 0 6.643 21.5h31.714a3.143 3.143 0 0 0 3.143-3.143v-4.714Z"
          fill="#7E57C2"
          fillRule="nonzero"
        />
        <path
          d="M16.9 46.5h11.2a1.4 1.4 0 0 1 1.4 1.4v11.2a1.4 1.4 0 0 1-1.4 1.4H16.9a1.4 1.4 0 0 1-1.4-1.4V47.9a1.4 1.4 0 0 1 1.4-1.4Z"
          fill="gray"
          fillRule="nonzero"
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

export default AllNotifsIllustration;
