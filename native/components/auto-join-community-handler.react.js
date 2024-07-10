// @flow

import * as React from 'react';

import { BaseAutoJoinCommunityHandler } from 'lib/components/base-auto-join-community-handler.react.js';

import { nonThreadCalendarQuery } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';

function AutoJoinCommunityHandler(): React.Node {
  const navContext = React.useContext(NavContext);

  const calendarQuery = useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );

  return <BaseAutoJoinCommunityHandler calendarQuery={calendarQuery} />;
}

export { AutoJoinCommunityHandler };
