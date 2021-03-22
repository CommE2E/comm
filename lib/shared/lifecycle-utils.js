// @flow

import { useSelector } from 'react-redux';

// Note: This hook mimics the prior state.foreground property
// and considers `inactive` on iOS as equivalent to `active`
function useIsAppForegrounded() {
  return useSelector(state => state.lifecycleState !== 'background');
}

function useIsAppBackgroundedOrInactive() {
  return useSelector(state => state.lifecycleState !== 'active');
}

export { useIsAppForegrounded, useIsAppBackgroundedOrInactive };
