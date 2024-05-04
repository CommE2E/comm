// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  entityTextToRawString,
  ET,
  useResolvedEntityText,
  type UseResolvedEntityTextOptions,
} from './entity-text.js';
import type {
  ResolvedThreadInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { values } from '../utils/objects.js';

function useResolvedThreadInfos(
  threadInfos: $ReadOnlyArray<ThreadInfo>,
  options?: ?UseResolvedEntityTextOptions,
): $ReadOnlyArray<ResolvedThreadInfo> {
  const entityText = React.useMemo(
    () => threadInfos.map(threadInfo => threadInfo.uiName),
    [threadInfos],
  );
  const resolvedEntityText = useResolvedEntityText(entityText, options);
  invariant(
    resolvedEntityText,
    'useResolvedEntityText only returns falsey when passed falsey',
  );
  return React.useMemo(
    () =>
      threadInfos.map((threadInfo, i) => {
        if (typeof threadInfo.uiName === 'string') {
          // Flow wants return { ...threadInfo, uiName: threadInfo.uiName }
          // but that's wasteful and unneeded, so we any-cast here
          return (threadInfo: any);
        }
        const resolvedThreadEntity = resolvedEntityText[i];
        return {
          ...threadInfo,
          uiName: entityTextToRawString([resolvedThreadEntity]),
        };
      }),
    [threadInfos, resolvedEntityText],
  );
}

function useResolvedOptionalThreadInfos(
  threadInfos: ?$ReadOnlyArray<ThreadInfo>,
): ?$ReadOnlyArray<ResolvedThreadInfo> {
  const entityText = React.useMemo(() => {
    if (!threadInfos) {
      return null;
    }
    return threadInfos.map(threadInfo =>
      ET.thread({ display: 'uiName', threadInfo }),
    );
  }, [threadInfos]);
  const resolvedEntityText = useResolvedEntityText(entityText);
  return React.useMemo(() => {
    if (!threadInfos) {
      return threadInfos;
    }
    invariant(
      resolvedEntityText,
      'useResolvedEntityText only returns falsey when passed falsey',
    );
    return threadInfos.map((threadInfo, i) => {
      if (typeof threadInfo.uiName === 'string') {
        // Flow wants return { ...threadInfo, uiName: threadInfo.uiName }
        // but that's wasteful and unneeded, so we any-cast here
        return (threadInfo: any);
      }
      const resolvedThreadEntity = resolvedEntityText[i];
      return {
        ...threadInfo,
        uiName: entityTextToRawString([resolvedThreadEntity]),
      };
    });
  }, [threadInfos, resolvedEntityText]);
}

function useResolvedThreadInfosObj(
  threadInfosObj: {
    +[id: string]: ThreadInfo,
  },
  options?: ?UseResolvedEntityTextOptions,
): {
  +[id: string]: ResolvedThreadInfo,
} {
  const threadInfosArray = React.useMemo(
    () => values(threadInfosObj),
    [threadInfosObj],
  );
  const resolvedThreadInfosArray = useResolvedThreadInfos(
    threadInfosArray,
    options,
  );
  return React.useMemo(() => {
    const obj: {
      [string]: ResolvedThreadInfo,
    } = {};
    for (const resolvedThreadInfo of resolvedThreadInfosArray) {
      obj[resolvedThreadInfo.id] = resolvedThreadInfo;
    }
    return obj;
  }, [resolvedThreadInfosArray]);
}

function useResolvedThreadInfo(threadInfo: ThreadInfo): ResolvedThreadInfo {
  const resolutionInput = React.useMemo(() => [threadInfo], [threadInfo]);
  const [resolvedThreadInfo] = useResolvedThreadInfos(resolutionInput);
  return resolvedThreadInfo;
}

function useResolvedOptionalThreadInfo(
  threadInfo: ?ThreadInfo,
): ?ResolvedThreadInfo {
  const resolutionInput = React.useMemo(
    () => (threadInfo ? [threadInfo] : []),
    [threadInfo],
  );
  const [resolvedThreadInfo] = useResolvedThreadInfos(resolutionInput);
  if (!threadInfo) {
    return threadInfo;
  }
  return resolvedThreadInfo;
}

export {
  useResolvedThreadInfos,
  useResolvedOptionalThreadInfos,
  useResolvedThreadInfosObj,
  useResolvedThreadInfo,
  useResolvedOptionalThreadInfo,
};
