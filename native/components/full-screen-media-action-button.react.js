// @flow

import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import SWMansionIcon from './swmansion-icon.react.js';

type IconButtonProps = {
  +children: React.Node,
  +onPress: () => mixed,
  +disabled?: boolean,
  +accessibilityLabel?: string,
};

function FullScreenIconButton(props: IconButtonProps): React.Node {
  const { children, onPress, disabled, accessibilityLabel } = props;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={styles.mediaIconButtons}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  );
}

type MediaActionButtonProps = {
  +iconName: string,
  +iconSize?: number,
  +onPress: () => mixed,
  +disabled?: boolean,
  +accessibilityLabel?: string,
};

function FullScreenMediaActionButton(
  props: MediaActionButtonProps,
): React.Node {
  const { iconName, iconSize, onPress, disabled, accessibilityLabel } = props;
  const mediaIconStyle = React.useMemo(
    () =>
      iconSize ? [styles.mediaIcon, { fontSize: iconSize }] : styles.mediaIcon,
    [iconSize],
  );
  return (
    <FullScreenIconButton
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    >
      <SWMansionIcon name={iconName} style={mediaIconStyle} />
    </FullScreenIconButton>
  );
}

type TextActionButtonProps = {
  +text: string,
  +onPress: () => mixed,
  +disabled?: boolean,
  +accessibilityLabel?: string,
};

function FullScreenTextActionButton(props: TextActionButtonProps): React.Node {
  const { text, onPress, disabled, accessibilityLabel } = props;
  return (
    <FullScreenIconButton
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.textIcon}>{text}</Text>
    </FullScreenIconButton>
  );
}

const iconStyle = {
  color: '#D7D7DC',
  fontSize: 36,
  textShadowColor: '#1C1C1E',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 1,
};

const styles = StyleSheet.create({
  mediaIcon: iconStyle,
  mediaIconButtons: {
    alignItems: 'center',
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 2,
  },
  textIcon: {
    ...iconStyle,
    lineHeight: 36,
  },
});

export { FullScreenMediaActionButton, FullScreenTextActionButton };
