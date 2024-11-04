// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  useSendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import {
  dmOperationSpecificationTypes,
  type OutboundDMOperationSpecification,
} from 'lib/shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from 'lib/shared/dm-ops/process-dm-ops.js';
import { getNextLocalID } from 'lib/shared/message-utils.js';
import type { DMSendReactionMessageOperation } from 'lib/types/dm-ops.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { RawReactionMessageInfo } from 'lib/types/messages/reaction.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types';
import {
  thickThreadTypes,
  threadTypeIsThick,
} from 'lib/types/thread-types-enum.js';
import { SendMessageError, getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { useSelector } from '../redux/redux-utils.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
} from '../types/layout-types.js';
import Alert from '../utils/alert.js';

function useSendReaction(
  messageID: ?string,
  threadInfo: ThreadInfo,
  reactions: ReactionInfo,
): (reaction: string) => mixed {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const callSendReactionMessage = useSendReactionMessage();
  const dispatchActionPromise = useDispatchActionPromise();
  const processAndSendDMOperation = useProcessAndSendDMOperation();

  return React.useCallback(
    reaction => {
      if (!messageID) {
        return;
      }

      const localID = getNextLocalID();

      invariant(viewerID, 'viewerID should be set');

      const viewerReacted = reactions[reaction]
        ? reactions[reaction].viewerReacted
        : false;
      const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

      const threadID = threadInfo.id;

      if (threadTypeIsThick(threadInfo.type)) {
        const op: DMSendReactionMessageOperation = {
          type: 'send_reaction_message',
          threadID,
          creatorID: viewerID,
          time: Date.now(),
          messageID: uuid.v4(),
          targetMessageID: messageID,
          reaction,
          action,
        };
        const opSpecification: OutboundDMOperationSpecification = {
          type: dmOperationSpecificationTypes.OUTBOUND,
          op,
          recipients: {
            type: 'all_thread_members',
            threadID:
              threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
              threadInfo.parentThreadID
                ? threadInfo.parentThreadID
                : threadInfo.id,
          },
        };
        void processAndSendDMOperation(opSpecification);
        return;
      }

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
          const exceptionMessage = getMessageForException(e) ?? '';
          throw new SendMessageError(
            `Exception while sending reaction: ${exceptionMessage}`,
            localID,
            threadID,
          );
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

      void dispatchActionPromise(
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
      threadInfo.id,
      threadInfo.type,
      threadInfo.parentThreadID,
      dispatchActionPromise,
      processAndSendDMOperation,
      callSendReactionMessage,
    ],
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
