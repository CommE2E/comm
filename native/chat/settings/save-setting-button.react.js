// @flow

import * as React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useStyles } from '../../themes/colors';

type Props = {|
  +onPress: () => void,
|};
function SaveSettingButton(props: Props) {
  const styles = useStyles(unboundStyles);
  return (
    <TouchableOpacity onPress={props.onPress} style={styles.container}>
      <Icon name="md-checkbox-outline" size={24} style={styles.editIcon} />
    </TouchableOpacity>
  );
}

const unboundStyles = {
  container: {
    width: 26,
  },
  editIcon: {
    color: 'greenButton',
    position: 'absolute',
    right: 0,
    top: -3,
  },
};

export default SaveSettingButton;
