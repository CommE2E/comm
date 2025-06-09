// @flow

import * as React from 'react';
import { TextInput } from 'react-native';

import { useKeyboardAppearance } from '../themes/colors.js';

type Props = React.ElementConfig<typeof TextInput>;
function ForwardedTextInput(
  props: Props,
  ref: React.RefSetter<React.ElementRef<typeof TextInput>>,
): React.Node {
  const keyboardAppearance = useKeyboardAppearance();
  return (
    <TextInput keyboardAppearance={keyboardAppearance} {...props} ref={ref} />
  );
}

type WrappedTextInputComponentType = component(
  ref: React.RefSetter<React.ElementRef<typeof TextInput>>,
  ...Props
);

const WrappedTextInput: WrappedTextInputComponentType = React.forwardRef<
  Props,
  React.ElementRef<typeof TextInput>,
>(ForwardedTextInput);
WrappedTextInput.displayName = 'CommTextInput';

export default WrappedTextInput;
