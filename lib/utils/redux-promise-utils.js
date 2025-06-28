// @flow

import * as React from 'react';

import { useDispatch } from './redux-utils.js';
import type { ActionTypes } from '../keyserver-conn/keyserver-conn-types.js';
import type { LoadingOptions, LoadingInfo } from '../types/loading-types.js';
import type {
  ActionPayload,
  BaseAction,
  Dispatch,
  PromisedAction,
} from '../types/redux-types.js';

let nextPromiseIndex = 0;

function wrapActionPromise<
  STARTED_ACTION_TYPE: string,
  STARTED_PAYLOAD: ActionPayload,
  SUCCESS_ACTION_TYPE: string,
  SUCCESS_PAYLOAD: ActionPayload,
  FAILED_ACTION_TYPE: string,
>(
  actionTypes: ActionTypes<
    STARTED_ACTION_TYPE,
    SUCCESS_ACTION_TYPE,
    FAILED_ACTION_TYPE,
  >,
  promise: Promise<SUCCESS_PAYLOAD>,
  loadingOptions: ?LoadingOptions,
  startingPayload: ?STARTED_PAYLOAD,
): PromisedAction {
  const loadingInfo: LoadingInfo = {
    fetchIndex: nextPromiseIndex++,
    trackMultipleRequests: !!loadingOptions?.trackMultipleRequests,
    customKeyName: loadingOptions?.customKeyName || null,
  };
  return async (dispatch: Dispatch): Promise<void> => {
    const startAction = startingPayload
      ? {
          type: (actionTypes.started: STARTED_ACTION_TYPE),
          loadingInfo,
          payload: (startingPayload: STARTED_PAYLOAD),
        }
      : {
          type: (actionTypes.started: STARTED_ACTION_TYPE),
          loadingInfo,
        };
    dispatch(startAction);
    try {
      const result = await promise;
      dispatch({
        type: (actionTypes.success: SUCCESS_ACTION_TYPE),
        payload: (result: SUCCESS_PAYLOAD),
        loadingInfo,
      });
    } catch (e) {
      console.log(e);
      dispatch({
        type: (actionTypes.failed: FAILED_ACTION_TYPE),
        error: true,
        payload: (e: Error),
        loadingInfo,
      });
    }
  };
}

export type DispatchActionPromise = <
  STARTED: BaseAction,
  SUCCESS: BaseAction,
  FAILED: BaseAction,
>(
  actionTypes: ActionTypes<STARTED['type'], SUCCESS['type'], FAILED['type']>,
  promise: Promise<SUCCESS['payload']>,
  loadingOptions?: LoadingOptions,
  startingPayload?: STARTED['payload'],
) => Promise<void>;

function useDispatchActionPromise(): DispatchActionPromise {
  const dispatch = useDispatch();
  return React.useMemo(() => createDispatchActionPromise(dispatch), [dispatch]);
}

function createDispatchActionPromise(dispatch: Dispatch) {
  const dispatchActionPromise = function <
    STARTED: BaseAction,
    SUCCESS: BaseAction,
    FAILED: BaseAction,
  >(
    actionTypes: ActionTypes<STARTED['type'], SUCCESS['type'], FAILED['type']>,
    promise: Promise<SUCCESS['payload']>,
    loadingOptions?: LoadingOptions,
    startingPayload?: STARTED['payload'],
  ): Promise<void> {
    return dispatch(
      wrapActionPromise(actionTypes, promise, loadingOptions, startingPayload),
    );
  };
  return dispatchActionPromise;
}

export { wrapActionPromise, useDispatchActionPromise };
