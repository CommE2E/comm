// @flow

import type {
  PingStartingPayload,
  PingActionInput,
  PingResult,
} from '../types/ping-types';
import type { DispatchActionPromise } from '../utils/action-utils';

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
  pingActionInput: (startingPayload: PingStartingPayload) => PingActionInput,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  ping: (actionInput: PingActionInput) => Promise<PingResult>,
};
function dispatchPing(props: Props) {
  const startingPayload = props.pingStartingPayload();
  const actionInput = props.pingActionInput(startingPayload);
  props.dispatchActionPromise(
    pingActionTypes,
    props.ping(actionInput),
    undefined,
    startingPayload,
  );
}

export {
  pingFrequency,
  earliestTimeConsideredCurrent,
  dispatchPing,
};
