// @flow

import * as React from 'react';

type FeatureFlagsConfiguration = {
  +[feature: string]: boolean,
};

type FeatureFlagsContextType = {
  +configuration: FeatureFlagsConfiguration,
  +loaded: boolean,
};

const defaultContext = {
  configuration: {},
  loaded: false,
};

const FeatureFlagsContext: React.Context<FeatureFlagsContextType> =
  React.createContext<FeatureFlagsContextType>(defaultContext);

type Props = {
  +children: React.Node,
};
function FeatureFlagsProvider(props: Props): React.Node {
  const { children } = props;
  return (
    <FeatureFlagsContext.Provider value={defaultContext}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export { FeatureFlagsContext, FeatureFlagsProvider };
