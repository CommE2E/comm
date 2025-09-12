// @flow

import * as React from 'react';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { useSendReactionBase } from 'lib/shared/reaction-utils.js';
import type { MessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types';

import { useSelector } from '../redux/redux-utils.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
} from '../types/layout-types.js';
import Alert from '../utils/alert.js';

function showReactionErrorAlert() {
  Alert.alert(
    'Couldn’t send the reaction',
    'Please try again later',
    [{ text: 'OK' }],
    {
      cancelable: true,
    },
  );
}

function useSendReaction(
  messageInfo: ?MessageInfo,
  threadInfo: ThreadInfo,
  reactions: ReactionInfo,
): (reaction: string) => mixed {
  return useSendReactionBase(
    messageInfo,
    threadInfo,
    reactions,
    showReactionErrorAlert,
  );
}

type ReactionSelectionPopoverPositionArgs = {
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +margin: ?number,
};

type WritableContainerStyle = {
  position: 'absolute',
  left?: number,
  right?: number,
  bottom?: number,
  top?: number,
  ...
};
type ContainerStyle = $ReadOnly<WritableContainerStyle>;

type ReactionSelectionPopoverPosition = {
  +containerStyle: ContainerStyle,
  +popoverLocation: 'above' | 'below',
};
function useReactionSelectionPopoverPosition({
  initialCoordinates,
  verticalBounds,
  margin,
}: ReactionSelectionPopoverPositionArgs): ReactionSelectionPopoverPosition {
  const calculatedMargin = getCalculatedMargin(margin);

  const windowWidth = useSelector(state => state.dimensions.width);

  const popoverLocation: 'above' | 'below' = (() => {
    const { y, height } = initialCoordinates;
    const contentTop = y;
    const contentBottom = y + height;
    const boundsTop = verticalBounds.y;
    const boundsBottom = verticalBounds.y + verticalBounds.height;

    const fullHeight =
      reactionSelectionPopoverDimensions.height + calculatedMargin;

    if (
      contentBottom + fullHeight > boundsBottom &&
      contentTop - fullHeight > boundsTop
    ) {
      return 'above';
    }

    return 'below';
  })();

  const containerStyle = React.useMemo(() => {
    const { x, width, height } = initialCoordinates;

    const style: WritableContainerStyle = {
      position: 'absolute',
    };

    const extraLeftSpace = x;
    const extraRightSpace = windowWidth - width - x;
    if (extraLeftSpace < extraRightSpace) {
      style.left = 0;
    } else {
      style.right = 0;
    }

    if (popoverLocation === 'above') {
      style.bottom = height + calculatedMargin / 2;
    } else {
      style.top = height + calculatedMargin / 2;
    }

    return style;
  }, [calculatedMargin, initialCoordinates, popoverLocation, windowWidth]);
  return React.useMemo(
    () => ({
      popoverLocation,
      containerStyle,
    }),
    [popoverLocation, containerStyle],
  );
}

function getCalculatedMargin(margin: ?number): number {
  return margin ?? 16;
}

const reactionSelectionPopoverDimensions = {
  height: 56,
  width: 316,
};

export {
  useSendReaction,
  useReactionSelectionPopoverPosition,
  getCalculatedMargin,
  reactionSelectionPopoverDimensions,
};
