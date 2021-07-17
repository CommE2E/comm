// @flow

import appURLFacts from '../../facts/app_url';
import landingURLFacts from '../../facts/landing_url';
import baseURLFacts from '../../facts/url';

type GlobalURLFacts = {
  +baseRoutePath: string,
};

function getGlobalURLFacts(): GlobalURLFacts {
  return baseURLFacts;
}

type AppURLFacts = {
  +baseDomain: string,
  +basePath: string,
  +https: boolean,
};
type LandingURLFacts = {
  ...AppURLFacts,
  +baseRoutePath: string,
};

function getAppURLFacts(): AppURLFacts {
  return appURLFacts;
}

function getLandingURLFacts(): LandingURLFacts {
  return landingURLFacts;
}

export { getGlobalURLFacts, getAppURLFacts, getLandingURLFacts };
