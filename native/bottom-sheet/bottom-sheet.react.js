// @flow

import { default as GorhomBottomSheet } from '@gorhom/bottom-sheet';
import invariant from 'invariant';
import * as React from 'react';

import BottomSheetBackdrop from './bottom-sheet-backdrop.react.js';
import BottomSheetHandle from './bottom-sheet-handle.react.js';
import { BottomSheetContext } from './bottom-sheet-provider.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +children: React.Node,
  +onClosed: () => mixed,
};

function ForwardedBottomSheet(
  props: Props,
  ref: React.Ref<typeof GorhomBottomSheet>,
): React.Node {
  const { children, onClosed } = props;

  const styles = useStyles(unboundStyles);

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');

  const { contentHeight } = bottomSheetContext;

  const snapPoints = React.useMemo(() => [contentHeight], [contentHeight]);

  const onChange = React.useCallback(
    (index: number) => {
      if (index === -1) {
        onClosed();
      }
    },
    [onClosed],
  );

  return (
    <GorhomBottomSheet
      ref={ref}
      backgroundStyle={styles.background}
      snapPoints={snapPoints}
      handleComponent={BottomSheetHandle}
      backdropComponent={BottomSheetBackdrop}
      onChange={onChange}
      enablePanDownToClose={true}
    >
      {children}
    </GorhomBottomSheet>
  );
}

const unboundStyles = {
  background: {
    backgroundColor: 'modalForeground',
  },
};

const BottomSheet: React.AbstractComponent<
  Props,
  React.ElementRef<typeof GorhomBottomSheet>,
> = React.forwardRef<Props, React.ElementRef<typeof GorhomBottomSheet>>(
  ForwardedBottomSheet,
);
BottomSheet.displayName = 'BottomSheet';

const MemoizedBottomSheet: typeof BottomSheet = React.memo<
  Props,
  React.ElementRef<typeof GorhomBottomSheet>,
>(BottomSheet);

export default MemoizedBottomSheet;
