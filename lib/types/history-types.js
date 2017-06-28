// @flow

import PropTypes from 'prop-types';

export type HistoryMode = "day" | "entry";

export type HistoryRevisionInfo = {|
  id: string,
  entryID: string,
  author: ?string,
  text: string,
  lastUpdate: number,
  deleted: bool,
  threadID: string,
|};
export const historyRevisionInfoPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  entryID: PropTypes.string.isRequired,
  author: PropTypes.string,
  text: PropTypes.string.isRequired,
  lastUpdate: PropTypes.number.isRequired,
  deleted: PropTypes.bool.isRequired,
  threadID: PropTypes.string.isRequired,
});
