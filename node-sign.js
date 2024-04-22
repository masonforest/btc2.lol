import HDKey from "hdkey";
// import {createHash} from "sha256-uint8array";
// import {Signature} from "@noble/secp256k1'";
import * as secp from "@noble/secp256k1";
import bitcoinMessage from "bitcoinjs-message";
// import Btc from "@ledgerhq/hw-app-btc";
import bippath from "bip32-path";
export const MAX_SCRIPT_BLOCK = 50;
import TransportNodeHID from "@ledgerhq/hw-transport-node-hid";
import varuint from "varuint-bitcoin";
import secp256k1 from "secp256k1";
import createHash from "create-hash";
import { sha256 } from "@noble/hashes/sha256";

console.log(bippath.fromString("m/44'/0'/0'").toPathArray())

// https://github.com/bitcoin/bitcoin/blob/a85e5a7c9ab75209bc88e49be6991ba0a467034e/src/util/message.cpp#L24
const MESSAGE_MAGIC = Buffer.from("Bitcoin Signed Message:\n");
const sha256d = (data) => sha256(sha256(data));

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

function decodeSignature(buffer) {
  if (buffer.length !== 65) throw new Error("Invalid signature length");

  const flagByte = buffer.readUInt8(0) - 27;
  if (flagByte > 15 || flagByte < 0) {
    throw new Error("Invalid signature parameter");
  }

  return {
    compressed: !!(flagByte & 12),
    segwitType: !(flagByte & 8)
      ? null
      : !(flagByte & 4)
        ? SEGWIT_TYPES.P2SH_P2WPKH
        : SEGWIT_TYPES.P2WPKH,
    recovery: flagByte & 3,
    signature: buffer.slice(1),
  };
}

// const signatureFromLedger = {v: 1, r: 'a5df6c22c705a6edf931df69a956dbc9b1c4df0f10e369b214586c2b1f6065f6', s: '057c91ad1057cd9a687348d420f38018e04f1dc3ab9091efd82c9223f635623c'}
// var message = "hello world";
// const msgHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

// var signature =
//   "Hxk1/5XpFK+nAQOhJIdOgn3OnsxdD4LEp3znRi0HklEvVl2G27RCMrymt4N2u7nT8iMPzLZZqd88Ignd2KiyhsA=";
// var address = "bc1q5xk9rkr84y74drs4zc7262tgjpn79vev0wykn7";
// const s = decodeSignature(Buffer.from(signature, "base64"));
// console.log(secp.Signature.fromCompact(s.signature).addRecoveryBit(s.recovery))
// console.log(s.signature.toString("hex"))
// console.log(
//   Buffer.from(
//     secp.Signature.fromCompact(s.signature)
//       .addRecoveryBit(s.recovery)
//       .recoverPublicKey(magicHash(Buffer.from(message)))
//       .toRawBytes(),
//   ).toString("hex"),
// );
// console.log(bitcoinMessage.verify(message, address, signature, null, true));

// var message = "\u0018Bitcoin Signed Message:\nCampagne de Sarkozy : une double comptabilite chez Bygmalion"
// const seed= "1762F9A3007DBC825D0DD9958B04880284E88F10C57CF569BB3DADF7B1027F2D"
// var hdkey = HDKey.fromMasterSeed(Buffer.from(seed, 'hex'))
// var childkey = hdkey.derive("m/44'/0'/0'/0/0");
// console.log(childkey.sign(createHash().update(message).digest()).toString("hex"))
// console.log("30450221009a0d28391c0535aec1077bbb86614c8f3c384a3e9aa1a124bfb9ce9649196b7e02200efa1adc010a7bdde4784ee98441e402f93b3c50a2760cb09dda07501e02c81f")
// console.log(hdkey.privateExtendedKey)
// => 'xprv9s21ZrQH143K2SKJK9EYRW3Vsg8tWVHRS54hAJasj1eGsQXeWDHLeuu5hpLHRbeKedDJM4Wj9wHHMmuhPF8dQ3bzyup6R7qmMQ1i1FtzNEW'
// console.log(hdkey.publicExtendedKey)
// => 'xpub661MyMwAqRbcEvPmRAmYndzERhyNux1GoHzHxgzVHMBFkCro3kbbCiDZZ5XabZDyXPj5mH3hktvkjhhUdCQxie5e1g4t2GuAWNbPmsSfDp2'
// const seed= "1762F9A3007DBC825D0DD9958B04880284E88F10C57CF569BB3DADF7B1027F2D"
// var hdkey = HDKey.fromMasterSeed(Buffer.from(seed, 'hex'))
// var childkey = hdkey.derive("m/44'/0'/0'/0/0");
// console.log(childkey.sign(message))
// console.log("30450221009a0d28391c0535aec1077bbb86614c8f3c384a3e9aa1a124bfb9ce9649196b7e02200efa1adc010a7bdde4784ee98441e402f93b3c50a2760cb09dda07501e02c81f")

async function signMessage(
      transport,
      path,
      messageHex,
    ){
    const paths = bippath.fromString(path).toPathArray();
    const message = Buffer.from(messageHex, "hex");
    let offset = 0;
  
    while (offset !== message.length) {
      const maxChunkSize =
        offset === 0 ? MAX_SCRIPT_BLOCK - 1 - paths.length * 4 - 4 : MAX_SCRIPT_BLOCK;
      const chunkSize =
        offset + maxChunkSize > message.length ? message.length - offset : maxChunkSize;
      const buffer = Buffer.alloc(offset === 0 ? 1 + paths.length * 4 + 2 + chunkSize : chunkSize);
  
      if (offset === 0) {
        buffer[0] = paths.length;
        paths.forEach((element, index) => {
          buffer.writeUInt32BE(element, 1 + 4 * index);
        });
        buffer.writeUInt16BE(message.length, 1 + 4 * paths.length);
        message.copy(buffer, 1 + 4 * paths.length + 2, offset, offset + chunkSize);
      } else {
        message.copy(buffer, 0, offset, offset + chunkSize);
      }
  
      await transport.send(0xe0, 0x4e, 0x00, offset === 0 ? 0x01 : 0x80, buffer);
      offset += chunkSize;
    }
  
    const res = await transport.send(0xe0, 0x4e, 0x80, 0x00, Buffer.from([0x00]));
    const v = res[0] - 0x30;
    let r = res.slice(4, 4 + res[3]);
  
    if (r[0] === 0) {
      r = r.slice(1);
    }
  
    r = r.toString("hex");
    offset = 4 + res[3] + 2;
    let s = res.slice(offset, offset + res[offset - 1]);
  
    if (s[0] === 0) {
      s = s.slice(1);
    }
  
    s = s.toString("hex");
    return {
      v,
      r,
      s,
    };
  }

var message = "hello world";
var address = "bc1q5xk9rkr84y74drs4zc7262tgjpn79vev0wykn7";
console.log(TransportNodeHID)
let transport = await TransportNodeHID.default.create(); 
console.log(await signMessage(transport, "45'/0'/0'/0/0", Buffer.from("hello world", "utf8").toString("hex")))

// const btc = new Btc({transport});
// const result = await btc.signMessage("45'/0'/0'/0'/0", Buffer.from("hello world", "utf8").toString("hex"))
// var v = result['v'] + 27 + 4;
// var signature = Buffer.from(v.toString(16) + result['r'] + result['s'], 'hex').toString('base64');

// console.log(signature)
// console.log(bitcoinMessage.verify(message, address, signature))