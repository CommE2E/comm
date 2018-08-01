// @flow

import type {
  PingStartingPayload,
  PingActionInput,
  PingResult,
} from '../types/ping-types';
import type { DispatchActionPromise } from '../utils/action-utils';
import { serverRequestTypes } from '../types/request-types';

import { pingActionTypes } from '../actions/ping-actions';

// We can't push yet, so we rely on pings to keep Redux state updated with the
// server. As a result, we do them fairly frequently (once every 3s) while the
// app is active and the user is logged in.
const pingFrequency = 3000; // in milliseconds

function earliestTimeConsideredCurrent() {
  return Date.now() - pingFrequency - 1500;
}

type Props = {
  pingStartingPayload: () => PingStartingPayload,
  pingActionInput: (
    startingPayload: PingStartingPayload,
    justForegrounded: bool,
  ) => PingActionInput,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  ping: (actionInput: PingActionInput) => Promise<PingResult>,
};
function dispatchPing(props: Props, justForegrounded: bool) {
  const startingPayload = props.pingStartingPayload();
  const actionInput = props.pingActionInput(startingPayload, justForegrounded);
  props.dispatchActionPromise(
    pingActionTypes,
    props.ping(actionInput),
    undefined,
    startingPayload,
  );
}

const pingActionInputSelector = (
  activeThread: ?string,
  actionInput: (startingPayload: PingStartingPayload) => PingActionInput,
) => (
  startingPayload: PingStartingPayload,
  justForegrounded: bool,
) => {
  const genericActionInput = actionInput(startingPayload);
  if (!justForegrounded || !genericActionInput.loggedIn || !activeThread) {
    return genericActionInput;
  }
  return {
    ...genericActionInput,
    clientResponses: [
      ...genericActionInput.clientResponses,
      {
        type: serverRequestTypes.INITIAL_ACTIVITY_UPDATE,
        threadID: activeThread,
      },
    ],
  };
};

export {
  pingFrequency,
  earliestTimeConsideredCurrent,
  dispatchPing,
  pingActionInputSelector,
};
