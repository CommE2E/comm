// @flow

import invariant from 'invariant';
import Alert from 'react-native/Libraries/Alert/Alert';

import {
  sendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils';
import { threadHasPermission } from 'lib/shared/thread-utils';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from 'lib/types/message-types';
import { threadPermissions, type ThreadInfo } from 'lib/types/thread-types';
import type { BindServerCall, DispatchFunctions } from 'lib/utils/action-utils';
import { useSelector } from 'lib/utils/redux-utils';

import type { TooltipRoute } from '../navigation/tooltip.react';

function onPressReact(
  route:
    | TooltipRoute<'TextMessageTooltipModal'>
    | TooltipRoute<'MultimediaMessageTooltipModal'>
    | TooltipRoute<'RobotextMessageTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: BindServerCall,
) {
  const messageID = route.params.item.messageInfo.id;
  invariant(messageID, 'messageID should be set');

  const threadID = route.params.item.threadInfo.id;
  invariant(threadID, 'threadID should be set');

  const reactionInput = '👍';
  const viewerReacted = route.params.item.reactions.get(reactionInput)
    ?.viewerReacted;

  const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

  sendReaction(
    messageID,
    threadID,
    reactionInput,
    action,
    dispatchFunctions,
    bindServerCall,
  );
}

function sendReaction(
  messageID: string,
  threadID: string,
  reaction: string,
  action: 'add_reaction' | 'remove_reaction',
  dispatchFunctions: DispatchFunctions,
  bindServerCall: BindServerCall,
) {
  const callSendReactionMessage = bindServerCall(sendReactionMessage);

  const reactionMessagePromise = (async () => {
    try {
      const result = await callSendReactionMessage({
        threadID,
        targetMessageID: messageID,
        reaction,
        action,
      });
      return {
        serverID: result.id,
        threadID,
        time: result.newMessageInfo.time,
        newMessageInfos: [result.newMessageInfo],
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
      throw e;
    }
  })();

  dispatchFunctions.dispatchActionPromise(
    sendReactionMessageActionTypes,
    reactionMessagePromise,
  );
}

function useCanCreateReactionFromMessage(
  threadInfo: ThreadInfo,
  targetMessageInfo: ComposableMessageInfo | RobotextMessageInfo,
): boolean {
  const targetMessageCreatorRelationship = useSelector(
    state =>
      state.userStore.userInfos[targetMessageInfo.creator.id]
        ?.relationshipStatus,
  );

  if (
    !targetMessageInfo.id ||
    threadInfo.sourceMessageID === targetMessageInfo.id
  ) {
    return false;
  }

  const creatorRelationshipHasBlock =
    targetMessageCreatorRelationship &&
    relationshipBlockedInEitherDirection(targetMessageCreatorRelationship);

  const hasPermission = threadHasPermission(
    threadInfo,
    threadPermissions.VOICED,
  );

  return hasPermission && !creatorRelationshipHasBlock;
}

export { onPressReact, useCanCreateReactionFromMessage };
