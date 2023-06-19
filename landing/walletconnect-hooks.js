// @flow

import invariant from 'invariant';
import * as React from 'react';

type WalletConnectModalUpdate =
  | { +state: 'closed' }
  | { +state: 'open', +height: number };
function useMonitorForWalletConnectModal(
  callback: WalletConnectModalUpdate => mixed,
) {
  const [wcShadowRoot, setWCShadowRoot] = React.useState();
  const [wcResizableContainer, setWCResizableContainer] = React.useState();

  const newShadowRootAppeared = React.useCallback(mutationList => {
    for (const mutation of mutationList) {
      for (const addedNode of mutation.addedNodes) {
        if (
          addedNode instanceof HTMLElement &&
          addedNode.localName === 'w3m-modal' &&
          addedNode.shadowRoot
        ) {
          const { shadowRoot } = addedNode;
          // We actually are looking to track an element inside w3m-modal,
          // rather than w3m-modal itself. Normally we could pass subtree: true
          // to observer.observe, but this doesn't appear to work with a "shadow
          // root", so instead we implement a second-layer MutationObserver once
          // we see the shadow root.
          setWCShadowRoot(shadowRoot);
        }
      }
    }
  }, []);

  React.useEffect(() => {
    const observer = new MutationObserver(newShadowRootAppeared);
    invariant(document.body, 'document.body should be set');
    observer.observe(document.body, { childList: true });
    return () => {
      observer.disconnect();
    };
  }, [newShadowRootAppeared]);

  const newModalAppeared = React.useCallback(mutationList => {
    // We pass subtree: true to the MutationObserver that calls this function.
    // This means we monitor for changes all through the subtree, but if a child
    // subtree is added, we only get the root of the subtree in addedNodes. As
    // such we need to recursively scan the subtree to try and find the node
    // that we're looking for.
    const nodesToInspect = new Set();
    const addNodesToInspect = node => {
      nodesToInspect.add(node);
      for (const childNode of node.childNodes) {
        addNodesToInspect(childNode);
      }
    };
    for (const mutation of mutationList) {
      for (const addedNode of mutation.addedNodes) {
        addNodesToInspect(addedNode);
      }
    }
    for (const node of nodesToInspect) {
      if (
        node instanceof HTMLElement &&
        node.localName === 'div' &&
        node.className === 'w3m-container'
      ) {
        setWCResizableContainer(node);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!wcShadowRoot) {
      return undefined;
    }

    // We can actually skip the MutationObserver below if by the time the React
    // state of wcShadowRoot is set, the subtree has already appeared. We store
    // wcShadowRoot as React state so that we can properly "clean up" the
    // associated observer below in an effect, but it means we have to deal with
    // the associated delay in updated React state, which is unpredictable.
    const modal = wcShadowRoot.getElementById('w3m-modal');
    if (modal) {
      const container = wcShadowRoot.querySelector('div.w3m-container');
      if (container) {
        setWCResizableContainer(container);
        return undefined;
      }
    }

    const observer = new MutationObserver(newModalAppeared);
    observer.observe(wcShadowRoot, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [wcShadowRoot, newModalAppeared]);

  React.useEffect(() => {
    if (!wcResizableContainer) {
      return undefined;
    }
    const resizeObserver = new ResizeObserver(entries => {
      const lastEntry = entries[entries.length - 1];
      const { height } = lastEntry.contentRect;
      if (height) {
        callback({ state: 'open', height });
      } else {
        callback({ state: 'closed' });
      }
    });
    resizeObserver.observe(wcResizableContainer);
    return () => {
      resizeObserver.disconnect();
    };
  }, [wcResizableContainer, callback]);
}

export { useMonitorForWalletConnectModal };
