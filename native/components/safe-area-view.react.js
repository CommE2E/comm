// @flow

import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import { View } from 'react-native';
import { useSafeArea } from 'react-native-safe-area-context';

type Props = {|
  style?: ViewStyle,
  children?: React.Node,
|};
function InsetSafeAreaView(props: Props) {
  const insets = useSafeArea();
  const style = [
    { paddingTop: insets.top },
    props.style,
  ];
  return (
    <View style={style}>
      {props.children}
    </View>
  );
}

export default InsetSafeAreaView;
