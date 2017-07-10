// @flow

import PropTypes from 'prop-types';

export type RawEntryInfo = {|
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
  creatorID: string,
  deleted: bool,
|};

export const rawEntryInfoPropType = PropTypes.shape({
  id: PropTypes.string,
  localID: PropTypes.string,
  threadID: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  creationTime: PropTypes.number.isRequired,
  creatorID: PropTypes.string.isRequired,
  deleted: PropTypes.bool.isRequired,
});

export type EntryInfo = {|
  id?: string, // null if local copy without ID yet
  localID?: string, // for optimistic creations
  threadID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
  creator: ?string,
  deleted: bool,
|};

export const entryInfoPropType = PropTypes.shape({
  id: PropTypes.string,
  localID: PropTypes.string,
  threadID: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  creationTime: PropTypes.number.isRequired,
  creator: PropTypes.string,
  deleted: PropTypes.bool.isRequired,
});
