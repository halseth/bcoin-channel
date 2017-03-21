'use strict';

var bcoin = require('bcoin').set('testnet');
var co = require('bcoin/lib/utils/co');
var assert = require('assert');
var RedeemScript = require('./RedeemScript')
var BN = bcoin.bn;
var opcodes = bcoin.script.opcodes;

function FundingTransaction() {
  if (!(this instanceof FundingTransaction))
    return new FundingTransaction();
}

FundingTransaction.create = co(function* create(aliceKeyring, bobPubkey, coins, aliceWallet) {
    var self = this
    var redeemScript = RedeemScript(aliceKeyring.getPublicKey(), bobPubkey)

    var mtx = new bcoin.mtx();

    mtx.addOutput({
      script: redeemScript,
      value: 1000000
    });
    var selector = yield mtx.fund(coins, { rate: 500000, changeAddress: aliceKeyring.getAddress() })
    var coin = selector.chosen[0];
    var address = coin.getAddress()
    var key = yield aliceWallet.getKey(address)
    mtx.sign(key);
    assert(mtx.verify());
    var tx = mtx.toTX();
    assert(tx.verify(mtx.view));

    return tx
})

module.exports = FundingTransaction;
