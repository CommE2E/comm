// @flow

import React from 'react';

// from SectionList.js
export type SectionBase<SectionItemT> = {
  data: $ReadOnlyArray<SectionItemT>,
  key?: string,
  renderItem?: ?(info: {
    item: SectionItemT,
    index: number,
    section: SectionBase<SectionItemT>,
    separators: {
      highlight: () => void,
      unhighlight: () => void,
      updateProps: (select: 'leading' | 'trailing', newProps: Object) => void,
    },
  }) => ?React.Element<any>,
  ItemSeparatorComponent?: ?ReactClass<any>,
  keyExtractor?: (item: SectionItemT) => string,
};
