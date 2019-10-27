// @flow

import type { AppState } from '../../redux/redux-setup';
import type { Styles } from '../../types/styles';

import * as React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../../themes/colors';

type Props = {|
  onPress: () => void,
  // Redux state
  styles: Styles,
|};
function SaveSettingButton(props: Props) {
  return (
    <TouchableOpacity onPress={props.onPress} style={props.styles.container}>
      <Icon
        name="md-checkbox-outline"
        size={24}
        style={props.styles.editIcon}
      />
    </TouchableOpacity>
  );
}

const styles = {
  editIcon: {
    position: 'absolute',
    right: 0,
    top: -3,
    color: 'greenButton',
  },
  container: {
    width: 26,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(SaveSettingButton);
