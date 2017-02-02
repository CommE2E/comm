// @flow

import useBasename from 'history/lib/useBasename';
import createBrowserHistory from 'history/lib/createBrowserHistory';

declare var base_url: string;

export default useBasename(createBrowserHistory)({ basename: base_url });
