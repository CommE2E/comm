// @flow

import type { NavigationScreenProp } from 'react-navigation';

import React from 'react';
import {
  Image,
  Text,
  View,
  StyleSheet,
} from 'react-native';

import ConnectedStatusBar from '../connected-status-bar.react';

type VerificationModalNavProps = {
  verifyCode: string,
};
type Props = {
  navigation: NavigationScreenProp<VerificationModalNavProps, *>,
};
class VerificationModal extends React.PureComponent {

  static propTypes = {
    navigation: React.PropTypes.shape({
      state: React.PropTypes.shape({
        params: React.PropTypes.shape({
          verifyCode: React.PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
    }).isRequired,
  };

  props: Props;

  render() {
    const statusBar = <ConnectedStatusBar barStyle="light-content" />;
    const background = (
      <Image
        source={require("../img/logged-out-modal-background.jpg")}
        style={styles.modalBackgroundContainer}
      />
    );
    const header = (
      <Text style={styles.header}>
        {this.props.navigation.state.params.verifyCode}
      </Text>
    );
    return (
      <View style={styles.container}>
        {statusBar}
        {background}
        {header}
      </View>
    );
  }

}

const styles = StyleSheet.create({
  modalBackgroundContainer: {
    position: 'absolute',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    fontFamily: 'Anaheim-Regular',
    color: 'white',
    fontSize: 48,
    textAlign: 'center',
  },
});

export default VerificationModal;
