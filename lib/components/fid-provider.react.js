// @flow

import * as React from 'react';

type FIDContextType = {
  +setFID: string => void,
  +fid: ?string,
};

const FIDContext: React.Context<?FIDContextType> =
  React.createContext<?FIDContextType>();

type Props = {
  +children: React.Node,
};
function FIDProvider(props: Props): React.Node {
  const [fid, setFID] = React.useState<?string>('7811');

  const context = React.useMemo(() => ({ fid, setFID }), [fid]);

  return (
    <FIDContext.Provider value={context}>{props.children}</FIDContext.Provider>
  );
}

export { FIDContext, FIDProvider };
