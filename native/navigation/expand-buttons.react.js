// @flow

import Icon from '@expo/vector-icons/FontAwesome';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import { useStyles } from '../themes/colors';

const ICON_SIZE = 20;
const PADDING_HORIZONTAL = 7.5;

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
    <TouchableOpacity onPress={props.onPress}>
      <Icon name={icon} size={ICON_SIZE} style={style} />
    </TouchableOpacity>
  );
}

function ExpandButtonDisabled(): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <Icon
      name="caret-right"
      size={ICON_SIZE}
      style={styles.expandButtonDisabled}
    />
  );
}

const unboundStyles = {
  expandButton: {
    color: 'drawerExpandButton',
    paddingHorizontal: PADDING_HORIZONTAL,
  },
  expandButtonDisabled: {
    color: 'drawerExpandButtonDisabled',
    paddingHorizontal: PADDING_HORIZONTAL,
  },
  expandButtonExpanded: {
    color: 'drawerExpandButton',
    paddingHorizontal: PADDING_HORIZONTAL,
  },
};

export { ExpandButton, ExpandButtonDisabled };
