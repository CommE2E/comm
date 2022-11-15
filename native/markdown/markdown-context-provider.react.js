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

  const [spoilerRevealed, setSpoilerRevealed] = React.useState<{
    [key: string]: {
      [key: number]: boolean,
    },
  }>({});

  const clearMarkdownContextData = React.useCallback(() => {
    setLinkModalActive({});
    setLinkPressActive({});
    setSpoilerRevealed({});
  }, []);

  const contextValue = React.useMemo(
    () => ({
      setLinkModalActive,
      linkModalActive,
      setLinkPressActive,
      linkPressActive,
      setSpoilerRevealed,
      spoilerRevealed,
      clearMarkdownContextData,
    }),
    [
      setLinkModalActive,
      linkModalActive,
      setLinkPressActive,
      linkPressActive,
      setSpoilerRevealed,
      spoilerRevealed,
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
