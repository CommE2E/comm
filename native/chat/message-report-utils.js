// @flow

import * as React from 'react';

import {
  useSendMessageReport,
  sendMessageReportActionTypes,
} from 'lib/actions/message-report-actions.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import { displayActionResultModal } from '../navigation/action-result-modal.js';
import type { TooltipRoute } from '../tooltip/tooltip.react.js';
import Alert from '../utils/alert.js';

const confirmReport = () => displayActionResultModal('reported to admin');

function useOnPressReport(
  route:
    | TooltipRoute<'TextMessageTooltipModal'>
    | TooltipRoute<'MultimediaMessageTooltipModal'>,
): () => mixed {
  const messageID = route.params.item.messageInfo.id;
  const dispatchActionPromise = useDispatchActionPromise();
  const callSendMessageReport = useSendMessageReport();
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
    void dispatchActionPromise(
      sendMessageReportActionTypes,
      messageReportPromise,
    );
  }, [callSendMessageReport, messageID, dispatchActionPromise]);
}

export { useOnPressReport };
