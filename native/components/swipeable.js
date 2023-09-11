// @flow

import * as React from 'react';
import { Animated, View } from 'react-native';
// eslint-disable-next-line import/extensions
import SwipeableComponent from 'react-native-gesture-handler/Swipeable';
import { useSelector } from 'react-redux';

import Button from './button.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
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

function Swipeable(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const windowWidth = useSelector(state => state.dimensions.width);

  const {
    buttonWidth,
    rightActions = [],
    onSwipeableRightWillOpen,
    innerRef,
    children,
  } = props;

  const renderRightActions = React.useCallback(
    progress => {
      const actions = rightActions.map(
        ({ key, content, color, onPress }, i) => {
          const translation = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [(rightActions.length - i) * buttonWidth, 0],
          });
          return (
            <Animated.View
              key={key}
              style={{ transform: [{ translateX: translation }] }}
            >
              <Button
                onPress={onPress}
                style={[
                  styles.action,
                  {
                    width: windowWidth + buttonWidth,
                    marginRight: -windowWidth,
                    paddingRight: windowWidth,
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

      return <View style={styles.actionsContainer}>{actions}</View>;
    },
    [
      buttonWidth,
      rightActions,
      styles.action,
      styles.actionsContainer,
      windowWidth,
    ],
  );

  const swipeable = React.useMemo(
    () => (
      <SwipeableComponent
        renderRightActions={renderRightActions}
        ref={innerRef}
        onSwipeableRightWillOpen={onSwipeableRightWillOpen}
      >
        {children}
      </SwipeableComponent>
    ),
    [children, innerRef, onSwipeableRightWillOpen, renderRightActions],
  );

  return swipeable;
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

export default Swipeable;
