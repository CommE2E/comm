// @flow

import * as React from 'react';
import { TextInput as BaseTextInput } from 'react-native';

type TextInputProps = React.ElementConfig<typeof BaseTextInput>;
export type ClearableTextInputProps = {
  ...TextInputProps,
  textInputRef: (textInput: ?React.ElementRef<typeof BaseTextInput>) => mixed,
  onChangeText: $NonMaybeType<$PropertyType<TextInputProps, 'onChangeText'>>,
  value: $NonMaybeType<$PropertyType<TextInputProps, 'value'>>,
  onSelectionChange: $PropertyType<TextInputProps, 'onSelectionChange'>,
  selection: $NonMaybeType<$PropertyType<TextInputProps, 'selection'>>,
};
