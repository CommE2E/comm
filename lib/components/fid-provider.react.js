// @flow

import * as React from 'react';

type FIDContextType = {
  +setFID: (?string) => mixed,
  +fid: ?string,
};

const FIDContext: React.Context<?FIDContextType> =
  React.createContext<?FIDContextType>();

type Props = {
  +children: React.Node,
};
function FIDProvider(props: Props): React.Node {
  const [fid, setFID] = React.useState<?string>();

  const context = React.useMemo(() => ({ fid, setFID }), [fid]);

  return (
    <FIDContext.Provider value={context}>{props.children}</FIDContext.Provider>
  );
}

export { FIDContext, FIDProvider };
