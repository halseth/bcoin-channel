module.exports = receiver

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
  prefix: 'receiver',
  db: 'leveldb',
  port: 18338
});
bcoin.set(options);

inherits(receiver, EventEmitter)

function receiver () {
  self = this
  EventEmitter.call(this)

  self.fundingAmount = 1000000
  self.fee = 100000 // TODO: dynamic fee
  self.increase = 10 // increase per payment. TODO: configurable
  self.fundingTx = {}
  self.spvWallet = SpvWallet('receiverdb', 'receiverwallet')
  self.master = bcoin.hd.fromMnemonic('potato recall chase uniform menu reveal nature long ridge vocal banner curve');
  console.log("master key: " + self.master.mnemonic)
  self.key = self.master.derive('m/44/0/0/0/0');
  console.log("private key: " + self.key.privateKey.toString('hex'))
  self.keyring = new bcoin.keyring(self.key.privateKey);
  console.log("pubkey: " + self.keyring.getPublicKey().toString('hex'))

  self.senderAmount = self.fundingAmount - self.fee
  self.receiverAmount = 0

}

receiver.prototype.connect = function () {
  self = this
  // TODO: Use the spvWallet. Not actually in use at the moment because two nodes on one computer gets messy
  // self.spvWallet.connect().then(function() {
    self.emit('connected')
  // })
}

// Return signed commitmentTx
receiver.prototype.signCommitment = co(function* openChannel(commitmentTx, fundingTx, senderPubkey, senderSign) {
  self = this

  var commitment = bcoin.tx.fromJSON(commitmentTx)
  var funding = bcoin.tx.fromJSON(fundingTx)
  var sign = Buffer.from(senderSign, 'hex')

  return CommitmentTransaction.sign(
    commitment,
    funding,
    senderPubkey,
    self.keyring.getPublicKey().toString('hex'),
    self.key,
    sign
  )
})

receiver.prototype.disconnect = function () {
  self.spvWallet.disconnect()
}

receiver.prototype.getPublicKey = function () {
  return self.keyring.getPublicKey().toString('hex')
}
