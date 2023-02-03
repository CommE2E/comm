// @flow

import * as React from 'react';
import { Alert } from 'react-native';

import {
  sendMessageReport,
  sendMessageReportActionTypes,
} from 'lib/actions/message-report-actions';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import { displayActionResultModal } from '../navigation/action-result-modal';
import type { TooltipRoute } from '../tooltip/tooltip.react';

const confirmReport = () => displayActionResultModal('reported to admin');

function useOnPressReport(
  route:
    | TooltipRoute<'TextMessageTooltipModal'>
    | TooltipRoute<'MultimediaMessageTooltipModal'>,
): () => mixed {
  const messageID = route.params.item.messageInfo.id;
  const dispatchActionPromise = useDispatchActionPromise();
  const callSendMessageReport = useServerCall(sendMessageReport);
  return React.useCallback(() => {
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
    dispatchActionPromise(sendMessageReportActionTypes, messageReportPromise);
  }, [callSendMessageReport, messageID, dispatchActionPromise]);
}

export { useOnPressReport };
