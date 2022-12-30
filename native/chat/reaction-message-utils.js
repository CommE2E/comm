// @flow

import invariant from 'invariant';
import Alert from 'react-native/Libraries/Alert/Alert';

import {
  sendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions';
import { messageTypes } from 'lib/types/message-types';
import type { RawReactionMessageInfo } from 'lib/types/messages/reaction';
import type { BindServerCall, DispatchFunctions } from 'lib/utils/action-utils';
import { cloneError } from 'lib/utils/errors';

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

  invariant(viewerID, 'viewerID should be set');
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
    viewerID,
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
  viewerID: string,
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

  dispatchFunctions.dispatchActionPromise(
    sendReactionMessageActionTypes,
    reactionMessagePromise,
    undefined,
    startingPayload,
  );
}

export { onPressReact };
