import { sha256 } from '@noble/hashes/sha256'; 
import varuint from "varuint-bitcoin";  
import bitcoinMessage from "bitcoinjs-message";


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
function hash256 (buffer) {
  return sha256(sha256(buffer))
}
const message = `1
49168ebc826a82cc84c0139660d9bafb919a6a51d2f01bf31629896061e394d00
0000000000000000000000000000000000000000
136265`;
const bitcoinAddress ="bc1q5xk9rkr84y74drs4zc7262tgjpn79vev0wykn7";
const result = {v: 1, r: '8472726d44e0a64d178bf30e0919e110b04cecac47de3d54cbc5ad5e78c93cc5', s: '7d095463b120252e6ab68bd8f9dcb19e8604b7cb420fc69905649d936ba4e417'}
var v = result["v"] + 27 + 4;
var signature = Buffer.from(
  v.toString(16) + result["r"] + result["s"],
  "hex",
).toString("base64");
console.log(bitcoinMessage.verify(message, bitcoinAddress, signature, null, true))

console.log(Buffer.from(magicHash(Buffer.from(`hello world`))).toString("hex"))
