// @flow

import type { ComposableDMOperation, DMOperation } from '../../types/dm-ops.js';
import type { InboundActionMetadata } from '../../types/redux-types.js';

export const dmOperationSpecificationTypes = Object.freeze({
  OUTBOUND: 'OutboundDMOperationSpecification',
  INBOUND: 'InboundDMOperationSpecification',
});

export type OutboundDMOperationSpecificationRecipients =
  | { +type: 'all_peer_devices' | 'self_devices' }
  | { +type: 'some_users', +userIDs: $ReadOnlyArray<string> }
  | { +type: 'all_thread_members', +threadID: string }
  | { +type: 'some_devices', +deviceIDs: $ReadOnlyArray<string> };

// The operation generated on the sending client, causes changes to
// the state and broadcasting information to peers.
export type OutboundDMOperationSpecification = {
  +type: 'OutboundDMOperationSpecification',
  +op: DMOperation,
  +recipients: OutboundDMOperationSpecificationRecipients,
  +sendOnly?: boolean,
};

export type OutboundComposableDMOperationSpecification = {
  +type: 'OutboundDMOperationSpecification',
  +op: ComposableDMOperation,
  +recipients: OutboundDMOperationSpecificationRecipients,
  // Composable DM Ops are created only to be sent, locally we use
  // dedicated mechanism for updating the store.
  +sendOnly: true,
  +composableMessageID: string,
};

// The operation received from other peers, causes changes to
// the state and after processing, sends confirmation to the sender.
export type InboundDMOperationSpecification = {
  +type: 'InboundDMOperationSpecification',
  +op: DMOperation,
  +metadata: ?InboundActionMetadata,
};

export type DMOperationSpecification =
  | OutboundDMOperationSpecification
  | InboundDMOperationSpecification;
