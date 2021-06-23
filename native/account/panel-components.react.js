// @flow

import * as React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome';

import type { LoadingStatus } from 'lib/types/loading-types';

import Button from '../components/button.react';
import type { KeyboardEvent, EmitterSubscription } from '../keyboard/keyboard';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard/keyboard';
import { type DimensionsInfo } from '../redux/dimensions-updater.react';
import { useSelector } from '../redux/redux-utils';
import type { ViewStyle } from '../types/styles';

type ButtonProps = {|
  +text: string,
  +loadingStatus: LoadingStatus,
  +onSubmit: () => void,
|};
function PanelButton(props: ButtonProps) {
  let buttonIcon;
  if (props.loadingStatus === 'loading') {
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
      onPress={props.onSubmit}
      disabled={props.loadingStatus === 'loading'}
      topStyle={styles.submitButton}
      style={styles.submitContentContainer}
      iosFormat="highlight"
      iosActiveOpacity={0.85}
      iosHighlightUnderlayColor="#A0A0A0DD"
    >
      <Text style={styles.submitContentText}>{props.text}</Text>
      {buttonIcon}
    </Button>
  );
}

const scrollViewBelow = 568;

type PanelBaseProps = {|
  +opacityValue: Animated.Value,
  +children: React.Node,
  +style?: ViewStyle,
|};
type PanelProps = {|
  ...PanelBaseProps,
  +dimensions: DimensionsInfo,
|};
type PanelState = {|
  +keyboardHeight: number,
|};
class InnerPanel extends React.PureComponent<PanelProps, PanelState> {
  state: PanelState = {
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
    const windowHeight = this.props.dimensions.height;
    if (
      windowHeight < scrollViewBelow &&
      event &&
      event.duration &&
      event.easing
    ) {
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
      marginTop: windowHeight < 641 ? 15 : 40,
    };
    const content = (
      <Animated.View
        style={[styles.container, containerStyle, this.props.style]}
      >
        {this.props.children}
      </Animated.View>
    );
    if (windowHeight >= scrollViewBelow) {
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

const Panel = React.memo<PanelBaseProps>(function ConnectedPanel(
  props: PanelBaseProps,
) {
  const dimensions = useSelector((state) => state.dimensions);

  return <InnerPanel {...props} dimensions={dimensions} />;
});

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

export { PanelButton, Panel };
