var test = require('tape')
var Sender = require('../lib/Sender')
var Receiver = require('../lib/Receiver')

var sender
var receiver

// test.onFinish(function(){
//   if (sender) sender.disconnect()
//   // if (receiver) receiver.disconnect() // TODO. spv deactivated for receiver
//
//   sender = null
//   receiver = null
// })

test('sender connect', function (t) {
  t.plan(1)
  sender = new Sender()

  sender.on('connected', function() {
    t.pass()
    sender.disconnect()
  })

  sender.connect()
})

test('receiver connect', function (t) {
  t.plan(1)
  receiver = new Receiver()

  receiver.on('connected', function() {
    t.pass()
    // receiver.disconnect() // TODO. spv deactivated for receiver
  })

  receiver.connect()
})

// test('sender openChannel', function (t) {
//   t.plan(1)
//   sender = new Sender()
//
//   sender.on('connected', function() {
//     sender.openChannel('02f1b3258a01d457c3f997eb79c2206fd7002fa26c5e18d6062db5ec8a530b0afc')
//   })
//
//   sender.on('opened', function() {
//     t.pass()
//     sender.disconnect()
//   })
//
//   sender.connect()
// })

// test('both openChannel', function (t) {
//   t.plan(1)
//   sender = new Sender()
//   receiver = new Receiver()
//
//   var connected = 0
//
//   function maybeStart() {
//     if(connected == 2) {
//       sender.openChannel(receiver.getPublicKey())
//     }
//   }
//
//   sender.on('connected', function() {
//     console.log('sender connected')
//     connected += 1
//     maybeStart()
//   })
//
//   sender.on('opened', function(data) {
//     var fundingTx = data.fundingTx
//     var commitmentTx = data.commitmentTx
//     var signature = data.signature
//     var senderPubkey = data.publickey
//
//     receiver.openChannel(commitmentTx, senderPubkey, signature).then(function(signedTx) {
//       console.log('signed tx')
//       console.log(signedTx)
//     })
//   })
//
//   receiver.on('connected', function() {
//     console.log('receiver connected')
//     connected += 1
//     maybeStart()
//   })
//
//   sender.connect()
//   // receiver.connect()
// })
