// @flow

import invariant from 'invariant';

type RadixTreeLeafNode<V> = {
  leaf: true,
  part: string,
  values: Array<V>,
};
type RadixTreeBranchNode<V> = {
  leaf: false,
  part: string,
  children: Array<RadixTreeNode<V>>,
};
type RadixTreeNode<V> = RadixTreeLeafNode<V> | RadixTreeBranchNode<V>;

class RadixTree<V> {
  root: RadixTreeBranchNode<V> = {
    leaf: false,
    part: '',
    children: [],
  };

  add(key: string, value: V) {
    let node = this.root;
    let partLeft = key;
    while (true) {
      partLeft = partLeft.substring(node.part.length);
      if (node.leaf) {
        // If we recurse into a leaf, that means we have an exact match
        invariant(
          partLeft.length === 0,
          'RadixTree should have exact match when adding to a leaf',
        );
        node.values.push(value);
        return;
      }
      // If there is a node that is a substring, we recurse into it
      // Otherwise we look for a node with the same first char
      let substringNode, firstCharNode;
      for (const child of node.children) {
        if (!child.leaf && partLeft.startsWith(child.part)) {
          substringNode = child;
          break;
        } else if (child.leaf && partLeft === child.part) {
          substringNode = child;
          break;
        }
        if (child.part[0] === partLeft[0] && partLeft.length > 0) {
          invariant(
            !firstCharNode,
            'RadixTree should not have siblings that start with the same char',
          );
          firstCharNode = child;
        }
      }
      if (substringNode) {
        node = substringNode;
        continue;
      }
      invariant(!node.leaf, "Flow doesn't realize node cannot be a leaf here");
      if (!firstCharNode) {
        node.children.push({
          leaf: true,
          part: partLeft,
          values: [value],
        });
        return;
      }

      let sharedStart = '';
      const minLength = Math.min(partLeft.length, firstCharNode.part.length);
      for (let i = 0; i < minLength; i++) {
        if (partLeft[i] !== firstCharNode.part[i]) {
          break;
        }
        sharedStart += partLeft[i];
      }
      invariant(sharedStart, 'firstCharNode should share at least one char');

      firstCharNode.part = firstCharNode.part.substring(sharedStart.length);

      const newBranch = {
        leaf: false,
        part: sharedStart,
        children: [
          firstCharNode,
          {
            leaf: true,
            part: partLeft.substring(sharedStart.length),
            values: [value],
          },
        ],
      };
      let replaced = false;
      for (let i = node.children.length - 1; i >= 0; i--) {
        if (node.children[i] === firstCharNode) {
          node.children[i] = newBranch;
          replaced = true;
          break;
        }
      }
      invariant(replaced, 'Failed to find branch to replace in RadixTree');
      break;
    }
  }

  getAllMatchingPrefix(prefix: string): V[] {
    const result = [];
    const stack = [{ node: this.root, partLeft: prefix }];
    while (stack.length > 0) {
      const { node, partLeft: prevPartLeft } = stack.pop();
      const partLeft = prevPartLeft.substring(node.part.length);
      for (const child of node.children) {
        const leafMatch = child.part.startsWith(partLeft);
        if (!child.leaf) {
          const shouldConsiderBranch =
            leafMatch || partLeft.startsWith(child.part);
          if (shouldConsiderBranch) {
            stack.push({ node: child, partLeft });
          }
          continue;
        }
        if (!leafMatch) {
          continue;
        }
        for (const value of child.values) {
          result.push(value);
        }
      }
    }
    return result;
  }

  getAllMatchingExactly(key: string): V[] {
    const result = [];
    const stack = [{ node: this.root, partLeft: key }];
    while (stack.length > 0) {
      const { node, partLeft: prevPartLeft } = stack.pop();
      const partLeft = prevPartLeft.substring(node.part.length);
      for (const child of node.children) {
        const leafMatch = child.part === partLeft;
        if (!child.leaf) {
          const shouldConsiderBranch = partLeft.startsWith(child.part);
          if (shouldConsiderBranch) {
            stack.push({ node: child, partLeft });
          }
          continue;
        }
        if (!leafMatch) {
          continue;
        }
        for (const value of child.values) {
          result.push(value);
        }
      }
    }
    return result;
  }
}

export default RadixTree;
