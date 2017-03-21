'use strict';

var bcoin = require('bcoin').set('testnet');
var BN = bcoin.bn;
var opcodes = bcoin.script.opcodes;

function RedeemScript(alicePubkey, bobPubkey) {
  if (!(this instanceof RedeemScript))
    return new RedeemScript(alicePubkey, bobPubkey);
    var redeemScript = new bcoin.script();
    redeemScript.push(opcodes.OP_IF); // Branch for when channel is settled with payment and refund.
      // Check that Bob has agreed to this spend
      redeemScript.push(bobPubkey)
      redeemScript.push(opcodes.OP_CHECKSIGVERIFY);
    redeemScript.push(opcodes.OP_ELSE); // Branch for when channel is settled with full refund to payor
      redeemScript.push(new BN(0x0000ffff & 30)) // 30 blocks after funding transaction is mined
      redeemScript.push(opcodes.OP_CHECKSEQUENCEVERIFY);
      redeemScript.push(opcodes.OP_DROP);
    redeemScript.push(opcodes.OP_ENDIF);
    // Check that Alice has agreed to this spend
    redeemScript.push(alicePubkey)
    redeemScript.push(opcodes.OP_CHECKSIG);

    // Compile the script to its binary representation
    redeemScript.compile();

    return redeemScript
}


module.exports = RedeemScript;
