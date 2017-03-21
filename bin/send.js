var Sender = require('../lib/Sender')
const Messenger = require('messenger')

var messageSend = Messenger.createSpeaker(8001);
var messageRecv = Messenger.createListener(8000);
var sender = new Sender()
var closed = false

function onMessage(msg) {
  var self = this

  switch (msg.type) {
    case 'signed-commitment':
      console.log("got signed commitment. prepare to send new payment")
      sender.setSignedCommitment(msg.signedCommitment)
      setTimeout(function() {
        if (closed) {
          return
        }
        sender.pay()
      }, 500)
      break
    case 'publickey':
      console.log('got public key from receiver. open channel')
      sender.openChannel(msg.publickey)
      break
    case 'close':
      console.log("closing channel. Broadcasting transactions")
      closed = true
      sender.closeChannel()
      break
    default:
      throw "Unknown message type from receiver: " + msg.type
  }
}

messageRecv.on('message', function(message, data){
  onMessage(data)
});

sender.on('connected', function() {
  console.log('sender connected. will ask to open channel')
  messageSend.send('message', {type: 'open-channel'})
})

sender.on('opened', function(data) {
  console.log('channel opened, send unsigned transaction to receiver')
  var fundingTx = data.fundingTx
  var commitmentTx = data.commitmentTx
  var signature = data.signature
  var senderPubkey = data.pubkey.toString('hex')

  var msg = {type: 'unsigned-commitment', commitmentTx: commitmentTx.toJSON(), fundingTx: fundingTx.toJSON(), senderPubkey: senderPubkey, signature: signature.toString('hex') }
  messageSend.send('message', msg)
})

sender.on('updated', function(data) {
  console.log('new unsigned transaction for receiver created')
  var fundingTx = data.fundingTx
  var commitmentTx = data.commitmentTx
  var signature = data.signature
  var senderPubkey = data.pubkey.toString('hex')

  var msg = {type: 'unsigned-commitment', commitmentTx: commitmentTx.toJSON(), fundingTx: fundingTx.toJSON(), senderPubkey: senderPubkey, signature: signature.toString('hex') }
  messageSend.send('message', msg)
})

sender.connect()
