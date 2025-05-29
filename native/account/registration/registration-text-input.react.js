// @flow

import * as React from 'react';
import { TextInput } from 'react-native';

import type { ReactRefSetter } from 'lib/types/react-types.js';

import {
  useStyles,
  useColors,
  useKeyboardAppearance,
} from '../../themes/colors.js';
import type { FocusEvent, BlurEvent } from '../../types/react-native.js';

type Props = React.ElementConfig<typeof TextInput>;

function ForwardedRegistrationTextInput(
  props: Props,
  ref: ReactRefSetter<React.ElementRef<typeof TextInput>>,
): React.Node {
  const {
    onFocus,
    onBlur,
    style,
    placeholderTextColor,
    keyboardAppearance,
    ...rest
  } = props;

  const [focused, setFocused] = React.useState(false);
  const ourOnFocus = React.useCallback(
    (event: FocusEvent) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );
  const ourOnBlur = React.useCallback(
    (event: BlurEvent) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const styles = useStyles(unboundStyles);
  const ourStyle = React.useMemo(
    () =>
      focused
        ? [styles.textInput, styles.focusedTextInput, style]
        : [styles.textInput, style],
    [focused, styles.textInput, styles.focusedTextInput, style],
  );

  const colors = useColors();
  const ourPlaceholderTextColor =
    placeholderTextColor ?? colors.panelSecondaryForegroundBorder;

  const themeKeyboardAppearance = useKeyboardAppearance();
  const ourKeyboardAppearance = keyboardAppearance ?? themeKeyboardAppearance;

  return (
    <TextInput
      {...rest}
      style={ourStyle}
      placeholderTextColor={ourPlaceholderTextColor}
      onFocus={ourOnFocus}
      onBlur={ourOnBlur}
      keyboardAppearance={ourKeyboardAppearance}
      ref={ref}
    />
  );
}

const unboundStyles = {
  textInput: {
    color: 'panelForegroundLabel',
    borderColor: 'panelSecondaryForegroundBorder',
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
  },
  focusedTextInput: {
    borderColor: 'panelForegroundLabel',
  },
};

const RegistrationTextInput: React.ComponentType<Props> = React.forwardRef<
  Props,
  React.ElementRef<typeof TextInput>,
>(ForwardedRegistrationTextInput);
RegistrationTextInput.displayName = 'RegistrationTextInput';

const MemoizedRegistrationTextInput: typeof RegistrationTextInput = React.memo<
  Props,
  React.ElementRef<typeof TextInput>,
>(RegistrationTextInput);

export default MemoizedRegistrationTextInput;
