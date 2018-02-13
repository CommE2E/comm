// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import * as React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';

type ButtonProps = {
  text: string,
  loadingStatus: LoadingStatus,
  onSubmit: () => void,
};
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

function PanelOnePasswordButton(props: { onPress: () => Promise<void> }) {
  return (
    <OnePasswordButton
      onPress={props.onPress}
      style={styles.onePasswordImage}
    />
  );
}

type PanelProps = {
  opacityValue: Animated.Value,
  children: React.Node,
  style?: StyleObj,
};
function Panel(props: PanelProps) {
  const opacityStyle = { opacity: props.opacityValue };
  return (
    <Animated.View style={[styles.container, opacityStyle, props.style]}>
      {props.children}
    </Animated.View>
  );
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
    marginTop: 40,
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
  },
});

export {
  PanelButton,
  PanelOnePasswordButton,
  Panel,
};
