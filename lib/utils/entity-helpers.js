// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  ET,
  useENSNamesForEntityText,
  entityTextToRawString,
} from './entity-text.js';
import type { UseENSNamesOptions } from '../hooks/ens-cache.js';
import type {
  MinimallyEncodedResolvedThreadInfo,
  MinimallyEncodedThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { ThreadInfo, ResolvedThreadInfo } from '../types/thread-types.js';
import { values } from '../utils/objects.js';

function useResolvedThreadInfos(
  threadInfos: $ReadOnlyArray<ThreadInfo | MinimallyEncodedThreadInfo>,
  options?: ?UseENSNamesOptions,
): $ReadOnlyArray<ResolvedThreadInfo | MinimallyEncodedResolvedThreadInfo> {
  const entityText = React.useMemo(
    () => threadInfos.map(threadInfo => threadInfo.uiName),
    [threadInfos],
  );
  const withENSNames = useENSNamesForEntityText(entityText, options);
  invariant(
    withENSNames,
    'useENSNamesForEntityText only returns falsey when passed falsey',
  );
  return React.useMemo(
    () =>
      threadInfos.map((threadInfo, i) => {
        if (typeof threadInfo.uiName === 'string') {
          // Flow wants return { ...threadInfo, uiName: threadInfo.uiName }
          // but that's wasteful and unneeded, so we any-cast here
          return (threadInfo: any);
        }
        const resolvedThreadEntity = withENSNames[i];
        if (threadInfo.minimallyEncoded) {
          return {
            ...threadInfo,
            uiName: entityTextToRawString([resolvedThreadEntity]),
          };
        } else {
          return {
            ...threadInfo,
            uiName: entityTextToRawString([resolvedThreadEntity]),
          };
        }
      }),
    [threadInfos, withENSNames],
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
  const withENSNames = useENSNamesForEntityText(entityText);
  return React.useMemo(() => {
    if (!threadInfos) {
      return threadInfos;
    }
    invariant(
      withENSNames,
      'useENSNamesForEntityText only returns falsey when passed falsey',
    );
    return threadInfos.map((threadInfo, i) => {
      if (typeof threadInfo.uiName === 'string') {
        // Flow wants return { ...threadInfo, uiName: threadInfo.uiName }
        // but that's wasteful and unneeded, so we any-cast here
        return (threadInfo: any);
      }
      const resolvedThreadEntity = withENSNames[i];
      return {
        ...threadInfo,
        uiName: entityTextToRawString([resolvedThreadEntity]),
      };
    });
  }, [threadInfos, withENSNames]);
}

function useResolvedThreadInfosObj(
  threadInfosObj: { +[id: string]: ThreadInfo },
  options?: ?UseENSNamesOptions,
): { +[id: string]: ResolvedThreadInfo } {
  const threadInfosArray = React.useMemo(
    () => values(threadInfosObj),
    [threadInfosObj],
  );
  const resolvedThreadInfosArray = useResolvedThreadInfos(
    threadInfosArray,
    options,
  );
  return React.useMemo(() => {
    const obj = {};
    for (const resolvedThreadInfo of resolvedThreadInfosArray) {
      obj[resolvedThreadInfo.id] = resolvedThreadInfo;
    }
    return obj;
  }, [resolvedThreadInfosArray]);
}

function useResolvedThreadInfo(
  threadInfo: ThreadInfo | MinimallyEncodedThreadInfo,
): ResolvedThreadInfo | MinimallyEncodedResolvedThreadInfo {
  const resolutionInput = React.useMemo(() => [threadInfo], [threadInfo]);
  const [resolvedThreadInfo] = useResolvedThreadInfos(resolutionInput);
  return resolvedThreadInfo;
}

function useResolvedOptionalThreadInfo(
  threadInfo: ?ThreadInfo | ?MinimallyEncodedThreadInfo,
): ?ResolvedThreadInfo | ?MinimallyEncodedResolvedThreadInfo {
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
