// @flow

import type {
  Dispatch,
  UpdateCallback,
  BaseAppState,
} from '../types/redux-types';

let nextPromiseIndex = 0;

function wrapActionPromise<T: BaseAppState, A>(
  actionType: string,
  promise: Promise<*>,
  onlyLatestRequestMatters: bool = true,
) {
  const curPromiseIndex = nextPromiseIndex++;
  return (async (dispatch: Dispatch<T, A>): Promise<void> => {
    dispatch({
      type: actionType + "_STARTED",
      onlyLatestRequestMatters,
      fetchIndex: curPromiseIndex,
    });
    try {
      const result = await promise;
      dispatch({
        type: actionType + "_SUCCESS",
        payload: result,
        fetchIndex: curPromiseIndex,
      });
    } catch (e) {
      dispatch({
        type: actionType + "_FAILED",
        error: true,
        payload: e,
        fetchIndex: curPromiseIndex,
      });
    }
  });
}

type DispatchActionHelperProps = {
  dispatchActionPromise?: bool,
  dispatchActionPayload?: bool,
};
function includeDispatchActionProps<T: BaseAppState, A, P>(
  whichOnes: DispatchActionHelperProps,
) {
  return (dispatch: Dispatch<T, A>) => {
    if (whichOnes.dispatchActionPromise && whichOnes.dispatchActionPayload) {
      return {
        dispatchActionPayload: (actionType: string, payload: P) =>
          dispatch({ type: actionType, payload }),
        dispatchActionPromise: (actionType: string, promise: Promise<P>) =>
          dispatch(wrapActionPromise(actionType, promise)),
      };
    } else if (whichOnes.dispatchActionPromise) {
      return {
        dispatchActionPromise: (actionType: string, promise: Promise<P>) =>
          dispatch(wrapActionPromise(actionType, promise)),
      };
    } else if (whichOnes.dispatchActionPayload) {
      return {
        dispatchActionPayload: (actionType: string, payload: P) =>
          dispatch({ type: actionType, payload }),
      };
    } else {
      return {};
    }
  };
}

function killThisLater<T: BaseAppState, A>(
  dispatch: Dispatch<T, A>,
) {
  return {
    updateStore: (callback: UpdateCallback<T>) =>
      dispatch({ type: "GENERIC", callback }),
    dispatchActionPromise: (actionType: string, promise: Promise<*>) =>
      dispatch(wrapActionPromise(actionType, promise)),
  };
}

export {
  includeDispatchActionProps,
  killThisLater,
};
