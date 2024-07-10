// @flow

import * as React from 'react';

import { BaseAutoJoinCommunityHandler } from 'lib/components/base-auto-join-community-handler.react.js';

import { useSelector } from '../redux/redux-utils.js';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors.js';

function AutoJoinCommunityHandler(): React.Node {
  const calendarQuery = useSelector(nonThreadCalendarQuery);

  return <BaseAutoJoinCommunityHandler calendarQuery={calendarQuery} />;
}

export { AutoJoinCommunityHandler };
