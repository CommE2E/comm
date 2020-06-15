// @flow

import invariant from 'invariant';

export const relationshipStatuses = Object.freeze({
  KNOW_OF: 0,
  PENDING_FRIEND: 1,
  FRIEND: 2,
  BLOCKED: 3,
});
export type RelationshipStatus = $Values<typeof relationshipStatuses>;
export function assertRelationshipStatus(status: number): RelationshipStatus {
  invariant(
    status === 0 || status === 1 || status === 2 || status === 3,
    'number is not RelationshipStatus enum',
  );
  return status;
}

export type RelationshipRequest = {|
  userID: string,
  status: RelationshipStatus,
|};
