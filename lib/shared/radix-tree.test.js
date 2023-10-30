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
    const childNodes = [...radixTree.root.children.values()];
    expect(childNodes.length).toBe(3);
    expect(childNodes[0].part).toBe('test');
    expect(childNodes[0].leaf).toBe(true);
    expect(childNodes[1].part).toBe('slow');
    expect(childNodes[1].leaf).toBe(true);
    expect(childNodes[2].part).toBe('water');
    expect(childNodes[2].leaf).toBe(true);
  });
  it('should group "slow" and "slower"', () => {
    radixTree.add('slower', { id: 4 });
    const childNodes = [...radixTree.root.children.values()];
    expect(childNodes.length).toBe(3);
    const slowNode = childNodes[1];
    expect(slowNode.part).toBe('slow');
    expect(!!slowNode.leaf).toBe(false);
    if (slowNode.leaf) {
      return;
    }
    const slowChildren = slowNode.children;
    const slowChildrenNodes = [...slowChildren.values()];
    expect(slowChildrenNodes.length).toBe(2);
    expect(slowChildrenNodes[0].part).toBe('');
    expect(slowChildrenNodes[0].leaf).toBe(true);
    expect(slowChildrenNodes[1].part).toBe('er');
    expect(slowChildrenNodes[1].leaf).toBe(true);
  });
  it('should group "water" and "wat"', () => {
    radixTree.add('wat', { id: 5 });
    const childNodes = [...radixTree.root.children.values()];
    expect(childNodes.length).toBe(3);
    const watNode = childNodes[2];
    expect(watNode.part).toBe('wat');
    expect(!!watNode.leaf).toBe(false);
    if (watNode.leaf) {
      return;
    }
    const watChildren = watNode.children;
    const watChildrenNodes = [...watChildren.values()];
    expect(watChildrenNodes.length).toBe(2);
    expect(watChildrenNodes[0].part).toBe('er');
    expect(watChildrenNodes[0].leaf).toBe(true);
    expect(watChildrenNodes[1].part).toBe('');
    expect(watChildrenNodes[1].leaf).toBe(true);
  });
  it('should group "test" and "team"', () => {
    radixTree.add('team', { id: 6 });
    const childNodes = [...radixTree.root.children.values()];
    expect(childNodes.length).toBe(3);
    const teNode = childNodes[0];
    expect(teNode.part).toBe('te');
    expect(!!teNode.leaf).toBe(false);
    if (teNode.leaf) {
      return;
    }
    const teChildren = teNode.children;
    const teChildrenNodes = [...teChildren.values()];
    expect(teChildrenNodes.length).toBe(2);
    expect(teChildrenNodes[0].part).toBe('st');
    expect(teChildrenNodes[0].leaf).toBe(true);
    expect(teChildrenNodes[1].part).toBe('am');
    expect(teChildrenNodes[1].leaf).toBe(true);
  });
  it('should group "toast" and "te" (parent of "test" and "team")', () => {
    radixTree.add('toast', { id: 7 });
    const childNodes = [...radixTree.root.children.values()];
    expect(childNodes.length).toBe(3);
    const tNode = childNodes[0];
    expect(tNode.part).toBe('t');
    expect(!!tNode.leaf).toBe(false);
    if (tNode.leaf) {
      return;
    }
    const tChildren = tNode.children;
    const tChildrenNodes = [...tChildren.values()];
    expect(tChildrenNodes.length).toBe(2);
    expect(tChildrenNodes[1].part).toBe('oast');
    expect(tChildrenNodes[1].leaf).toBe(true);
    const teNode = tChildrenNodes[0];
    expect(teNode.part).toBe('e');
    expect(!!teNode.leaf).toBe(false);
    if (teNode.leaf) {
      return;
    }
    const teChildren = teNode.children;
    const teChildrenNodes = [...teChildren.values()];
    expect(teChildrenNodes[0].part).toBe('st');
    expect(teChildrenNodes[0].leaf).toBe(true);
    expect(teChildrenNodes[1].part).toBe('am');
    expect(teChildrenNodes[1].leaf).toBe(true);
  });
  it('should combine "slow" and "slow" into a single leaf', () => {
    radixTree.add('slow', { id: 8 });
    const childNodes = [...radixTree.root.children.values()];
    expect(childNodes.length).toBe(3);
    const slowNode = childNodes[1];
    expect(slowNode.part).toBe('slow');
    expect(!!slowNode.leaf).toBe(false);
    if (slowNode.leaf) {
      return;
    }
    const slowChildren = slowNode.children;
    const slowChildrenNodes = [...slowChildren.values()];
    expect(slowChildrenNodes.length).toBe(2);
    const slowLeafNode = slowChildrenNodes[0];
    expect(slowLeafNode.part).toBe('');
    expect(slowLeafNode.leaf).toBe(true);
    if (!slowLeafNode.leaf) {
      return;
    }
    expect(slowLeafNode.values.size).toBe(2);
    expect(slowChildrenNodes[1].part).toBe('er');
    expect(slowChildrenNodes[1].leaf).toBe(true);
  });
});

describe('RadixTree.getAllMatchingPrefix', () => {
  it('should match "t" to "toast", "test", and "team"', () => {
    const results = radixTree.getAllMatchingPrefix('t');
    expect(results.length).toBe(3);
    expect(results[0].id).toBe(7);
    expect(results[1].id).toBe(6);
    expect(results[2].id).toBe(1);
  });
  it('should match "slow" to "slow", "slow", and "slower"', () => {
    const results = radixTree.getAllMatchingPrefix('slow');
    expect(results.length).toBe(3);
    expect(results[0].id).toBe(4);
    expect(results[1].id).toBe(2);
    expect(results[2].id).toBe(8);
  });
  it('should match "slowe" to "slower"', () => {
    const results = radixTree.getAllMatchingPrefix('slowe');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(4);
  });
  it('should match "wa" to "wat" and "water"', () => {
    const results = radixTree.getAllMatchingPrefix('wa');
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(5);
    expect(results[1].id).toBe(3);
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
