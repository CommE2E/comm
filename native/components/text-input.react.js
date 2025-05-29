// @flow

import * as React from 'react';
import { TextInput } from 'react-native';

import type { ReactRefSetter } from 'lib/types/react-types.js';

import { useKeyboardAppearance } from '../themes/colors.js';

type Props = React.ElementConfig<typeof TextInput>;
function ForwardedTextInput(
  props: Props,
  ref: ReactRefSetter<React.ElementRef<typeof TextInput>>,
): React.Node {
  const keyboardAppearance = useKeyboardAppearance();
  return (
    <TextInput keyboardAppearance={keyboardAppearance} {...props} ref={ref} />
  );
}

const WrappedTextInput: React.ComponentType<Props> = React.forwardRef<
  Props,
  React.ElementRef<typeof TextInput>,
>(ForwardedTextInput);
WrappedTextInput.displayName = 'CommTextInput';

export default WrappedTextInput;
