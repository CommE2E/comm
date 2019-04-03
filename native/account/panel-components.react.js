// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { ViewStyle } from '../types/styles';
import type { KeyboardEvent, EmitterSubscription } from '../keyboard';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
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

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';
import { dimensionsSelector } from '../selectors/dimension-selectors';
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
  dimensions: Dimensions,
|};
type PanelState = {|
  keyboardHeight: number,
|};
class InnerPanel extends React.PureComponent<PanelProps, PanelState> {

  static propTypes = {
    opacityValue: PropTypes.instanceOf(Animated.Value).isRequired,
    children: PropTypes.node.isRequired,
    style: ViewPropTypes.style,
    dimensions: dimensionsPropType.isRequired,
  };
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
    const windowHeight = this.props.dimensions.height;
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
    const windowHeight = this.props.dimensions.height;
    const containerStyle = {
      opacity: this.props.opacityValue,
      marginTop: windowHeight < 600 ? 15 : 40,
    };
    const content = (
      <Animated.View style={[
        styles.container,
        containerStyle,
        this.props.style,
      ]}>
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

const Panel = connect(
  (state: AppState) => ({
    dimensions: dimensionsSelector(state),
  }),
)(InnerPanel);

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
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
  },
});

export {
  PanelButton,
  PanelOnePasswordButton,
  Panel,
};
