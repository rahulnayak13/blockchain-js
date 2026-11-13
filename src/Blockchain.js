import { Block } from './Block.js';
import { Transaction } from './Transaction.js';

export class Blockchain {
  constructor({ difficulty = 3, miningReward = 100 } = {}) {
    this.difficulty = difficulty;
    this.miningReward = miningReward;
    this.pendingTransactions = [];
    this.chain = [this.createGenesisBlock()];
  }

  /** The first block has no predecessor, so its previousHash is fixed to '0'. */
  createGenesisBlock() {
    return new Block(0, Date.parse('2024-01-01T00:00:00Z'), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /** Validates a transaction and adds it to the pending pool. */
  addTransaction(tx) {
    if (!tx.fromAddress || !tx.toAddress) {
      throw new Error('Transaction must include from and to address');
    }
    if (!tx.isValid()) {
      throw new Error('Cannot add invalid transaction (bad or missing signature)');
    }
    if (typeof tx.amount !== 'number' || !(tx.amount > 0)) {
      throw new Error('Transaction amount must be a positive number');
    }

    const pendingOut = this.pendingTransactions
      .filter((p) => p.fromAddress === tx.fromAddress)
      .reduce((sum, p) => sum + p.amount, 0);
    if (this.getBalance(tx.fromAddress) - pendingOut < tx.amount) {
      throw new Error('Insufficient balance');
    }

    this.pendingTransactions.push(tx);
    return tx;
  }

  /** Bundles pending transactions plus a reward into a new block and mines it. */
  minePendingTransactions(minerAddress) {
    const reward = new Transaction(null, minerAddress, this.miningReward);
    const block = new Block(
      this.chain.length,
      Date.now(),
      [...this.pendingTransactions, reward],
      this.getLatestBlock().hash,
    );

    const start = Date.now();
    block.mine(this.difficulty);
    const ms = Date.now() - start;

    this.chain.push(block);
    this.pendingTransactions = [];
    return { block, ms };
  }

  /** Balance = everything received minus everything sent, across the whole chain. */
  getBalance(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address) balance -= tx.amount;
        if (tx.toAddress === address) balance += tx.amount;
      }
    }
    return balance;
  }

  /**
   * Checks the integrity of the whole chain.
   * @returns {{ valid: boolean, error?: string }}
   */
  isChainValid() {
    const genesis = this.createGenesisBlock();
    if (JSON.stringify(this.chain[0]) !== JSON.stringify(genesis)) {
      return { valid: false, error: 'Genesis block has been modified' };
    }

    const target = '0'.repeat(this.difficulty);
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (!current.hasValidTransactions()) {
        return { valid: false, error: `Block ${i} contains an invalid transaction` };
      }
      if (current.hash !== current.calculateHash()) {
        return { valid: false, error: `Block ${i} hash does not match its contents` };
      }
      if (current.previousHash !== previous.hash) {
        return { valid: false, error: `Block ${i} is not linked to block ${i - 1}` };
      }
      if (!current.hash.startsWith(target)) {
        return { valid: false, error: `Block ${i} does not satisfy proof-of-work` };
      }
    }
    return { valid: true };
  }
}
