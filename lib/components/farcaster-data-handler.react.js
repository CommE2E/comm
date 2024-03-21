// @flow

import * as React from 'react';

import { useSelector } from '../utils/redux-utils.js';

function FarcasterDataHandler(): React.Node {
  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const prevIsActiveRef = React.useRef<?boolean>();
  React.useEffect(() => {
    if (isActive === prevIsActiveRef.current) {
      return;
    }
    prevIsActiveRef.current = isActive;
    if (!isActive) {
      return;
    }
    // app either just started, or just became active
    // we will fetch Farcaster data here
  }, [isActive]);

  return null;
}

export { FarcasterDataHandler };
