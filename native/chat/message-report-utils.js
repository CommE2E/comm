// @flow

import Alert from 'react-native/Libraries/Alert/Alert';

import {
  sendMessageReport,
  sendMessageReportActionTypes,
} from 'lib/actions/message-report-actions';
import type { BindServerCall, DispatchFunctions } from 'lib/utils/action-utils';

import { displayActionResultModal } from '../navigation/action-result-modal';
import type { TooltipRoute } from '../navigation/tooltip.react';

const confirmReport = () => displayActionResultModal('reported to admin');

function onPressReport(
  route:
    | TooltipRoute<'TextMessageTooltipModal'>
    | TooltipRoute<'MultimediaMessageTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: BindServerCall,
) {
  const messageID = route.params.item.messageInfo.id;
  if (!messageID) {
    Alert.alert(
      'Couldn’t send the report',
      'Uhh... try again?',
      [{ text: 'OK' }],
      {
        cancelable: false,
      },
    );
    return;
  }
  reportMessage(messageID, dispatchFunctions, bindServerCall);
}

function reportMessage(
  messageID: string,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: BindServerCall,
) {
  const callSendMessageReport = bindServerCall(sendMessageReport);
  const messageReportPromise = (async () => {
    try {
      const result = await callSendMessageReport({ messageID });
      confirmReport();
      return result;
    } catch (e) {
      Alert.alert(
        'Couldn’t send the report',
        'Uhh... try again?',
        [{ text: 'OK' }],
        {
          cancelable: false,
        },
      );
      throw e;
    }
  })();

  dispatchFunctions.dispatchActionPromise(
    sendMessageReportActionTypes,
    messageReportPromise,
  );
}

export { onPressReport };
