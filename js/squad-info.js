// @flow

import React from 'react';

export type SquadInfo = {
  name: string,
  authorized: bool,
  subscribed: bool,
  editable: bool,
}

export const squadInfoPropType = React.PropTypes.shape({
  name: React.PropTypes.string.isRequired,
  authorized: React.PropTypes.bool.isRequired,
  subscribed: React.PropTypes.bool.isRequired,
  editable: React.PropTypes.bool.isRequired,
});
