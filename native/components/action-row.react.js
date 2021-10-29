// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Button from '../components/button.react';
import { useColors, useStyles } from '../themes/colors';

type Props = {
  +content: string,
  +onPress: () => void,
};

function ActionRow(props: Props): React.Node {
  const { content, onPress } = props;
  const styles = useStyles(actionRowStyles);
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Button
        onPress={onPress}
        style={styles.submenuButton}
        iosFormat="highlight"
        iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
        iosActiveOpacity={0.85}
      >
        <Text style={styles.submenuText}>{content}</Text>
        <Icon
          name="ios-arrow-forward"
          size={20}
          color={colors.navigationChevron}
        />
      </Button>
    </View>
  );
}

const actionRowStyles = {
  section: {
    backgroundColor: 'panelForeground',
  },
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submenuText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
  },
};

export default ActionRow;
