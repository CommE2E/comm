// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { SetState } from 'lib/types/hook-types.js';

export type MemberListSidebarContextType = {
  +showMemberListSidebar: boolean,
  +setShowMemberListSidebar: SetState<boolean>,
};

const MemberListSidebarContext: React.Context<?MemberListSidebarContextType> =
  React.createContext<?MemberListSidebarContextType>();

type Props = {
  +children: React.Node,
};

function MemberListSidebarProvider(props: Props): React.Node {
  const { children } = props;

  const [showMemberListSidebar, setShowMemberListSidebar] =
    React.useState(false);

  const contextValue = React.useMemo(
    () => ({
      showMemberListSidebar,
      setShowMemberListSidebar,
    }),
    [showMemberListSidebar],
  );

  return (
    <MemberListSidebarContext.Provider value={contextValue}>
      {children}
    </MemberListSidebarContext.Provider>
  );
}

function useMemberListSidebarContext(): MemberListSidebarContextType {
  const memberListSidebarContext = React.useContext(MemberListSidebarContext);

  invariant(memberListSidebarContext, 'memberListSidebarContext should be set');
  return memberListSidebarContext;
}

export { MemberListSidebarProvider, useMemberListSidebarContext };
