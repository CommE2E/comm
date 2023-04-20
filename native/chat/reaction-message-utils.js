// @flow

import invariant from 'invariant';
import * as React from 'react';
import Alert from 'react-native/Libraries/Alert/Alert.js';

import {
  sendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { RawReactionMessageInfo } from 'lib/types/messages/reaction.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import { cloneError } from 'lib/utils/errors.js';

import { useSelector } from '../redux/redux-utils.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
} from '../types/layout-types.js';

function useSendReaction(
  messageID: ?string,
  localID: string,
  threadID: string,
  reactions: ReactionInfo,
): (reaction: string) => mixed {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const callSendReactionMessage = useServerCall(sendReactionMessage);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    reaction => {
      if (!messageID) {
        return;
      }

      invariant(viewerID, 'viewerID should be set');

      const viewerReacted = reactions[reaction]
        ? reactions[reaction].viewerReacted
        : false;
      const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

      const reactionMessagePromise = (async () => {
        try {
          const result = await callSendReactionMessage({
            threadID,
            localID,
            targetMessageID: messageID,
            reaction,
            action,
          });
          return {
            localID,
            serverID: result.id,
            threadID,
            time: result.time,
            interface: result.interface,
          };
        } catch (e) {
          Alert.alert(
            'Couldn’t send the reaction',
            'Please try again later',
            [{ text: 'OK' }],
            {
              cancelable: true,
            },
          );

          const copy = cloneError(e);
          copy.localID = localID;
          copy.threadID = threadID;
          throw copy;
        }
      })();

      const startingPayload: RawReactionMessageInfo = {
        type: messageTypes.REACTION,
        threadID,
        localID,
        creatorID: viewerID,
        time: Date.now(),
        targetMessageID: messageID,
        reaction,
        action,
      };

      dispatchActionPromise(
        sendReactionMessageActionTypes,
        reactionMessagePromise,
        undefined,
        startingPayload,
      );
    },
    [
      messageID,
      viewerID,
      reactions,
      threadID,
      localID,
      dispatchActionPromise,
      callSendReactionMessage,
    ],
  );
}

type ReactionSelectionPopoverPositionArgs = {
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +margin: ?number,
};

type ReactionSelectionPopoverPosition = {
  +containerStyle: {
    +position: 'absolute',
    +left?: number,
    +right?: number,
    +bottom?: number,
    +top?: number,
    ...
  },
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

    const style = {};

    style.position = 'absolute';

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
