// @flow

export type ThreadTrait =
  | 'sidebar'
  | 'community'
  | 'announcement'
  | 'personal'
  | 'private'
  | 'communitySubthread';

export type ThreadSpec = {
  +traits: $ReadOnlySet<ThreadTrait>,
};
