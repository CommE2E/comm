// @flow

import React from 'react';

export type EntryInfo = {
  id?: ?string, // null if local copy without ID yet
  localID?: ?string, // only set if id is unset, local to Day
  calendarID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
  creator: ?string,
  deleted: bool,
}

export const entryInfoPropType = React.PropTypes.shape({
  id: React.PropTypes.string,
  localID: React.PropTypes.string,
  calendarID: React.PropTypes.string.isRequired,
  text: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  creationTime: React.PropTypes.number.isRequired,
  creator: React.PropTypes.string,
  deleted: React.PropTypes.bool.isRequired,
});
