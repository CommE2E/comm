// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import * as React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated from 'react-native-reanimated';

import type { LoadingStatus } from 'lib/types/loading-types.js';

import Button from '../components/button.react.js';
import { useSelector } from '../redux/redux-utils.js';
import type { ViewStyle } from '../types/styles.js';

type ButtonProps = {
  +text: string,
  +loadingStatus: LoadingStatus,
  +onSubmit: () => mixed,
  +disabled?: boolean,
};
function PanelButton(props: ButtonProps): React.Node {
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
    <View style={styles.submitButtonHorizontalContainer}>
      <View style={styles.submitButtonVerticalContainer}>
        <Button
          onPress={props.onSubmit}
          disabled={props.disabled || props.loadingStatus === 'loading'}
          topStyle={styles.submitButton}
          style={styles.innerSubmitButton}
          iosFormat="highlight"
          iosActiveOpacity={0.85}
          iosHighlightUnderlayColor="#A0A0A0DD"
        >
          <Text style={styles.submitContentText}>{props.text}</Text>
          {buttonIcon}
        </Button>
      </View>
    </View>
  );
}

type PanelProps = {
  +opacityValue: Animated.Node,
  +children: React.Node,
  +style?: ViewStyle,
};
function Panel(props: PanelProps): React.Node {
  const dimensions = useSelector(state => state.dimensions);
  const containerStyle = React.useMemo(
    () => [
      styles.container,
      {
        opacity: props.opacityValue,
        marginTop: dimensions.height < 641 ? 15 : 40,
      },
      props.style,
    ],
    [props.opacityValue, props.style, dimensions.height],
  );
  return (
    <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={containerStyle}>{props.children}</Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFFAA',
    borderRadius: 6,
    marginLeft: 20,
    marginRight: 20,
    paddingTop: 6,
  },
  innerSubmitButton: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    paddingVertical: 6,
  },
  loadingIndicatorContainer: {
    paddingBottom: 2,
    width: 14,
  },
  submitButton: {
    borderBottomRightRadius: 6,
    justifyContent: 'center',
    paddingLeft: 10,
    paddingRight: 18,
  },
  submitButtonHorizontalContainer: {
    alignSelf: 'flex-end',
  },
  submitButtonVerticalContainer: {
    flexGrow: 1,
    justifyContent: 'center',
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
