// @flow

import type { ViewStyle, TextStyle } from '../types/styles';
import type {
  DispatchFunctions,
  ActionFunc,
  BoundServerCall,
} from 'lib/utils/action-utils';
import type { InputState } from '../input/input-state';

import * as React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  ViewPropTypes,
} from 'react-native';
import PropTypes from 'prop-types';

import { SingleLine } from '../components/single-line.react';

export type TooltipEntry<Params> = {|
  id: string,
  text: string,
  onPress: (
    props: Params,
    dispatchFunctions: DispatchFunctions,
    bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
    inputState: ?InputState,
  ) => mixed,
|};

type Props<Params, Entry: TooltipEntry<Params>> = {
  spec: Entry,
  onPress: (entry: Entry) => void,
  containerStyle?: ViewStyle,
  labelStyle?: TextStyle,
};
class TooltipItem<
  Params,
  Entry: TooltipEntry<Params>,
> extends React.PureComponent<Props<Params, Entry>> {
  static propTypes = {
    spec: PropTypes.shape({
      text: PropTypes.string.isRequired,
      onPress: PropTypes.func.isRequired,
    }).isRequired,
    onPress: PropTypes.func.isRequired,
    containerStyle: ViewPropTypes.style,
    labelStyle: Text.propTypes.style,
  };

  render() {
    return (
      <TouchableOpacity
        onPress={this.onPress}
        style={[styles.itemContainer, this.props.containerStyle]}
      >
        <SingleLine style={[styles.label, this.props.labelStyle]}>
          {this.props.spec.text}
        </SingleLine>
      </TouchableOpacity>
    );
  }

  onPress = () => {
    this.props.onPress(this.props.spec);
  };
}

const styles = StyleSheet.create({
  itemContainer: {
    padding: 10,
  },
  label: {
    color: '#444',
    fontSize: 14,
    lineHeight: 17,
    textAlign: 'center',
  },
});

export default TooltipItem;
