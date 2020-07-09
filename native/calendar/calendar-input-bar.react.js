// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Text } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import { styleSelector } from '../themes/colors';

type Props = {|
  onSave: () => void,
  disabled: boolean,
  // Redux state
  styles: typeof styles,
|};
function CalendarInputBar(props: Props) {
  const inactiveStyle = props.disabled
    ? props.styles.inactiveContainer
    : undefined;
  return (
    <View
      style={[props.styles.container, inactiveStyle]}
      pointerEvents={props.disabled ? 'none' : 'auto'}
    >
      <Button onPress={props.onSave} iosActiveOpacity={0.5}>
        <Text style={props.styles.saveButtonText}>Save</Text>
      </Button>
    </View>
  );
}

const styles = {
  container: {
    alignItems: 'flex-end',
    backgroundColor: 'listInputBar',
  },
  inactiveContainer: {
    opacity: 0,
  },
  saveButtonText: {
    color: 'link',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
    padding: 8,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(CalendarInputBar);
