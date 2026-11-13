import { Blockchain } from './src/Blockchain.js';
import { Transaction } from './src/Transaction.js';
import { createWallet } from './src/wallet.js';

const short = (addr) => (addr ? `${addr.slice(-8)}` : 'NETWORK');
const line = (title) => console.log(`\n=== ${title} ${'='.repeat(Math.max(0, 50 - title.length))}`);

const chain = new Blockchain({ difficulty: 4, miningReward: 100 });
const alice = createWallet();
const bob = createWallet();
const miner = createWallet();

console.log('Wallets (last 8 chars of address):');
console.log(`  Alice ...${short(alice.address)}`);
console.log(`  Bob   ...${short(bob.address)}`);
console.log(`  Miner ...${short(miner.address)}`);

line('Block 1: Alice mines to earn coins');
let { block, ms } = chain.minePendingTransactions(alice.address);
console.log(`Mined block #${block.index} in ${ms}ms (nonce ${block.nonce})`);
console.log(`  hash:     ${block.hash}`);
console.log(`  prevHash: ${block.previousHash}`);

line('Block 2: signed transfers');
const tx1 = new Transaction(alice.address, bob.address, 30);
tx1.sign(alice.privateKey);
chain.addTransaction(tx1);
const tx2 = new Transaction(alice.address, miner.address, 10);
tx2.sign(alice.privateKey);
chain.addTransaction(tx2);
console.log('Added: Alice -> Bob 30, Alice -> Miner 10');

({ block, ms } = chain.minePendingTransactions(miner.address));
console.log(`Mined block #${block.index} in ${ms}ms (nonce ${block.nonce})`);
console.log(`  hash:     ${block.hash}`);
console.log(`  prevHash: ${block.previousHash}`);

line('Balances');
console.log(`  Alice: ${chain.getBalance(alice.address)}`);
console.log(`  Bob:   ${chain.getBalance(bob.address)}`);
console.log(`  Miner: ${chain.getBalance(miner.address)}`);
console.log(`Chain valid? ${JSON.stringify(chain.isChainValid())}`);

line('Rejected transactions');
const attempts = [
  ['Unsigned transaction', () => chain.addTransaction(new Transaction(alice.address, bob.address, 5))],
  ['Bob signs as Alice', () => new Transaction(alice.address, bob.address, 5).sign(bob.privateKey)],
  ['Forged signature', () => {
    const forged = new Transaction(alice.address, bob.address, 5);
    forged.signature = tx1.signature; // reuse someone else's signature
    chain.addTransaction(forged);
  }],
  ['Overspending', () => {
    const big = new Transaction(bob.address, alice.address, 1_000);
    big.sign(bob.privateKey);
    chain.addTransaction(big);
  }],
];
for (const [label, attempt] of attempts) {
  try {
    attempt();
    console.log(`  ${label}: ACCEPTED (unexpected!)`);
  } catch (err) {
    console.log(`  ${label}: rejected -> ${err.message}`);
  }
}

line('Tampering');
console.log('Changing Alice -> Bob amount in block 2 from 30 to 3000...');
chain.chain[2].transactions[0].amount = 3000;
console.log(`Chain valid? ${JSON.stringify(chain.isChainValid())}`);

console.log('Attacker also recomputes the block hash...');
chain.chain[2].hash = chain.chain[2].calculateHash();
console.log(`Chain valid? ${JSON.stringify(chain.isChainValid())}`);
