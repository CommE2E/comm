// @flow

import React from 'react';

export type EntryInfo = {
  id?: ?string, // null if local copy without ID yet
  localID?: ?string, // only set if id is unset, local to Day
  squadID: string,
  text: string,
  year: number,
  month: number, // 1-indexed
  day: number, // 1-indexed
  creationTime: number, // millisecond timestamp
}

export const entryInfoPropType = React.PropTypes.shape({
  id: React.PropTypes.string,
  localID: React.PropTypes.string,
  squadID: React.PropTypes.string.isRequired,
  text: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  day: React.PropTypes.number.isRequired,
  creationTime: React.PropTypes.number.isRequired,
});
