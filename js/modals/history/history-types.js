// @flow

import React from 'react';

export type HistoryMode = "day" | "entry";

export type HistoryRevisionInfo = {
  id: string,
  entryID: string,
  author: ?string,
  text: string,
  lastUpdate: number,
  deleted: bool,
  squadID: string,
};
export const historyRevisionInfoPropType = React.PropTypes.shape({
  id: React.PropTypes.string.isRequired,
  entryID: React.PropTypes.string.isRequired,
  author: React.PropTypes.string,
  text: React.PropTypes.string.isRequired,
  lastUpdate: React.PropTypes.number.isRequired,
  deleted: React.PropTypes.bool.isRequired,
  squadID: React.PropTypes.string.isRequired,
});
