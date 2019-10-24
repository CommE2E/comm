// @flow

import type { TextStyle } from '../types/styles';
import type { AppState } from '../redux/redux-setup';
import type { Colors } from '../themes/colors';

import * as React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { connect } from 'lib/utils/redux-utils';

import { colorsSelector } from '../themes/colors';

type Props = {|
  onPress: () => void,
  canChangeSettings: bool,
  style?: TextStyle,
  // Redux state
  colors: Colors,
|};
function EditSettingButton(props: Props) {
  if (!props.canChangeSettings) {
    return null;
  }
  const appliedStyles = [styles.editIcon];
  if (props.style) {
    appliedStyles.push(props.style);
  }
  const { link: linkColor } = props.colors;
  return (
    <TouchableOpacity onPress={props.onPress}>
      <Icon
        name="pencil"
        size={16}
        style={appliedStyles}
        color={linkColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  editIcon: {
    paddingLeft: 10,
    paddingTop: Platform.select({ android: 1, default: 0 }),
    textAlign: 'right',
  },
});

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
}))(EditSettingButton);
