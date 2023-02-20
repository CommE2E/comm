// @flow

import * as React from 'react';
import { Animated, View } from 'react-native';
// eslint-disable-next-line import/extensions
import SwipeableComponent from 'react-native-gesture-handler/Swipeable';
import { useSelector } from 'react-redux';

import Button from './button.react.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';

type BaseProps = {
  +buttonWidth: number,
  +rightActions: $ReadOnlyArray<{
    +key: string,
    +onPress: () => mixed,
    +color: ?string,
    +content: React.Node,
  }>,
  +onSwipeableRightWillOpen?: () => void,
  +innerRef: {
    current: ?SwipeableComponent,
  },
  +children?: React.Node,
};
type Props = {
  ...BaseProps,
  +windowWidth: number,
  +colors: Colors,
  +styles: typeof unboundStyles,
};

class Swipeable extends React.PureComponent<Props> {
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

const unboundStyles = {
  action: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
  },
};

const ConnectedSwipeable: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedSwipeable(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    const windowWidth = useSelector(state => state.dimensions.width);
    const colors = useColors();

    return (
      <Swipeable
        {...props}
        styles={styles}
        windowWidth={windowWidth}
        colors={colors}
      />
    );
  });

export default ConnectedSwipeable;
