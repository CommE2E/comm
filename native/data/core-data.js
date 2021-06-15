// @flow

import './core-module-shim';
import * as React from 'react';

export type CoreDataDrafts = {|
  +data: { +[key: string]: string },
  +updateDraft: (draft: {|
    +key: string,
    +text: string,
  |}) => Promise<boolean>,
  +moveDraft: (prevKey: string, nextKey: string) => Promise<boolean>,
|};

export type CoreData = {|
  +drafts: CoreDataDrafts,
|};

const defaultCoreData = Object.freeze({
  drafts: {
    data: {},
    updateDraft: global.CommCoreModule.updateDraft,
    moveDraft: global.CommCoreModule.moveDraft,
  },
});

const CoreDataContext = React.createContext<CoreData>(defaultCoreData);

export { defaultCoreData, CoreDataContext };
