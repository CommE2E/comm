// @flow

import createBrowserHistory from 'history/createBrowserHistory';

declare var base_url: string;
const baseURL = base_url.replace(/\/$/, '');

export default createBrowserHistory({ basename: baseURL });
