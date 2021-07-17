// @flow

import * as React from 'react';
import { TextInput } from 'react-native';

type TextInputProps = React.ElementConfig<typeof TextInput>;
export type ClearableTextInputProps = {
  ...TextInputProps,
  textInputRef: (textInput: ?React.ElementRef<typeof TextInput>) => mixed,
  onChangeText: $NonMaybeType<$PropertyType<TextInputProps, 'onChangeText'>>,
  value: $NonMaybeType<$PropertyType<TextInputProps, 'value'>>,
};
