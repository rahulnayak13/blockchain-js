import crypto from 'node:crypto';

export class Block {
  /**
   * @param {number} index
   * @param {number} timestamp
   * @param {import('./Transaction.js').Transaction[]} transactions
   * @param {string} previousHash  hash of the block before this one
   */
  constructor(index, timestamp, transactions, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  /** SHA-256 over every field, so changing anything changes the hash. */
  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
          this.previousHash +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.nonce,
      )
      .digest('hex');
  }

  /**
   * Proof-of-work: increment the nonce until the hash starts with `difficulty` zeros.
   * Returns the number of attempts it took.
   */
  mine(difficulty) {
    const target = '0'.repeat(difficulty);
    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    return this.nonce;
  }

  /** True if every transaction in the block has a valid signature. */
  hasValidTransactions() {
    return this.transactions.every((tx) => tx.isValid());
  }
}
