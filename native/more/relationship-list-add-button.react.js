// @flow

import { connect } from 'lib/utils/redux-utils';
import * as React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';

import Button from '../components/button.react';
import type { AppState } from '../redux/redux-setup';
import { colorsSelector, type Colors } from '../themes/colors';

type ListActionProps = {|
  onPress: () => void,
  // Redux state
  colors: Colors,
|};
function RelationshipListAddButton(props: ListActionProps) {
  const { link: linkColor } = props.colors;

  return (
    <Button onPress={props.onPress} androidBorderlessRipple={true}>
      <Icon
        name="md-person-add"
        size={26}
        color={linkColor}
        style={styles.icon}
      />
    </Button>
  );
}

const styles = {
  icon: {
    paddingHorizontal: 15,
  },
};

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
}))(RelationshipListAddButton);
