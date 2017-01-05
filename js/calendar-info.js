// @flow

import React from 'react';

export type CalendarInfo = {
  id: string,
  name: string,
  description: string,
  authorized: bool,
  subscribed: bool,
  canChangeSettings: bool,
  closed: bool,
  color: string, // hex, without "#" or "0x"
  editRules: number,
}

export const calendarInfoPropType = React.PropTypes.shape({
  id: React.PropTypes.string.isRequired,
  name: React.PropTypes.string.isRequired,
  description: React.PropTypes.string.isRequired,
  authorized: React.PropTypes.bool.isRequired,
  subscribed: React.PropTypes.bool.isRequired,
  canChangeSettings: React.PropTypes.bool.isRequired,
  closed: React.PropTypes.bool.isRequired,
  color: React.PropTypes.string.isRequired,
  editRules: React.PropTypes.number.isRequired,
});
