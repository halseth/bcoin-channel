'use strict';

var bcoin = require('bcoin').set('testnet');
var co = require('bcoin/lib/utils/co');
var Coin = require('bcoin/lib/primitives/coin');
var assert = require('assert');
var RedeemScript = require('./RedeemScript')
var BN = bcoin.bn;
var opcodes = bcoin.script.opcodes;

function CommitmentTransaction() {
  if (!(this instanceof CommitmentTransaction))
    return new CommitmentTransaction();
}

// Returns commitment without unlocking script + sender's signature
CommitmentTransaction.createUnsigned = co(function* createUnsigned(senderKey, fundingTransaction, amountReceiver, amountSender, receiverPubkey) {
    var self = this

    var receiverKeyring = new bcoin.keyring.fromPublic(receiverPubkey)

    var senderKeyring = new bcoin.keyring(senderKey.privateKey)
    var redeemScript = RedeemScript(senderKeyring.getPublicKey(), receiverPubkey)

    var mtx = new bcoin.mtx();
    mtx.addOutput({
      address: receiverKeyring.getAddress(),
      value: amountReceiver
    });
    mtx.addOutput({
      address: senderKeyring.getAddress(),
      value: amountSender
    });
    mtx.addTX(fundingTransaction, 0)

    var sign = mtx.signature(0, redeemScript, 1000000, senderKey.privateKey, bcoin.script.hashType.ALL, 0)
    var tx = mtx.toTX();

    return { tx: tx, sign: sign }
})

// Signs unsigned commit transaction with the receivers key
CommitmentTransaction.sign = co(function* sign(commitmentTx, fundingTx, senderPubkey, receiverPubkey, receiverKey, senderSign) {
    var self = this

    senderPubkey = Buffer.from(senderPubkey, 'hex')
    receiverPubkey = Buffer.from(receiverPubkey, 'hex')

    var redeemScript = RedeemScript(senderPubkey, receiverPubkey)
    var mtx = new bcoin.mtx.fromTX(commitmentTx);

    var sign = mtx.signature(0, redeemScript, 1000000, receiverKey.privateKey, bcoin.script.hashType.ALL, 0)

    var unlocking = new bcoin.script();
    unlocking.push(senderSign);
    unlocking.push(sign);
    unlocking.push(opcodes.OP_TRUE);
    unlocking.compile();

    mtx.inputs[0].script = unlocking

    // input must be added to mtx coin view to verify
    var coin = Coin.fromTX(fundingTx, 0, -1);
    mtx.view.addCoin(coin);

    // The transaction should now verify.
    assert(mtx.verify());
    var tx = mtx.toTX();
    assert(tx.verify(mtx.view));

    return tx
})

module.exports = CommitmentTransaction;
