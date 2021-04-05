// @flow

import appURLFacts from '../../facts/app_url';
import baseURLFacts from '../../facts/url';

type GlobalURLFacts = {|
  +baseRoutePath: string,
|};

function getGlobalURLFacts(): GlobalURLFacts {
  return baseURLFacts;
}

type SiteURLFacts = {|
  +baseDomain: string,
  +basePath: string,
  +https: boolean,
|};

function getAppURLFacts(): SiteURLFacts {
  return appURLFacts;
}

export { getGlobalURLFacts, getAppURLFacts };
