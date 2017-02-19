// @flow

import type { NavigationScreenProp } from 'react-navigation';

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableHighlight,
  LayoutAnimation,
} from 'react-native';

class LoggedOutModal extends React.PureComponent {

  props: {
    navigation: NavigationScreenProp<*, *>,
  };

  state: {
    mode: "prompt" | "log-in" | "register",
  } = {
    mode: "prompt",
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

  componentWillUpdate() {
    LayoutAnimation.spring();
  }

  render() {
    const alignSelf = this.state.mode === "prompt" ? "center" : "flex-start";
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={[styles.header, { alignSelf }]}>
            SquadCal
          </Text>
        </View>
        <TouchableHighlight
          onPress={this.onPressLogIn}
          style={styles.button}
          underlayColor='#E0E0E0'
          activeOpacity={1}
        >
          <Text style={styles.buttonText}>
            LOG IN
          </Text>
        </TouchableHighlight>
        <TouchableHighlight
          onPress={this.onPressRegister}
          style={styles.button}
          underlayColor='#E0E0E0'
          activeOpacity={1}
        >
          <Text style={styles.buttonText}>
            REGISTER
          </Text>
        </TouchableHighlight>
      </View>
    );
  }

  onPressLogIn = () => {
    this.props.navigation.goBack();
  }

  onPressRegister = () => {
    this.setState({ mode: "register" });
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f88742',
    paddingTop: 50,
    paddingBottom: 50,
  },
  headerContainer: {
    flex: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  header: {
    flex: 1,
    fontFamily: 'Anaheim-Regular',
    color: 'white',
    fontSize: 48,
    textAlign: 'center',
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
    borderRadius: 12,
    backgroundColor: 'white',
    alignSelf: 'stretch',
  },
  buttonText: {
    fontSize: 22,
    fontFamily: 'OpenSans-Semibold',
    color: '#f88742',
    textAlign: 'center',
  },
});

export default LoggedOutModal;
