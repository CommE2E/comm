// @flow

import Icon from '@expo/vector-icons/FontAwesome';
import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useStyles } from '../themes/colors';

const iconSize = 12;
const buttonSize = 24;
const hitSlopValue = 6;
const padding = (buttonSize - iconSize) / 2;

const hitSlop = {
  bottom: hitSlopValue,
  left: hitSlopValue,
  right: hitSlopValue,
  top: hitSlopValue,
};

type Props = {
  +onPress: () => void,
  +expanded: boolean,
};

function ExpandButton(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const style = props.expanded
    ? styles.expandButtonExpanded
    : styles.expandButton;
  const icon = props.expanded ? 'caret-down' : 'caret-right';

  return (
    <TouchableOpacity
      onPress={props.onPress}
      hitSlop={hitSlop}
      style={styles.wrapper}
    >
      <Icon name={icon} size={iconSize} style={style} />
    </TouchableOpacity>
  );
}

function ExpandButtonDisabled(): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.wrapper}>
      <Icon
        name="caret-right"
        size={iconSize}
        style={styles.expandButtonDisabled}
      />
    </View>
  );
}

const unboundStyles = {
  expandButton: {
    color: 'drawerExpandButton',
  },
  expandButtonDisabled: {
    color: 'drawerExpandButtonDisabled',
  },
  expandButtonExpanded: {
    color: 'drawerExpandButton',
  },
  wrapper: {
    width: buttonSize,
    alignItems: 'center',
    padding: padding,
  },
};

export { ExpandButton, ExpandButtonDisabled };
