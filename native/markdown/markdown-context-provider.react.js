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

  const [userProfileBottomSheetActive, setUserProfileBottomSheetActive] =
    React.useState<{
      [key: string]: boolean,
    }>({});

  const [spoilerRevealed, setSpoilerRevealed] = React.useState<{
    [key: string]: {
      [key: number]: boolean,
    },
  }>({});

  const clearMarkdownContextData = React.useCallback(() => {
    setLinkModalActive({});
    setUserProfileBottomSheetActive({});
    setSpoilerRevealed({});
  }, []);

  const contextValue = React.useMemo(
    () => ({
      setLinkModalActive,
      linkModalActive,
      userProfileBottomSheetActive,
      setUserProfileBottomSheetActive,
      setSpoilerRevealed,
      spoilerRevealed,
      clearMarkdownContextData,
    }),
    [
      setLinkModalActive,
      linkModalActive,
      setUserProfileBottomSheetActive,
      userProfileBottomSheetActive,
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
