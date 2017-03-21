
var Receiver = require('../lib/Receiver')
const Messenger = require('messenger')

var messageSend = Messenger.createSpeaker(8000);
var messageRecv = Messenger.createListener(8001);
var receiver = new Receiver()

var numReceived = 0
var closed = false

function onMessage(msg) {
  var self = this

  switch (msg.type) {
    case 'unsigned-commitment':
      if(closed) {
        console.log("already closed, ignoring")
        return
      }
      console.log("got unsigned commitment")
      console.log(msg.commitmentTx)
      console.log(msg.senderPubkey)
      console.log(msg.signature)
      console.log(msg.fundingTx)

      receiver.signCommitment(msg.commitmentTx, msg.fundingTx, msg.senderPubkey, msg.signature).then(function(signedTx) {
        console.log('signed the commitment')
        console.log(signedTx)
        var sendMsg = {type: 'signed-commitment', signedCommitment: signedTx.toJSON()}
        messageSend.send('message', sendMsg)
        if(++numReceived > 20) {
          // Close down channel
          console.log('closing channel')
          closed = true
          messageSend.send('message', {type: 'close'})
        }
      })
      break
    case 'open-channel':
      console.log("got open channel request. Will send publickey")
      var sendMsg = {type: 'publickey', publickey: receiver.getPublicKey().toString('hex')}
      messageSend.send('message', sendMsg)
      break
    default:
      throw "Unknown message type from receiver: " + msg.type
  }
}

messageRecv.on('message', function(message, data){
  onMessage(data)
});

receiver.on('connected', function() {
  console.log('receiver connected')
  console.log(receiver.getPublicKey().toString('hex'))
})

receiver.connect()
