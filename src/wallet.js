import crypto from 'node:crypto';

/**
 * Creates a wallet: an elliptic-curve key pair on secp256k1 (the curve Bitcoin uses).
 * The address is the hex-encoded public key, so anyone can verify signatures from it.
 */
export function createWallet() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  return { address: publicKeyToAddress(publicKey), privateKey };
}

/** Converts a public KeyObject into a hex address (DER/SPKI encoding). */
export function publicKeyToAddress(publicKey) {
  return publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
}

/** Converts a hex address back into a public KeyObject for signature verification. */
export function addressToPublicKey(address) {
  return crypto.createPublicKey({ key: Buffer.from(address, 'hex'), format: 'der', type: 'spki' });
}

/** Derives the address that belongs to a private key. */
export function addressFromPrivateKey(privateKey) {
  return publicKeyToAddress(crypto.createPublicKey(privateKey));
}
