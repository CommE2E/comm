// @flow

import invariant from 'invariant';
import Alert from 'react-native/Libraries/Alert/Alert';

import {
  sendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions';
import type { BindServerCall, DispatchFunctions } from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';

function onPressReact(
  route:
    | TooltipRoute<'TextMessageTooltipModal'>
    | TooltipRoute<'MultimediaMessageTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: BindServerCall,
  inputState: ?InputState,
  navigation:
    | AppNavigationProp<'TextMessageTooltipModal'>
    | AppNavigationProp<'MultimediaMessageTooltipModal'>,
  viewerID: ?string,
) {
  if (route.params.item.reactions) {
    const hasUserAlreadyLiked = route.params.item.reactions.some(
      reaction => reaction.creator.id === viewerID,
    );

    if (hasUserAlreadyLiked) {
      Alert.alert(
        'Couldn’t send the reaction',
        'You have already liked this message',
        [{ text: 'OK' }],
        {
          cancelable: true,
        },
      );
      return;
    }
  }

  const messageID = route.params.item.messageInfo.id;
  const threadID = route.params.item.threadInfo.id;

  invariant(messageID, 'messageID should be set');
  invariant(threadID, 'threadID should be set');

  sendReaction(
    messageID,
    threadID,
    '👍',
    'add_reaction',
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
      const result = await callSendReactionMessage(
        threadID,
        messageID,
        reaction,
        action,
      );
      return {
        targetMessageID: messageID,
        serverID: result.id,
        threadID,
        time: result.newMessageInfo.time,
        interface: result.interface,
        newMessageInfos: [result.newMessageInfo],
      };
    } catch (e) {
      Alert.alert(
        'Couldn’t send the reaction',
        'Please try again later',
        [{ text: 'OK' }],
        {
          cancelable: false,
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

export { onPressReact };
