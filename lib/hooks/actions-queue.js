// @flow

import * as React from 'react';

type MessageQueueHook<T> = {
  +enqueue: (items: $ReadOnlyArray<T>) => void,
};

function useActionsQueue<T>(
  performAction: (item: T) => mixed | Promise<mixed>,
): MessageQueueHook<T> {
  const [queue, setQueue] = React.useState<$ReadOnlyArray<T>>([]);
  const isProcessing = React.useRef(false);

  const enqueue = React.useCallback(
    (items: $ReadOnlyArray<T>) =>
      setQueue(prevQueue => [...prevQueue, ...items]),
    [],
  );

  const process = React.useCallback(
    async (action: T) => {
      isProcessing.current = true;
      try {
        await performAction(action);
      } finally {
        isProcessing.current = false;
        setQueue(currentQueue => currentQueue.slice(1));
      }
    },
    [performAction],
  );

  React.useEffect(() => {
    if (isProcessing.current || queue.length === 0) {
      return;
    }
    void process(queue[0]);
  }, [process, queue]);

  return { enqueue };
}

export { useActionsQueue };
