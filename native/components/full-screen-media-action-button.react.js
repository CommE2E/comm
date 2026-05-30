// @flow

import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import SWMansionIcon from './swmansion-icon.react.js';

type Props = {
  +iconName: string,
  +label: string,
  +onPress: () => mixed,
  +disabled?: boolean,
  +accessibilityLabel?: string,
};

function FullScreenMediaActionButton(props: Props): React.Node {
  const { iconName, label, onPress, disabled, accessibilityLabel } = props;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={styles.mediaIconButtons}
      accessibilityLabel={accessibilityLabel}
    >
      <SWMansionIcon name={iconName} style={styles.mediaIcon} />
      <Text style={styles.mediaIconText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mediaIcon: {
    color: '#D7D7DC',
    fontSize: 36,
    textShadowColor: '#1C1C1E',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  mediaIconButtons: {
    alignItems: 'center',
    paddingBottom: 2,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 2,
  },
  mediaIconText: {
    color: '#D7D7DC',
    fontSize: 14,
    textShadowColor: '#1C1C1E',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default FullScreenMediaActionButton;
