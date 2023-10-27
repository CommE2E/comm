// @flow

import RadixTree from './radix-tree.js';

type TestValue = {
  +id: number,
};

const radixTree = new RadixTree<TestValue>();

describe('RadixTree.add', () => {
  it('should add "test", "slow", and "water"', () => {
    radixTree.add('test', { id: 1 });
    radixTree.add('slow', { id: 2 });
    radixTree.add('water', { id: 3 });
    expect(radixTree.root.children.length).toBe(3);
    expect(radixTree.root.children[0].part).toBe('test');
    expect(radixTree.root.children[0].leaf).toBe(true);
    expect(radixTree.root.children[1].part).toBe('slow');
    expect(radixTree.root.children[1].leaf).toBe(true);
    expect(radixTree.root.children[2].part).toBe('water');
    expect(radixTree.root.children[2].leaf).toBe(true);
  });
  it('should group "slow" and "slower"', () => {
    radixTree.add('slower', { id: 4 });
    expect(radixTree.root.children.length).toBe(3);
    const slowNode = radixTree.root.children[1];
    expect(slowNode.part).toBe('slow');
    expect(slowNode.leaf).toBe(false);
    if (slowNode.leaf) {
      return;
    }
    const slowChildren = slowNode.children;
    expect(slowChildren.length).toBe(2);
    expect(slowChildren[0].part).toBe('');
    expect(slowChildren[0].leaf).toBe(true);
    expect(slowChildren[1].part).toBe('er');
    expect(slowChildren[1].leaf).toBe(true);
  });
  it('should group "water" and "wat"', () => {
    radixTree.add('wat', { id: 5 });
    expect(radixTree.root.children.length).toBe(3);
    const watNode = radixTree.root.children[2];
    expect(watNode.part).toBe('wat');
    expect(watNode.leaf).toBe(false);
    if (watNode.leaf) {
      return;
    }
    const watChildren = watNode.children;
    expect(watChildren.length).toBe(2);
    expect(watChildren[0].part).toBe('er');
    expect(watChildren[0].leaf).toBe(true);
    expect(watChildren[1].part).toBe('');
    expect(watChildren[1].leaf).toBe(true);
  });
  it('should group "test" and "team"', () => {
    radixTree.add('team', { id: 6 });
    expect(radixTree.root.children.length).toBe(3);
    const teNode = radixTree.root.children[0];
    expect(teNode.part).toBe('te');
    expect(teNode.leaf).toBe(false);
    if (teNode.leaf) {
      return;
    }
    const teChildren = teNode.children;
    expect(teChildren.length).toBe(2);
    expect(teChildren[0].part).toBe('st');
    expect(teChildren[0].leaf).toBe(true);
    expect(teChildren[1].part).toBe('am');
    expect(teChildren[1].leaf).toBe(true);
  });
  it('should group "toast" and "te" (parent of "test" and "team")', () => {
    radixTree.add('toast', { id: 7 });
    expect(radixTree.root.children.length).toBe(3);
    const tNode = radixTree.root.children[0];
    expect(tNode.part).toBe('t');
    expect(tNode.leaf).toBe(false);
    if (tNode.leaf) {
      return;
    }
    const tChildren = tNode.children;
    expect(tChildren.length).toBe(2);
    expect(tChildren[1].part).toBe('oast');
    expect(tChildren[1].leaf).toBe(true);
    const teNode = tChildren[0];
    expect(teNode.part).toBe('e');
    expect(teNode.leaf).toBe(false);
    if (teNode.leaf) {
      return;
    }
    const teChildren = teNode.children;
    expect(teChildren[0].part).toBe('st');
    expect(teChildren[0].leaf).toBe(true);
    expect(teChildren[1].part).toBe('am');
    expect(teChildren[1].leaf).toBe(true);
  });
  it('should combine "slow" and "slow" into a single leaf', () => {
    radixTree.add('slow', { id: 8 });
    expect(radixTree.root.children.length).toBe(3);
    const slowNode = radixTree.root.children[1];
    expect(slowNode.part).toBe('slow');
    expect(slowNode.leaf).toBe(false);
    if (slowNode.leaf) {
      return;
    }
    const slowChildren = slowNode.children;
    expect(slowChildren.length).toBe(2);
    const slowLeafNode = slowChildren[0];
    expect(slowLeafNode.part).toBe('');
    expect(slowLeafNode.leaf).toBe(true);
    if (!slowLeafNode.leaf) {
      return;
    }
    expect(slowLeafNode.values.length).toBe(2);
    expect(slowChildren[1].part).toBe('er');
    expect(slowChildren[1].leaf).toBe(true);
  });
});

describe('RadixTree.getAllMatchingPrefix', () => {
  it('should match "t" to "toast", "test", and "team"', () => {
    const results = radixTree.getAllMatchingPrefix('t');
    expect(results.length).toBe(3);
    expect(results[0].id).toBe(7);
    expect(results[1].id).toBe(1);
    expect(results[2].id).toBe(6);
  });
  it('should match "slow" to "slow", "slow", and "slower"', () => {
    const results = radixTree.getAllMatchingPrefix('slow');
    expect(results.length).toBe(3);
    expect(results[0].id).toBe(2);
    expect(results[1].id).toBe(8);
    expect(results[2].id).toBe(4);
  });
  it('should match "slowe" to "slower"', () => {
    const results = radixTree.getAllMatchingPrefix('slowe');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(4);
  });
  it('should match "wa" to "wat" and "water"', () => {
    const results = radixTree.getAllMatchingPrefix('wa');
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(3);
    expect(results[1].id).toBe(5);
  });
  it('should match "water" to "water"', () => {
    const results = radixTree.getAllMatchingPrefix('water');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(3);
  });
  it('should match "" to all results', () => {
    const results = radixTree.getAllMatchingPrefix('');
    expect(results.length).toBe(8);
  });
});

describe('RadixTree.getAllMatchingExactly', () => {
  it('should not match "t"', () => {
    const results = radixTree.getAllMatchingExactly('t');
    expect(results.length).toBe(0);
  });
  it('should match "slow" to "slow" and "slow"', () => {
    const results = radixTree.getAllMatchingExactly('slow');
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(2);
    expect(results[1].id).toBe(8);
  });
  it('should not match "slowe"', () => {
    const results = radixTree.getAllMatchingExactly('slowe');
    expect(results.length).toBe(0);
  });
  it('should match "slower" to "slower"', () => {
    const results = radixTree.getAllMatchingExactly('slower');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(4);
  });
  it('should match "wat" to "wat"', () => {
    const results = radixTree.getAllMatchingExactly('wat');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(5);
  });
  it('should match "water" to "water"', () => {
    const results = radixTree.getAllMatchingExactly('water');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(3);
  });
});
