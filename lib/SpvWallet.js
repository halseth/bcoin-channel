const bcoin = require('bcoin').set('testnet');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits')
var co = require('bcoin/lib/utils/co');
const options = bcoin.config({
      config: true,
      arg: true,
      env: true,
      network: 'testnet',
      logLevel: 'debug',
      logFile: true,
      db: 'leveldb'
    });

inherits(SpvWallet, EventEmitter)

function SpvWallet(dblocation, walletlocation) {
  if (!(this instanceof SpvWallet))
    return new SpvWallet(dblocation, walletlocation);

  var self = this

  EventEmitter.call(self);

  options.dblocation = dblocation
  options.walletlocation = walletlocation
  self.spv = new bcoin.spvnode(options);

  self.spv.on('connect', function(entry, block) {
      console.log('New block.');
      self.spv.walletdb.addBlock(entry, block.txs);
  });

  self.spv.on('error', function(err) {
      console.log(err);
  });

  self.spv.on('tx', function(tx) {
      console.log('------ New tx. Adding to walletdb...' + tx);
      self.spv.walletdb.addTX(tx).then(function(walletIds) {
          console.log(walletIds)
      });
  });
}

SpvWallet.prototype.connect = co(function* connect() {
  var self = this
  yield self.spv.open()
  self.wallet = yield self.spv.walletdb.get('primary')
  console.log(self.spv.walletdb.getAccounts().then(console.log));

  // Watch our balance update as we receive transactions.
  self.wallet.on('balance', function(balance) {
      // Convert satoshis to BTC.
      var btc = bcoin.amount.btc(balance.unconfirmed);
      console.log('Your wallet balance has been updated: %s', btc);
      self.wallet.getBalance().then(console.log);
  });

  // list all receive addresses of the default account
  self.account = yield self.wallet.getAccount('default')
  var addr, i;
  console.log('---------- Receive addresses: ---------');
  for(i = 0; i < self.account.receiveDepth; i++) {
      addr = self.account.deriveReceive(i).getAddress('base58');
      console.log(addr);
      // Add our address to the spv filter.
      self.spv.pool.watchAddress(addr);
  }
  console.log('------------------------------');
  yield self.spv.connect()
  yield self.spv.startSync();
})

SpvWallet.prototype.sendTX = function(tx) {
  var self = this
  console.log('will broadcast tx:')
  console.log(tx)
  self.spv.sendTX(tx)
}

SpvWallet.prototype.disconnect = co(function* connect() {
  var self = this
  self.spv.disconnect().then(function(){
    console.log('disconnected')
  })
})

module.exports = SpvWallet;
