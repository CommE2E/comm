// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { ViewStyle } from '../types/styles';
import type { KeyboardEvent, EmitterSubscription } from '../keyboard/keyboard';
import {
  type DimensionsInfo,
  dimensionsInfoPropType,
} from '../redux/dimensions-updater.react';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  LayoutAnimation,
  ViewPropTypes,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import Reanimated from 'react-native-reanimated';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard/keyboard';

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
    if (this.props.loadingStatus === 'loading') {
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
        disabled={this.props.loadingStatus === 'loading'}
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
      theme="light"
      style={styles.onePasswordImage}
    />
  );
}

type PanelProps = {|
  opacityValue: Animated.Value,
  animationLibrary: 'react-native' | 'reanimated',
  children: React.Node,
  style?: ViewStyle,
  dimensions: DimensionsInfo,
|};
type PanelState = {|
  keyboardHeight: number,
|};
class InnerPanel extends React.PureComponent<PanelProps, PanelState> {
  static propTypes = {
    opacityValue: PropTypes.object.isRequired,
    animationLibrary: PropTypes.oneOf(['react-native', 'reanimated']),
    children: PropTypes.node.isRequired,
    style: ViewPropTypes.style,
    dimensions: dimensionsInfoPropType.isRequired,
  };
  static defaultProps = {
    animationLibrary: 'reanimated',
  };
  state = {
    keyboardHeight: 0,
  };
  keyboardShowListener: ?EmitterSubscription;
  keyboardHideListener: ?EmitterSubscription;

  componentDidMount() {
    this.keyboardShowListener = addKeyboardShowListener(this.keyboardHandler);
    this.keyboardHideListener = addKeyboardDismissListener(
      this.keyboardHandler,
    );
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
    const frameEdge =
      this.props.dimensions.height - this.props.dimensions.bottomInset;
    const keyboardHeight = event ? frameEdge - event.endCoordinates.screenY : 0;
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
  };

  render() {
    const windowHeight = this.props.dimensions.height;
    const containerStyle = {
      opacity: this.props.opacityValue,
      marginTop: windowHeight < 600 ? 15 : 40,
    };
    const AnimatedView =
      this.props.animationLibrary === 'react-native'
        ? Animated.View
        : Reanimated.View;
    const content = (
      <AnimatedView
        style={[styles.container, containerStyle, this.props.style]}
      >
        {this.props.children}
      </AnimatedView>
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

const Panel = connect((state: AppState) => ({
  dimensions: state.dimensions,
}))(InnerPanel);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFFAA',
    borderRadius: 6,
    marginLeft: 20,
    marginRight: 20,
    paddingBottom: 37,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 6,
  },
  loadingIndicatorContainer: {
    paddingBottom: 2,
    width: 14,
  },
  onePasswordImage: {
    position: 'absolute',
    right: 5,
    top: 8,
  },
  submitButton: {
    borderBottomRightRadius: 6,
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
  submitContentContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  submitContentIconContainer: {
    paddingBottom: 5,
    width: 14,
  },
  submitContentText: {
    color: '#555',
    fontFamily: 'OpenSans-Semibold',
    fontSize: 18,
    paddingRight: 7,
  },
});

export { PanelButton, PanelOnePasswordButton, Panel };
