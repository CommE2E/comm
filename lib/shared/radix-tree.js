// @flow

import invariant from 'invariant';

type RadixTreeLeafNode<V> = {
  leaf: true,
  part: string,
  values: Set<V>,
};
type RadixTreeBranchNode<V> = {
  part: string,
  children: Map<string, RadixTreeNode<V>>,
};
type RadixTreeNode<V> = RadixTreeLeafNode<V> | RadixTreeBranchNode<V>;

class RadixTree<V> {
  root: RadixTreeBranchNode<V> = {
    part: '',
    children: new Map(),
  };

  add(key: string, value: V) {
    let node: RadixTreeNode<V> = this.root;
    let partLeft = key;
    while (true) {
      partLeft = partLeft.substring(node.part.length);
      if (node.leaf) {
        // If we recurse into a leaf, that means we have an exact match
        invariant(
          partLeft.length === 0,
          'RadixTree should have exact match when adding to a leaf',
        );
        node.values.add(value);
        return;
      }
      // If there is a node that is a substring, we recurse into it
      // Otherwise we look for a node with the same first char
      const firstChar = partLeft[0] ?? '';
      const firstCharMatch = node.children.get(firstChar);
      if (!firstCharMatch) {
        node.children.set(firstChar, {
          leaf: true,
          part: partLeft,
          values: new Set([value]),
        });
        return;
      } else if (firstCharMatch.leaf && partLeft === firstCharMatch.part) {
        node = firstCharMatch;
        continue;
      } else if (
        !firstCharMatch.leaf &&
        partLeft.startsWith(firstCharMatch.part)
      ) {
        node = firstCharMatch;
        continue;
      }

      let sharedStart = '';
      const minLength = Math.min(partLeft.length, firstCharMatch.part.length);
      for (let i = 0; i < minLength; i++) {
        if (partLeft[i] !== firstCharMatch.part[i]) {
          break;
        }
        sharedStart += partLeft[i];
      }
      invariant(sharedStart, 'firstCharMatch should share at least one char');

      firstCharMatch.part = firstCharMatch.part.substring(sharedStart.length);
      const newBranchFirstChar = firstCharMatch.part[0] ?? '';

      const newLeafPart = partLeft.substring(sharedStart.length);
      const newLeafFirstChar = newLeafPart[0] ?? '';

      const newBranch = {
        part: sharedStart,
        children: new Map([
          [newBranchFirstChar, firstCharMatch],
          [
            newLeafFirstChar,
            {
              leaf: true,
              part: newLeafPart,
              values: new Set([value]),
            },
          ],
        ]),
      };
      node.children.set(firstChar, newBranch);
      break;
    }
  }

  getAllMatchingPrefix(prefix: string): V[] {
    const result = new Set<V>();
    const stack: Array<{
      +node: RadixTreeNode<V>,
      +partLeft: string,
    }> = [{ node: this.root, partLeft: prefix }];
    while (stack.length > 0) {
      const top = stack.pop();
      if (!top) {
        break;
      }
      const { node, partLeft: prevPartLeft } = top;
      if (node.leaf) {
        for (const value of node.values) {
          result.add(value);
        }
        continue;
      }

      const partLeft = prevPartLeft.substring(node.part.length);
      const firstChar = partLeft[0];
      if (!firstChar) {
        for (const child of node.children.values()) {
          stack.push({ node: child, partLeft });
        }
        continue;
      }

      const firstCharMatch = node.children.get(firstChar);
      if (!firstCharMatch) {
        continue;
      }

      const leafMatch = firstCharMatch.part.startsWith(partLeft);
      if (leafMatch) {
        stack.push({ node: firstCharMatch, partLeft });
        continue;
      }

      const branchMatch =
        !firstCharMatch.leaf && partLeft.startsWith(firstCharMatch.part);
      if (branchMatch) {
        stack.push({ node: firstCharMatch, partLeft });
      }
    }

    return [...result];
  }

  getAllMatchingExactly(key: string): V[] {
    let node: ?RadixTreeNode<V> = this.root;
    let partLeft = key;
    while (node && partLeft.startsWith(node.part)) {
      if (node.leaf) {
        return [...node.values];
      }
      partLeft = partLeft.substring(node.part.length);
      const firstChar = partLeft[0] ?? '';
      node = node.children.get(firstChar);
    }
    return [];
  }
}

export default RadixTree;
