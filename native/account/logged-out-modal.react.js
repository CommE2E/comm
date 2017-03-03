// @flow

import type { NavigationScreenProp } from 'react-navigation';

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
} from 'react-native';

import LogInPanel from './log-in-panel.react';
import RegisterPanel from './register-panel.react';
import ConnectedStatusBar from '../connected-status-bar.react';

class LoggedOutModal extends React.PureComponent {

  props: {
    navigation: NavigationScreenProp<*, *>,
  };

  state: {
    mode: "prompt" | "log-in" | "register",
    paddingTop: Animated.Value,
  } = {
    mode: "prompt",
    paddingTop: new Animated.Value(200),
  };

  static propTypes = {
    navigation: React.PropTypes.shape({
      navigate: React.PropTypes.func.isRequired,
    }).isRequired,
  };

  static navigationOptions = {
    cardStack: {
      gesturesEnabled: false,
    },
  };

  render() {
    const padding = { paddingTop: this.state.paddingTop };
    let content = null;
    if (this.state.mode === "log-in") {
      content = <LogInPanel navigateToApp={this.props.navigation.goBack} />;
    } else if (this.state.mode === "register") {
      content = <RegisterPanel navigateToApp={this.props.navigation.goBack} />;
    }
    return (
      <View style={styles.container}>
        <Image
          source={require("../img/logged-out-modal-background.jpg")}
          style={styles.loggedOutModalBackgroundContainer}
        />
        <Animated.Text style={[styles.header, padding]}>
          SquadCal
        </Animated.Text>
        {content}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={this.onPressLogIn}
            style={styles.button}
            activeOpacity={0.6}
          >
            <Text style={styles.buttonText}>
              LOG IN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={this.onPressRegister}
            style={styles.button}
            activeOpacity={0.6}
          >
            <Text style={styles.buttonText}>
              SIGN UP
            </Text>
          </TouchableOpacity>
        </View>
        <ConnectedStatusBar barStyle="light-content" />
      </View>
    );
  }

  onPressLogIn = () => {
    Animated.timing(
      this.state.paddingTop,
      {
        easing: Easing.out(Easing.exp),
        toValue: 0,
      },
    ).start();
    this.setState({ mode: "log-in" });
  }

  onPressRegister = () => {
    Animated.timing(
      this.state.paddingTop,
      {
        easing: Easing.out(Easing.exp),
        toValue: 0,
      },
    ).start();
    this.setState({ mode: "register" });
  }

}

const styles = StyleSheet.create({
  loggedOutModalBackgroundContainer: {
    position: 'absolute',
  },
  container: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 50,
    backgroundColor: 'transparent',
  },
  header: {
    fontFamily: 'Anaheim-Regular',
    color: 'white',
    fontSize: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
  },
  button: {
    paddingBottom: 6,
    paddingTop: 6,
    paddingLeft: 18,
    paddingRight: 18,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
  },
  buttonText: {
    fontSize: 22,
    fontFamily: 'OpenSans-Semibold',
    textAlign: 'center',
    color: '#000000FF',
  },
});

export default LoggedOutModal;
