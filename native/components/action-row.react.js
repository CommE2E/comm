// @flow

import type { IoniconsGlyphs } from '@expo/vector-icons';
import RawIcon from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { View, Text as RawText } from 'react-native';

import Button from '../components/button.react';
import { useColors, useStyles } from '../themes/colors';

type TextProps = {
  +content: string,
  +danger?: boolean,
};

function Text(props: TextProps): React.Node {
  const { content, danger } = props;
  const styles = useStyles(actionRowStyles);
  return (
    <RawText style={danger ? styles.dangerText : styles.text}>
      {content}
    </RawText>
  );
}

type IconProps = {
  +name: IoniconsGlyphs,
};

function Icon(props: IconProps): React.Node {
  const { name } = props;
  const colors = useColors();
  return <RawIcon name={name} size={20} color={colors.navigationChevron} />;
}

type RowProps = {
  +onPress?: () => void,
  +children: React.Node,
};

function Row(props: RowProps): React.Node {
  const { onPress, children } = props;
  const styles = useStyles(actionRowStyles);
  const colors = useColors();

  if (!onPress) {
    return <View style={styles.wrapper}>{children}</View>;
  }

  return (
    <Button
      onPress={onPress}
      style={styles.button}
      iosFormat="highlight"
      iosHighlightUnderlayColor={colors.panelIosHighlightUnderlay}
      iosActiveOpacity={0.85}
    >
      {children}
    </Button>
  );
}

const actionRowStyles = {
  wrapper: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    flexDirection: 'row',
  },
  text: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
  },
  dangerText: {
    color: 'redText',
    flex: 1,
    fontSize: 16,
  },
};

export default { Row, Icon, Text };
