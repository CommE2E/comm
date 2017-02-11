// @flow

import type {
  Dispatch,
  UpdateCallback,
  BaseAppState,
} from '../types/redux-types';
import type { LoadingOptions, LoadingInfo } from '../types/loading-types';

let nextPromiseIndex = 0;

function wrapActionPromise<T: BaseAppState, A>(
  actionType: string,
  promise: Promise<*>,
  loadingOptions?: ?LoadingOptions,
  startingPayload?: any,
) {
  const loadingInfo = {
    fetchIndex: nextPromiseIndex++,
    trackMultipleRequests:
      !!(loadingOptions && loadingOptions.trackMultipleRequests),
    customKeyName: loadingOptions && loadingOptions.customKeyName
      ? loadingOptions.customKeyName
      : null,
  };
  return (async (dispatch: Dispatch<T, A>): Promise<void> => {
    const startAction: {
      type: string,
      loadingInfo: LoadingInfo,
      payload?: any,
    } = {
      type: actionType + "_STARTED",
      loadingInfo,
    };
    if (startingPayload) {
      startAction.payload = startingPayload;
    }
    dispatch(startAction);
    try {
      const result = await promise;
      dispatch({
        type: actionType + "_SUCCESS",
        payload: result,
        loadingInfo,
      });
    } catch (e) {
      dispatch({
        type: actionType + "_FAILED",
        error: true,
        payload: e,
        loadingInfo,
      });
    }
  });
}

export type DispatchActionPayload = (actionType: string, payload: *) => void;
export type DispatchActionPromise = (
  actionType: string,
  promise: Promise<*>,
  loadingOptions?: LoadingOptions,
  startingPayload?: any,
) => void;

type DispatchActionHelperProps = {
  dispatchActionPayload?: bool,
  dispatchActionPromise?: bool,
};
function includeDispatchActionProps<T: BaseAppState, A, P>(
  whichOnes: DispatchActionHelperProps,
) {
  return (dispatch: Dispatch<T, A>) => {
    if (whichOnes.dispatchActionPromise && whichOnes.dispatchActionPayload) {
      return {
        dispatchActionPayload: (actionType: string, payload: P) =>
          dispatch({ type: actionType, payload }),
        dispatchActionPromise: (
          actionType: string,
          promise: Promise<P>,
          loadingOptions?: LoadingOptions,
          startingPayload?: any,
        ) => dispatch(wrapActionPromise(
          actionType,
          promise,
          loadingOptions,
          startingPayload,
        )),
      };
    } else if (whichOnes.dispatchActionPayload) {
      return {
        dispatchActionPayload: (actionType: string, payload: P) =>
          dispatch({ type: actionType, payload }),
      };
    } else if (whichOnes.dispatchActionPromise) {
      return {
        dispatchActionPromise: (
          actionType: string,
          promise: Promise<P>,
          loadingOptions?: LoadingOptions,
          startingPayload?: any,
        ) => dispatch(wrapActionPromise(
          actionType,
          promise,
          loadingOptions,
          startingPayload,
        )),
      };
    } else {
      return {};
    }
  };
}

function killThisLater<T: BaseAppState, A, P>(
  dispatch: Dispatch<T, A>,
) {
  return {
    updateStore: (callback: UpdateCallback<T>) =>
      dispatch({ type: "GENERIC", callback }),
    dispatchActionPromise: (
      actionType: string,
      promise: Promise<P>,
      loadingOptions?: LoadingOptions,
      startingPayload?: any,
    ) => dispatch(wrapActionPromise(
      actionType,
      promise,
      loadingOptions,
      startingPayload,
    )),
  };
}

export {
  includeDispatchActionProps,
  killThisLater,
};
