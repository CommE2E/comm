// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import { styleSelector, colorsSelector, type Colors } from '../themes/colors';

type ListActionProps = {|
  onPress: () => void,
  text: string,
  // Redux state
  colors: Colors,
  styles: typeof styles,
|};
function RelationshipListAddButton(props: ListActionProps) {
  const { panelIosHighlightUnderlay: underlay } = props.colors;

  return (
    <Button
      onPress={props.onPress}
      style={props.styles.button}
      iosFormat="highlight"
      iosHighlightUnderlayColor={underlay}
    >
      <View style={props.styles.container}>
        <Text style={props.styles.text}>{props.text}</Text>
        <Icon name="md-add" size={20} style={styles.icon} />
      </View>
    </Button>
  );
}

const styles = {
  icon: {
    lineHeight: 20,
    color: '#009900',
  },
  addItemRow: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: 'panelForeground',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: Platform.OS === 'ios' ? 12 : 9,
    paddingHorizontal: 12,
    paddingBottom: 8,
    justifyContent: 'center',
  },
  text: {
    color: 'link',
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
  colors: colorsSelector(state),
}))(RelationshipListAddButton);
