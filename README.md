# Blockchain Implementation (JavaScript)

A basic blockchain built from scratch in JavaScript. It uses **no external packages**, only Node's built-in `crypto` module.

## Features

- **Blocks**: each block stores an index, timestamp, transactions, the previous block's hash, a nonce, and its own hash.
- **Cryptographic hashing**: SHA-256 runs over every field of a block, so changing any byte changes the hash.
- **Proof-of-work**: a block is mined by raising its nonce until the hash starts with `difficulty` leading zeros.
- **Signed transactions**: wallets are secp256k1 key pairs. Each transaction is signed with ECDSA by the sender's private key and verified against the sender's address, which is the public key.
- **Transaction verification**: a transaction is rejected if it is unsigned, forged, signed by the wrong key, has a non-positive amount, or spends more than the sender's balance (pending transactions are counted too).
- **Chain validation**: `isChainValid()` checks every transaction signature, that each block's hash matches its contents, the `previousHash` links, and the proof-of-work target. It returns the reason when the chain is invalid.
- **Mining rewards and balances**: miners get a reward transaction, and balances are computed by replaying the chain.

## Project structure

```
src/
  wallet.js        key pair generation, address <-> public key
  Transaction.js   hashing, signing, signature verification
  Block.js         block hashing and proof-of-work mining
  Blockchain.js    chain, pending pool, mining, balances, validation
index.js           end-to-end demo
test/              unit tests (node:test)
```

## Usage

Requires Node.js 18 or newer.

```bash
npm start   # run the demo
npm test    # run the test suite
```

The demo creates wallets, mines blocks, sends signed transfers, and prints balances. It then tries forged and overspending transactions, which are rejected. Finally it tampers with a mined block and shows that the chain is detected as invalid.

## Example

```js
import { Blockchain } from './src/Blockchain.js';
import { Transaction } from './src/Transaction.js';
import { createWallet } from './src/wallet.js';

const chain = new Blockchain({ difficulty: 3 });
const alice = createWallet();
const bob = createWallet();

chain.minePendingTransactions(alice.address);      // Alice earns the mining reward

const tx = new Transaction(alice.address, bob.address, 25);
tx.sign(alice.privateKey);
chain.addTransaction(tx);
chain.minePendingTransactions(alice.address);

chain.getBalance(bob.address);   // 25
chain.isChainValid();            // { valid: true }
```

## Why tampering is detected

1. Editing a transaction breaks its **signature**, and the block's hash no longer matches its contents.
2. Recomputing that block's hash would require **re-doing the proof-of-work**.
3. Even after re-mining, the next block's `previousHash` no longer matches, so every later block would have to be re-mined too.
