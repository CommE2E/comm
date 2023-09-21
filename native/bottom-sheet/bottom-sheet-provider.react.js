// @flow

import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';

export type BottomSheetContextType = {
  +contentHeight: number,
  +setContentHeight: SetState<number>,
};

const BottomSheetContext: React.Context<?BottomSheetContextType> =
  React.createContext<?BottomSheetContextType>();

type Props = {
  +children: React.Node,
};
function BottomSheetProvider(props: Props): React.Node {
  const { children } = props;

  const [contentHeight, setContentHeight] = React.useState(1);

  const context = React.useMemo(
    () => ({
      contentHeight,
      setContentHeight,
    }),
    [contentHeight],
  );

  return (
    <BottomSheetContext.Provider value={context}>
      {children}
    </BottomSheetContext.Provider>
  );
}

export { BottomSheetContext, BottomSheetProvider };
