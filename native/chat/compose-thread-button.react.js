// @flow

import type { Navigate } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { ComposeThreadRouteName } from '../navigation/route-names';
import Button from '../components/button.react';
import { type Colors, colorsPropType, colorsSelector } from '../themes/colors';

type Props = {|
  navigate: Navigate,
  // Redux state
  colors: Colors,
|};
class ComposeThreadButton extends React.PureComponent<Props> {
  static propTypes = {
    navigate: PropTypes.func.isRequired,
    colors: colorsPropType.isRequired,
  };

  render() {
    const { link: linkColor } = this.props.colors;
    return (
      <Button onPress={this.onPress} androidBorderlessRipple={true}>
        <Icon
          name="pencil-plus-outline"
          size={26}
          style={styles.composeButton}
          color={linkColor}
        />
      </Button>
    );
  }

  onPress = () => {
    this.props.navigate({
      name: ComposeThreadRouteName,
      params: {},
    });
  };
}

const styles = StyleSheet.create({
  composeButton: {
    paddingHorizontal: 10,
  },
});

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
}))(ComposeThreadButton);
