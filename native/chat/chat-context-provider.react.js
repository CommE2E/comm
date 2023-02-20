// @flow

import * as React from 'react';

import type { ChatMessageItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import { ChatContext } from './chat-context.js';
import type { SidebarAnimationType } from './chat-context.js';
import ChatItemHeightMeasurer from './chat-item-height-measurer.react.js';
import type { ChatMessageItemWithHeight } from '../types/chat-types.js';

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
      messages: ?$ReadOnlyArray<ChatMessageItem>,
      threadInfo: ?ThreadInfo,
      onMessagesMeasured: ($ReadOnlyArray<ChatMessageItemWithHeight>) => mixed,
      measurerID: number,
    ) => {
      if (!threadInfo) {
        // When threadInfo is not present, we can't measure the messages: we can
        // determine the height, but we can't merge the result as it requires
        // threadInfo to be present.
        return;
      }

      if (!messages) {
        return;
      }

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
        messages: ?$ReadOnlyArray<ChatMessageItem>,
        threadInfo: ?ThreadInfo,
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

  const chatInputBarHeights = React.useRef<Map<string, number>>(new Map());
  const setChatInputBarHeight = React.useCallback(
    (threadID: string, height: number) =>
      chatInputBarHeights.current.set(threadID, height),
    [],
  );
  const deleteChatInputBarHeight = React.useCallback(
    (threadID: string) => chatInputBarHeights.current.delete(threadID),
    [],
  );

  const [sidebarAnimationType, setSidebarAnimationType] =
    React.useState<SidebarAnimationType>('move_source_message');

  const contextValue = React.useMemo(
    () => ({
      registerMeasurer,
      currentTransitionSidebarSourceID,
      setCurrentTransitionSidebarSourceID,
      setChatInputBarHeight,
      deleteChatInputBarHeight,
      chatInputBarHeights: chatInputBarHeights.current,
      sidebarAnimationType,
      setSidebarAnimationType,
    }),
    [
      currentTransitionSidebarSourceID,
      deleteChatInputBarHeight,
      registerMeasurer,
      setChatInputBarHeight,
      sidebarAnimationType,
    ],
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
