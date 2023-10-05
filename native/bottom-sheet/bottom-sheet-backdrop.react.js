// @flow

import { useBottomSheet } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';

type Props = {
  +animatedIndex: SharedValue<number>,
  +onPress: () => mixed,
};

function BottomSheetBackdrop(props: Props): React.Node {
  const { animatedIndex } = props;

  const { close } = useBottomSheet();

  const onPressBackdrop = React.useCallback(() => {
    if (animatedIndex.value >= 0) {
      close();
    }
  }, [animatedIndex.value, close]);

  return (
    <TouchableWithoutFeedback onPress={onPressBackdrop}>
      <View style={styles.backdropContainer} />
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
  },
});

export default BottomSheetBackdrop;
