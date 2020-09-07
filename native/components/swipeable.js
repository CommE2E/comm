// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { Animated, View } from 'react-native';
import PropTypes from 'prop-types';
import SwipeableComponent from 'react-native-gesture-handler/Swipeable';

import { connect } from 'lib/utils/redux-utils';

import Button from './button.react';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';

type Props = {
  +buttonWidth: number,
  +rightActions: $ReadOnlyArray<{|
    +key: string,
    +onPress: () => mixed,
    +color: ?string,
    +content: React.Node,
  |}>,
  +onSwipeableRightWillOpen?: () => void,
  +innerRef: {|
    current: ?SwipeableComponent,
  |},
  +children?: React.Node,
  // Redux state
  +windowWidth: number,
  +colors: Colors,
  +styles: typeof styles,
  ...
};

class Swipeable extends React.PureComponent<Props> {
  static propTypes = {
    buttonWidth: PropTypes.number.isRequired,
    rightActions: PropTypes.arrayOf(
      PropTypes.exact({
        key: PropTypes.string.isRequired,
        onPress: PropTypes.func.isRequired,
        color: PropTypes.string,
        content: PropTypes.node.isRequired,
      }),
    ),
    onSwipeableRightWillOpen: PropTypes.func,
    innerRef: PropTypes.exact({
      current: PropTypes.instanceOf(SwipeableComponent),
    }),
    children: PropTypes.node,
    windowWidth: PropTypes.number.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

  static defaultProps = {
    rightActions: [],
  };

  renderRightActions = progress => {
    const actions = this.props.rightActions.map(
      ({ key, content, color, onPress }, i) => {
        const translation = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [
            (this.props.rightActions.length - i) * this.props.buttonWidth,
            0,
          ],
        });
        return (
          <Animated.View
            key={key}
            style={{
              transform: [{ translateX: translation }],
            }}
          >
            <Button
              onPress={onPress}
              style={[
                this.props.styles.action,
                {
                  width: this.props.windowWidth + this.props.buttonWidth,
                  marginRight: -this.props.windowWidth,
                  paddingRight: this.props.windowWidth,
                  backgroundColor: color,
                },
              ]}
            >
              {content}
            </Button>
          </Animated.View>
        );
      },
    );

    return <View style={this.props.styles.actionsContainer}>{actions}</View>;
  };

  render() {
    return (
      <SwipeableComponent
        renderRightActions={this.renderRightActions}
        ref={this.props.innerRef}
        onSwipeableRightWillOpen={this.props.onSwipeableRightWillOpen}
      >
        {this.props.children}
      </SwipeableComponent>
    );
  }
}

const styles = {
  action: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  windowWidth: state.dimensions.width,
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(Swipeable);
