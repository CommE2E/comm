// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type {
  ____ViewStyleProp_Internal as ViewStyle,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';
import type { KeyboardEvent, EmitterSubscription } from '../keyboard';

import * as React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  LayoutAnimation,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';
import { windowHeight } from '../dimensions';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard';

type ButtonProps = {|
  text: string,
  loadingStatus: LoadingStatus,
  onSubmit: () => void,
|};
class PanelButton extends React.PureComponent<ButtonProps> {

  static propTypes = {
    text: PropTypes.string.isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    onSubmit: PropTypes.func.isRequired,
  };

  render() {
    let buttonIcon;
    if (this.props.loadingStatus === "loading") {
      buttonIcon = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator color="#555" />
        </View>
      );
    } else {
      buttonIcon = (
        <View style={styles.submitContentIconContainer}>
          <Icon name="arrow-right" size={16} color="#555" />
        </View>
      );
    }
    return (
      <Button
        onPress={this.props.onSubmit}
        disabled={this.props.loadingStatus === "loading"}
        topStyle={styles.submitButton}
        style={styles.submitContentContainer}
        iosFormat="highlight"
        iosActiveOpacity={0.85}
        iosHighlightUnderlayColor="#A0A0A0DD"
      >
        <Text style={styles.submitContentText}>{this.props.text}</Text>
        {buttonIcon}
      </Button>
    );
  }

}

function PanelOnePasswordButton(props: {| onPress: () => Promise<void> |}) {
  return (
    <OnePasswordButton
      onPress={props.onPress}
      style={styles.onePasswordImage}
    />
  );
}

type PanelProps = {|
  opacityValue: Animated.Value,
  children: React.Node,
  style?: ViewStyle,
|};
type PanelState = {|
  keyboardHeight: number,
|};
class Panel extends React.PureComponent<PanelProps, PanelState> {

  state = {
    keyboardHeight: 0,
  };
  keyboardShowListener: ?EmitterSubscription;
  keyboardHideListener: ?EmitterSubscription;

  componentDidMount() {
    this.keyboardShowListener = addKeyboardShowListener(this.keyboardHandler);
    this.keyboardHideListener =
      addKeyboardDismissListener(this.keyboardHandler);
  }

  componentWillUnmount() {
    if (this.keyboardShowListener) {
      removeKeyboardListener(this.keyboardShowListener);
      this.keyboardShowListener = null;
    }
    if (this.keyboardHideListener) {
      removeKeyboardListener(this.keyboardHideListener);
      this.keyboardHideListener = null;
    }
  }

  keyboardHandler = (event: ?KeyboardEvent) => {
    const keyboardHeight = event
      ? windowHeight - event.endCoordinates.screenY
      : 0;
    if (keyboardHeight === this.state.keyboardHeight) {
      return;
    }
    if (!event) {
      this.setState({ keyboardHeight });
      return;
    }
    if (event.duration && event.easing) {
      LayoutAnimation.configureNext({
        duration: event.duration,
        update: {
          duration: event.duration,
          type: LayoutAnimation.Types[event.easing] || 'keyboard',
        },
      });
    }
    this.setState({ keyboardHeight });
  }

  render() {
    const opacityStyle = { opacity: this.props.opacityValue };
    const content = (
      <Animated.View style={[styles.container, opacityStyle, this.props.style]}>
        {this.props.children}
      </Animated.View>
    );
    if (windowHeight >= 568) {
      return content;
    }
    const scrollViewStyle = {
      paddingBottom: 73.5 + this.state.keyboardHeight,
    };
    return (
      <View style={scrollViewStyle}>
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  loadingIndicatorContainer: {
    width: 14,
    paddingBottom: 2,
  },
  submitContentIconContainer: {
    width: 14,
    paddingBottom: 5,
  },
  submitButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 6,
  },
  submitContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  submitContentText: {
    fontSize: 18,
    fontFamily: 'OpenSans-Semibold',
    color: "#555",
    paddingRight: 7,
  },
  onePasswordImage: {
    position: 'absolute',
    top: 8,
    right: 5,
  },
  container: {
    paddingBottom: 37,
    paddingTop: 6,
    paddingLeft: 18,
    paddingRight: 18,
    marginLeft: 20,
    marginRight: 20,
    marginTop: windowHeight < 600 ? 15 : 40,
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
  },
});

export {
  PanelButton,
  PanelOnePasswordButton,
  Panel,
};
