// @flow

import * as React from 'react';
import { TextInput as BaseTextInput } from 'react-native';

type TextInputProps = React.ElementConfig<typeof BaseTextInput>;
export type ClearableTextInputProps = {
  ...TextInputProps,
  +textInputRef: (textInput: ?React.ElementRef<typeof BaseTextInput>) => mixed,
  +onChangeText: $NonMaybeType<TextInputProps['onChangeText']>,
  +value: $NonMaybeType<TextInputProps['value']>,
};
