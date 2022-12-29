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
import type { MessageTooltipRouteNames } from '../navigation/route-names';
import type { TooltipRoute } from '../navigation/tooltip.react';
import type { ChatContextType } from './chat-context';

function onPressReact<RouteName: MessageTooltipRouteNames>(
  route: TooltipRoute<RouteName>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: BindServerCall,
  inputState: ?InputState,
  navigation: AppNavigationProp<RouteName>,
  viewerID: ?string,
  chatContext: ?ChatContextType,
  reactionMessageLocalID: ?string,
) {
  const messageID = route.params.item.messageInfo.id;
  invariant(messageID, 'messageID should be set');

  const threadID = route.params.item.threadInfo.id;
  invariant(threadID, 'threadID should be set');

  invariant(reactionMessageLocalID, 'reactionMessageLocalID should be set');

  const reactionInput = '👍';
  const viewerReacted = route.params.item.reactions.get(reactionInput)
    ?.viewerReacted;

  const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

  sendReaction(
    messageID,
    reactionMessageLocalID,
    threadID,
    reactionInput,
    action,
    dispatchFunctions,
    bindServerCall,
  );
}

function sendReaction(
  messageID: string,
  localID: string,
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
        localID,
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

export { onPressReact };
