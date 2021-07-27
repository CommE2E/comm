// @flow

import * as React from 'react';
import { TextInput as BaseTextInput } from 'react-native';

import { useKeyboardAppearance } from '../themes/colors';

type Props = React.ElementConfig<typeof BaseTextInput>;
function ForwardedTextInput(
  props: Props,
  ref: React.Ref<typeof TextInput>,
): React.Node {
  const keyboardAppearance = useKeyboardAppearance();
  return (
    <BaseTextInput
      keyboardAppearance={keyboardAppearance}
      {...props}
      ref={ref}
    />
  );
}

const TextInput: React.AbstractComponent<
  Props,
  typeof BaseTextInput,
> = React.forwardRef<Props, typeof BaseTextInput>(ForwardedTextInput);
TextInput.displayName = 'CommTextInput';

export default TextInput;
