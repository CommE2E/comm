// @flow

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';

import * as React from 'react';
import Animated from 'react-native-reanimated';

import { InnerTextMessage } from './inner-text-message.react';
import { MessageHeader } from './message-header.react';
import { useSelector } from '../redux/redux-utils';

/* eslint-disable import/no-named-as-default-member */
const { Value } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {|
  +navigation: AppNavigationProp<'TextMessageTooltipModal'>,
  +route: TooltipRoute<'TextMessageTooltipModal'>,
  +progress: Value,
|};
function TextMessageTooltipButton(props: Props) {
  const { progress } = props;
  const windowWidth = useSelector((state) => state.dimensions.width);
  const { initialCoordinates } = props.route.params;
  const headerStyle = React.useMemo(() => {
    const bottom = initialCoordinates.height;
    return {
      opacity: progress,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: windowWidth,
      bottom,
    };
  }, [progress, windowWidth, initialCoordinates]);

  const { navigation } = props;
  const { item } = props.route.params;
  return (
    <>
      <Animated.View style={headerStyle}>
        <MessageHeader item={item} focused={true} display="modal" />
      </Animated.View>
      <InnerTextMessage item={item} onPress={navigation.goBackOnce} />
    </>
  );
}

export default TextMessageTooltipButton;
