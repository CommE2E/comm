// @flow

import * as React from 'react';

import type { ChatMessageItem } from 'lib/selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import { ChatContext } from './chat-context';
import ChatItemHeightMeasurer from './chat-item-height-measurer.react';
import type { ChatMessageItemWithHeight } from './message-list-container.react';

type Props = {
  +children: React.Node,
};

export type MeasurementTask = {
  +messages: $ReadOnlyArray<ChatMessageItem>,
  +threadInfo: ThreadInfo,
  +onMessagesMeasured: (
    messagesWithHeight: $ReadOnlyArray<ChatMessageItemWithHeight>,
    measuredHeights: $ReadOnlyMap<string, number>,
  ) => mixed,
  +measurerID: number,
  +initialMeasuredHeights: ?$ReadOnlyMap<string, number>,
};

function ChatContextProvider(props: Props): React.Node {
  const [measurements, setMeasurements] = React.useState<
    $ReadOnlyArray<MeasurementTask>,
  >([]);
  const nextMeasurerID = React.useRef(0);
  const measuredHeights = React.useRef<
    Map<number, $ReadOnlyMap<string, number>>,
  >(new Map());

  const measureMessages = React.useCallback(
    (
      messages: $ReadOnlyArray<ChatMessageItem>,
      threadInfo: ThreadInfo,
      onMessagesMeasured: ($ReadOnlyArray<ChatMessageItemWithHeight>) => mixed,
      measurerID: number,
    ) => {
      const measureCallback = (
        messagesWithHeight: $ReadOnlyArray<ChatMessageItemWithHeight>,
        newMeasuredHeights: $ReadOnlyMap<string, number>,
      ) => {
        measuredHeights.current.set(measurerID, newMeasuredHeights);
        onMessagesMeasured(messagesWithHeight);
      };

      let initialMeasuredHeights = null;
      const isMeasurementPresent = measuredHeights.current.has(measurerID);
      if (!isMeasurementPresent) {
        const sourceMeasurerID = measurements.find(
          measurement => measurement.threadInfo.id === threadInfo.id,
        )?.measurerID;
        initialMeasuredHeights = sourceMeasurerID
          ? measuredHeights.current.get(sourceMeasurerID)
          : null;
      }

      const newMeasurement = {
        messages,
        threadInfo,
        onMessagesMeasured: measureCallback,
        measurerID,
        initialMeasuredHeights,
      };
      setMeasurements(prevMeasurements => {
        const withoutCurrentMeasurement = prevMeasurements.filter(
          measurement => measurement.measurerID !== measurerID,
        );
        return [...withoutCurrentMeasurement, newMeasurement];
      });
    },
    [measurements],
  );

  const registerMeasurer = React.useCallback(() => {
    const measurerID = nextMeasurerID.current++;
    return {
      measure: (
        messages: $ReadOnlyArray<ChatMessageItem>,
        threadInfo: ThreadInfo,
        onMessagesMeasured: (
          $ReadOnlyArray<ChatMessageItemWithHeight>,
        ) => mixed,
      ) =>
        measureMessages(messages, threadInfo, onMessagesMeasured, measurerID),
      unregister: () => {
        setMeasurements(prevMeasurements =>
          prevMeasurements.filter(
            measurement => measurement.measurerID !== measurerID,
          ),
        );
        measuredHeights.current.delete(measurerID);
      },
    };
  }, [measureMessages]);

  const [
    currentTransitionSidebarSourceID,
    setCurrentTransitionSidebarSourceID,
  ] = React.useState<?string>(null);

  const contextValue = React.useMemo(
    () => ({
      registerMeasurer,
      currentTransitionSidebarSourceID,
      setCurrentTransitionSidebarSourceID,
    }),
    [currentTransitionSidebarSourceID, registerMeasurer],
  );

  const heightMeasurers = React.useMemo(
    () =>
      measurements.map(measurement => (
        <ChatItemHeightMeasurer
          key={measurement.measurerID}
          measurement={measurement}
        />
      )),
    [measurements],
  );
  return (
    <ChatContext.Provider value={contextValue}>
      {heightMeasurers}
      {props.children}
    </ChatContext.Provider>
  );
}

export default ChatContextProvider;
