module.exports = sender

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var bcoin = require('bcoin').set('testnet');
var assert = require('assert');
var co = require('bcoin/lib/utils/co');
var Coin = require('bcoin/lib/primitives/coin');
var FundingTransaction = require('../lib/FundingTransaction')
var CommitmentTransaction = require('../lib/CommitmentTransaction')
var SpvWallet = require('../lib/SpvWallet')
var BN = bcoin.bn;
var opcodes = bcoin.script.opcodes;

var options = bcoin.config({
  config: true,
  arg: true,
  env: true,
  logLevel: 'spam',
  logFile: true,
  prefix: 'sender',
  db: 'leveldb',
  port: 18339
});
bcoin.set(options);

inherits(sender, EventEmitter)

function sender () {
  self = this
  EventEmitter.call(this)

  self.fundingAmount = 1000000
  self.fee = 100000 // TODO: dynamic fee
  self.increase = 1000 // increase per payment. TODO: configurable
  self.fundingTx = {}
  self.spvWallet = SpvWallet('senderdb', 'senderwallet')
  self.master = bcoin.hd.fromMnemonic('era sun iron left prize bomb century fox more differ valve amazing');
  console.log("master key: " + self.master.mnemonic)
  self.key = self.master.derive('m/44/0/0/0/0');
  console.log("private key: " + self.key.privateKey.toString('hex'))
  self.keyring = new bcoin.keyring(self.key.privateKey);
  console.log("pubkey: " + self.keyring.getPublicKey().toString('hex'))

  self.senderAmount = self.fundingAmount - self.fee
  self.receiverAmount = 0
}

sender.prototype.connect = function () {
  self = this
  self.spvWallet.connect().then(function() {
    self.emit('connected')
  })
}

sender.prototype.openChannel = function (receiverPubkey) {
  self = this

  self.receiverPubkey = Buffer.from(receiverPubkey, 'hex');

  self.spvWallet.wallet.getCoins().then(function(coins) {
    if (coins.length <= 0) {
      console.log('wallet has no confirmed inputs. Please fund.')
      throw 'no funds'
    }
    console.log('got coins:')
    console.log(coins)
    return FundingTransaction.create(self.keyring, self.receiverPubkey, coins, self.spvWallet.wallet)
  }).then(function(fundingTx) {
    console.log("funding transaction created:")
    console.log(fundingTx)
    self.fundingTx = fundingTx
    // spvWallet.sendTX(fundingTx) // TODO: Broadcast already here?

    // Create commitmentTransaction
    return CommitmentTransaction.createUnsigned(self.key, self.fundingTx, self.receiverAmount, self.senderAmount, self.receiverPubkey)
  }).then(function(commitment){
    console.log('unsigned commitment created:')
    console.log(commitment.tx)
    self.unsignedCommitmentTx = commitment.tx
    self.signature = commitment.sign
    self.emit('opened', {
      fundingTx: self.fundingTx,
      commitmentTx: self.unsignedCommitmentTx,
      signature: self.signature,
      pubkey: self.keyring.getPublicKey()
    })
    //TODO: broadcast fundingTx
  }).catch(function() {
    console.log('failed opening channel')
  })
}

sender.prototype.pay = function() {
  self.senderAmount -= self.increase
  self.receiverAmount += self.increase

  CommitmentTransaction.createUnsigned(
    self.key,
    self.fundingTx,
    self.receiverAmount,
    self.senderAmount,
    self.receiverPubkey
  ).then(function(commitment){
    console.log('new unsigned commitment created:')
    console.log(commitment.tx)
    self.unsignedCommitmentTx = commitment.tx
    self.signature = commitment.sign
    self.emit('updated', {
      fundingTx: self.fundingTx,
      commitmentTx: self.unsignedCommitmentTx,
      signature: self.signature,
      pubkey: self.keyring.getPublicKey()
    })
  })
}

sender.prototype.setSignedCommitment = function (commitmentTx) {
  self.signedCommitment = bcoin.tx.fromJSON(commitmentTx)
  console.log("signed commitment set to:")
  console.log(self.signedCommitment)
}

sender.prototype.closeChannel = function () {
  self.spvWallet.sendTX(self.fundingTx)
  self.spvWallet.sendTX(self.signedCommitment)
}


sender.prototype.disconnect = function () {
  self.spvWallet.disconnect()
}

sender.prototype.getPublicKey = function () {
  return self.keyring.getPublicKey().toString('hex')
}
