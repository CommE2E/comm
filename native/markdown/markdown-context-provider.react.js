// @flow

import * as React from 'react';

import { MarkdownContext } from './markdown-context.js';

type Props = {
  +children: React.Node,
};

function MarkdownContextProvider(props: Props): React.Node {
  const [linkModalActive, setLinkModalActive] = React.useState<{
    [key: string]: boolean,
  }>({});
  const [linkPressActive, setLinkPressActive] = React.useState<{
    [key: string]: boolean,
  }>({});

  const clearMarkdownContextData = React.useCallback(() => {
    setLinkModalActive({});
    setLinkPressActive({});
  }, []);

  const contextValue = React.useMemo(
    () => ({
      setLinkModalActive,
      linkModalActive,
      setLinkPressActive,
      linkPressActive,
      clearMarkdownContextData,
    }),
    [
      setLinkModalActive,
      linkModalActive,
      setLinkPressActive,
      linkPressActive,
      clearMarkdownContextData,
    ],
  );

  return (
    <MarkdownContext.Provider value={contextValue}>
      {props.children}
    </MarkdownContext.Provider>
  );
}

export default MarkdownContextProvider;
