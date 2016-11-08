// @flow

import React from 'react';

export type HistoryMode = "day" | "entry";

export type HistoryEntryInfo = {
  id: string,
  creator: ?string,
  text: string,
  deleted: bool,
  squadID: string,
};
export const historyEntryInfoPropType = React.PropTypes.shape({
  id: React.PropTypes.string.isRequired,
  creator: React.PropTypes.string,
  text: React.PropTypes.string.isRequired,
  deleted: React.PropTypes.bool.isRequired,
  squadID: React.PropTypes.string.isRequired,
});

export type HistoryRevisionInfo = {
  id: string,
  author: ?string,
  text: string,
  lastUpdate: number,
  deleted: bool,
  squadID: string,
};
export const historyRevisionInfoPropType = React.PropTypes.shape({
  id: React.PropTypes.string.isRequired,
  author: React.PropTypes.string,
  text: React.PropTypes.string.isRequired,
  lastUpdate: React.PropTypes.number.isRequired,
  deleted: React.PropTypes.bool.isRequired,
  squadID: React.PropTypes.string.isRequired,
});
