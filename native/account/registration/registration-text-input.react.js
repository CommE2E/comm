// @flow

import * as React from 'react';
import { TextInput } from 'react-native';

import { useStyles, useColors } from '../../themes/colors.js';

type Props = React.ElementConfig<typeof TextInput>;

function ForwardedRegistrationTextInput(props: Props, ref): React.Node {
  const { onFocus, onBlur, style, placeholderTextColor, ...rest } = props;

  const [focused, setFocused] = React.useState(false);
  const ourOnFocus = React.useCallback(
    event => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );
  const ourOnBlur = React.useCallback(
    event => {
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

  return (
    <TextInput
      {...rest}
      style={ourStyle}
      placeholderTextColor={ourPlaceholderTextColor}
      onFocus={ourOnFocus}
      onBlur={ourOnBlur}
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

const RegistrationTextInput: React.AbstractComponent<
  Props,
  React.ElementRef<typeof TextInput>,
> = React.forwardRef<Props, React.ElementRef<typeof TextInput>>(
  ForwardedRegistrationTextInput,
);
RegistrationTextInput.displayName = 'RegistrationTextInput';

const MemoizedRegistrationTextInput: typeof RegistrationTextInput = React.memo<
  Props,
  React.ElementRef<typeof TextInput>,
>(RegistrationTextInput);

export default MemoizedRegistrationTextInput;
