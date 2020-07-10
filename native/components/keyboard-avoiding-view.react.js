// @flow

import * as React from 'react';
import {
  KeyboardAvoidingView as BaseKeyboardAvoidingView,
  View,
} from 'react-native';

import { androidOpaqueStatus } from '../selectors/dimension-selectors';

type Props = React.ElementConfig<typeof BaseKeyboardAvoidingView>;
export default function KeyboardAvoidingView(props: Props) {
  if (!androidOpaqueStatus) {
    return <BaseKeyboardAvoidingView {...props} />;
  }
  const {
    behavior,
    contentContainerStyle,
    enabled,
    keyboardVerticalOffset,
    ...viewProps
  } = props;
  if (behavior !== 'position') {
    return <View {...viewProps} />;
  }
  const { children, ...restViewProps } = viewProps;
  return (
    <View {...restViewProps}>
      <View style={contentContainerStyle}>{children}</View>
    </View>
  );
}
