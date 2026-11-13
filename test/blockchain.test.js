import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Blockchain } from '../src/Blockchain.js';
import { Block } from '../src/Block.js';
import { Transaction } from '../src/Transaction.js';
import { createWallet } from '../src/wallet.js';

const signed = (from, to, amount) => {
  const tx = new Transaction(from.address, to.address, amount);
  tx.sign(from.privateKey);
  return tx;
};

describe('Block', () => {
  test('mining produces a hash meeting the difficulty target', () => {
    const block = new Block(1, Date.now(), [], 'abc');
    block.mine(3);
    assert.ok(block.hash.startsWith('000'));
    assert.equal(block.hash, block.calculateHash());
  });

  test('changing data changes the hash', () => {
    const block = new Block(1, 1000, [], 'abc');
    const before = block.calculateHash();
    block.previousHash = 'abd';
    assert.notEqual(block.calculateHash(), before);
  });
});

describe('Transaction', () => {
  test('signed transaction is valid', () => {
    const [a, b] = [createWallet(), createWallet()];
    assert.equal(signed(a, b, 5).isValid(), true);
  });

  test('unsigned transaction is invalid', () => {
    const [a, b] = [createWallet(), createWallet()];
    assert.equal(new Transaction(a.address, b.address, 5).isValid(), false);
  });

  test('cannot sign with another wallet\'s key', () => {
    const [a, b] = [createWallet(), createWallet()];
    const tx = new Transaction(a.address, b.address, 5);
    assert.throws(() => tx.sign(b.privateKey), /other wallets/);
  });

  test('editing a signed transaction invalidates it', () => {
    const [a, b] = [createWallet(), createWallet()];
    const tx = signed(a, b, 5);
    tx.amount = 500;
    assert.equal(tx.isValid(), false);
  });
});

describe('Blockchain', () => {
  let chain, alice, bob, miner;

  beforeEach(() => {
    chain = new Blockchain({ difficulty: 2, miningReward: 100 });
    [alice, bob, miner] = [createWallet(), createWallet(), createWallet()];
    chain.minePendingTransactions(alice.address); // Alice gets 100
  });

  test('starts with a genesis block linked to "0"', () => {
    assert.equal(chain.chain[0].index, 0);
    assert.equal(chain.chain[0].previousHash, '0');
  });

  test('blocks are linked by previousHash', () => {
    assert.equal(chain.chain[1].previousHash, chain.chain[0].hash);
  });

  test('balances update after mining', () => {
    chain.addTransaction(signed(alice, bob, 30));
    chain.minePendingTransactions(miner.address);
    assert.equal(chain.getBalance(alice.address), 70);
    assert.equal(chain.getBalance(bob.address), 30);
    assert.equal(chain.getBalance(miner.address), 100);
    assert.deepEqual(chain.isChainValid(), { valid: true });
  });

  test('rejects transaction with invalid signature', () => {
    const tx = new Transaction(alice.address, bob.address, 10);
    tx.signature = 'deadbeef';
    assert.throws(() => chain.addTransaction(tx), /invalid transaction/);
  });

  test('rejects overspending, including pending transactions', () => {
    chain.addTransaction(signed(alice, bob, 80));
    assert.throws(() => chain.addTransaction(signed(alice, bob, 30)), /Insufficient balance/);
  });

  test('rejects non-positive amounts', () => {
    assert.throws(() => chain.addTransaction(signed(alice, bob, 0)), /positive/);
    assert.throws(() => chain.addTransaction(signed(alice, bob, -5)), /positive/);
  });

  test('detects tampered transaction data', () => {
    chain.addTransaction(signed(alice, bob, 30));
    chain.minePendingTransactions(miner.address);
    chain.chain[2].transactions[0].amount = 3000;
    assert.equal(chain.isChainValid().valid, false);
  });

  test('detects tampered reward even after re-hashing', () => {
    chain.minePendingTransactions(miner.address); // a later block guarantees the broken link is caught
    chain.chain[1].transactions[0].amount = 1_000_000; // reward tx has no signature
    chain.chain[1].hash = chain.chain[1].calculateHash();
    const result = chain.isChainValid();
    assert.equal(result.valid, false);
  });

  test('detects re-mined block that breaks the link to the next block', () => {
    chain.minePendingTransactions(miner.address);
    const tampered = chain.chain[1];
    tampered.transactions[0].amount = 1_000_000;
    tampered.nonce = 0;
    tampered.hash = tampered.calculateHash();
    tampered.mine(chain.difficulty); // block 1 is now internally valid...
    // ...but block 2 still points at block 1's old hash.
    assert.match(chain.isChainValid().error, /Block 2 is not linked/);
  });

  test('detects a broken link', () => {
    chain.minePendingTransactions(miner.address);
    chain.chain[2].previousHash = 'x';
    assert.equal(chain.isChainValid().valid, false);
  });
});
