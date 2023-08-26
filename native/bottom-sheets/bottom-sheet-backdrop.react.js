// @flow

import { BottomSheetBackdrop as Backdrop } from '@gorhom/bottom-sheet';
import * as React from 'react';
import type { SharedValue } from 'react-native-reanimated';

type BackdropPressBehavior = 'none' | 'close' | 'collapse';

type Props = {
  +animatedIndex: SharedValue<number>,
  +animatedPosition: SharedValue<number>,
  +opacity?: number,
  +appearsOnIndex?: number,
  +disappearsOnIndex?: number,
  +enableTouchThrough?: boolean,
  +pressBehavior?: BackdropPressBehavior | number,
};

function BottomSheetBackdrop(props: Props): React.Node {
  const {
    opacity,
    appearsOnIndex,
    disappearsOnIndex,
    enableTouchThrough,
    pressBehavior,
  } = props;

  return (
    <Backdrop
      {...props}
      opacity={opacity ?? 0.5}
      appearsOnIndex={appearsOnIndex ?? 0}
      disappearsOnIndex={disappearsOnIndex ?? -1}
      enableTouchThrough={enableTouchThrough ?? false}
      pressBehavior={pressBehavior ?? 'close'}
    />
  );
}

export default BottomSheetBackdrop;
