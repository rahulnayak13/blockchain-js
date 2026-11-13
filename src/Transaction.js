import crypto from 'node:crypto';
import { addressToPublicKey, addressFromPrivateKey } from './wallet.js';

export class Transaction {
  /**
   * @param {string|null} fromAddress  sender address (null for mining rewards)
   * @param {string} toAddress         recipient address
   * @param {number} amount            amount to transfer
   */
  constructor(fromAddress, toAddress, amount, timestamp = Date.now()) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = timestamp;
    this.signature = null;
  }

  /** SHA-256 hash of the transaction's contents (what gets signed). */
  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(`${this.fromAddress}${this.toAddress}${this.amount}${this.timestamp}`)
      .digest('hex');
  }

  /** Signs the transaction with the sender's private key (ECDSA). */
  sign(privateKey) {
    if (addressFromPrivateKey(privateKey) !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets');
    }
    this.signature = crypto.sign('sha256', Buffer.from(this.calculateHash()), privateKey).toString('hex');
  }

  /** Verifies the signature against the sender's public key (their address). */
  isValid() {
    // Mining rewards are created by the network and carry no signature.
    if (this.fromAddress === null) return true;

    if (!this.signature) return false;

    try {
      return crypto.verify(
        'sha256',
        Buffer.from(this.calculateHash()),
        addressToPublicKey(this.fromAddress),
        Buffer.from(this.signature, 'hex'),
      );
    } catch {
      return false; // malformed address or signature
    }
  }
}
