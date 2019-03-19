// @flow

import type { Navigate } from '../navigation/route-names';

import * as React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

import { ComposeThreadRouteName } from '../navigation/route-names';
import Button from '../components/button.react';

type Props = {|
  navigate: Navigate,
|};
class ComposeThreadButton extends React.PureComponent<Props> {

  static propTypes = {
    navigate: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Button onPress={this.onPress} androidBorderlessRipple={true}>
        <Icon
          name="ios-create-outline"
          size={30}
          style={styles.composeButton}
          color="#036AFF"
        />
      </Button>
    );
  }

  onPress = () => {
    this.props.navigate({
      routeName: ComposeThreadRouteName,
      params: {},
    });
  }

}

const styles = StyleSheet.create({
  composeButton: {
    paddingHorizontal: 10,
  },
});

export default ComposeThreadButton;
