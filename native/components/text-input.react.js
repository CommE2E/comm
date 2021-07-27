// @flow

import * as React from 'react';
import { TextInput as BaseTextInput } from 'react-native';

type Props = React.ElementConfig<typeof BaseTextInput>;
function ForwardedTextInput(
  props: Props,
  ref: React.Ref<typeof TextInput>,
): React.Node {
  return <BaseTextInput {...props} ref={ref} />;
}

const TextInput: React.AbstractComponent<
  Props,
  typeof BaseTextInput,
> = React.forwardRef<Props, typeof BaseTextInput>(ForwardedTextInput);
TextInput.displayName = 'CommTextInput';

export default TextInput;
