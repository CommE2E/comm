// @flow

import * as React from 'react';

export const useIsomorphicLayoutEffect: typeof React.useEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;
