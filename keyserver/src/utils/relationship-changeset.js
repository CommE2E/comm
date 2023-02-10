// @flow

import invariant from 'invariant';

import { sortIDs } from 'lib/shared/relationship-utils.js';
import {
  type UndirectedRelationshipRow,
  undirectedStatus,
} from 'lib/types/relationship-types.js';

type RelationshipStatus = 'existing' | 'potentially_missing';

class RelationshipChangeset {
  relationships: Map<string, RelationshipStatus> = new Map();
  finalized: boolean = false;

  static _getKey(userA: string, userB: string): string {
    const [user1, user2] = sortIDs(userA, userB);
    return `${user1}|${user2}`;
  }

  _setRelationshipForKey(key: string, status: RelationshipStatus) {
    invariant(
      !this.finalized,
      'attempting to set relationship on finalized RelationshipChangeset',
    );
    const currentStatus = this.relationships.get(key);
    if (
      currentStatus === 'existing' ||
      (currentStatus && status === 'potentially_missing')
    ) {
      return;
    }
    this.relationships.set(key, status);
  }

  _setRelationship(userA: string, userB: string, status: RelationshipStatus) {
    if (userA === userB) {
      return;
    }
    const key = RelationshipChangeset._getKey(userA, userB);
    this._setRelationshipForKey(key, status);
  }

  setAllRelationshipsExist(userIDs: $ReadOnlyArray<string>) {
    for (let i = 0; i < userIDs.length; i++) {
      for (let j = i + 1; j < userIDs.length; j++) {
        this._setRelationship(userIDs[i], userIDs[j], 'existing');
      }
    }
  }

  setAllRelationshipsNeeded(userIDs: $ReadOnlyArray<string>) {
    for (let i = 0; i < userIDs.length; i++) {
      for (let j = i + 1; j < userIDs.length; j++) {
        this._setRelationship(userIDs[i], userIDs[j], 'potentially_missing');
      }
    }
  }

  setRelationshipExists(userA: string, userB: string) {
    this._setRelationship(userA, userB, 'existing');
  }

  setRelationshipsNeeded(userID: string, otherUserIDs: $ReadOnlyArray<string>) {
    for (const otherUserID of otherUserIDs) {
      this._setRelationship(userID, otherUserID, 'potentially_missing');
    }
  }

  addAll(other: RelationshipChangeset) {
    other.finalized = true;
    for (const [key, status] of other.relationships) {
      this._setRelationshipForKey(key, status);
    }
  }

  _getRows(): UndirectedRelationshipRow[] {
    const rows = [];
    for (const [key, status] of this.relationships) {
      if (status === 'existing') {
        continue;
      }
      const [user1, user2] = key.split('|');
      rows.push({ user1, user2, status: undirectedStatus.KNOW_OF });
    }
    return rows;
  }

  getRows(): UndirectedRelationshipRow[] {
    this.finalized = true;
    return this._getRows();
  }

  getRowCount(): number {
    return this._getRows().length;
  }
}

export default RelationshipChangeset;
