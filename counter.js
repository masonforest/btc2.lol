import { Buffer } from "buffer";
import * as secp from '@noble/secp256k1';
import Btc from "@ledgerhq/hw-app-btc";
import varuint from "varuint-bitcoin";  
import { sha256 } from '@noble/hashes/sha256'; 
import { ripemd160 } from '@noble/hashes/ripemd160';
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import bitcoinMessage from "bitcoinjs-message";
import {
  bech32
} from '@scure/base';

const sha256d = (data) => sha256(sha256(data));
const MESSAGE_MAGIC = Buffer.from("Bitcoin Signed Message:\n");
function magicHash(message) {
  return sha256d(
    Buffer.concat(
      [MESSAGE_MAGIC, message].flatMap((data) => [
        varuint.encode(data.length),
        data,
      ]),
    ),
  );
}
// unlock()
async function bufferToBase64(buffer) {
  // use a FileReader to generate a base64 data URI:
  const base64url = await new Promise(r => {
    const reader = new FileReader()
    reader.onload = () => r(reader.result)
    reader.readAsDataURL(new Blob([buffer]))
  });
  // remove the `data:...;base64,` part from the start
  return base64url.slice(base64url.indexOf(',') + 1);
}



async function unlock () {
  let devices = await navigator.hid.getDevices();
devices.forEach((device) => {
  console.log(`HID: ${device.productName}`);
});

  try {
    let transport = await TransportWebHID.request(); 
    const btc = new Btc({transport});
    const {bitcoinAddress} = await btc.getWalletPublicKey("84'/0'/0'/0/0", { format: 'bech32' });
    console.log(bitcoinAddress)
    const result = await btc.signMessage("84'/0'/0'/0/0", Buffer.from("hello world").toString("hex"))
    var v = result['v'] + 27 + 4;
var signature = Buffer.from(v.toString(16) + result['r'] + result['s'], 'hex').toString('base64');

console.log("hello world", bitcoinAddress, signature, null, true)
console.log(bitcoinMessage.verify("hello world", bitcoinAddress, signature, null, true))
console.log("Signature : " + signature)
  } catch (e) {
    if (e.statusCode == 27013) {
      alert("Signing was cancelled");
    } else {
      alert(e)
    }
  }

  // TransportWebHID.request().then((transport) => {
  // const btc = new Btc({
  //   transport, 
  // });
  //   btc.signMessage("44'/60'/0'/0'/0", Buffer.from("test").toString("hex")).then(function(result) {
  //     console.log(arguments)
  //   }).catch(function(ex) {console.log(ex);});
  // })

}

console.log(magicHash("test"))
