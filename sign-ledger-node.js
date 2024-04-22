import HID from "node-hid";
import { once, EventEmitter } from "events";
import { get } from "http";
import { unlink } from "fs";
const onData = new EventEmitter();

const parseHex = (hex) => {
  const arr = new Uint8Array(hex.length / 2);
  arr.forEach((_, index) => {
    const start = index * 2;
    arr[index] = Number.parseInt(hex.slice(start, start + 2), 16);
  });
  return arr;
};

const CHUNK_SIZE = 64;
const HEADER_SIZE = 5;
const DATA_CHUNK_SIZE = CHUNK_SIZE - HEADER_SIZE;
const CHANNEL = 0x0101;
const TAG = 0x5;
const HID_PREFIX = 0x0;
const BTCHIP_INS_SIGN_MESSAGE = 0x4e;
const CLA_BITCOIN = 0xE1
const SIGN_MESSAGE = 0x10
const PROTOCOL_VERSION = 0x01

const messages = [
  "e110000136058000002d800000008000000000000000000000000b4eccf34608d31bac5c7becf6006df59005d828181056d092084e341e6bb005bd",
  "f8010001224eccf34608d31bac5c7becf6006df59005d828181056d092084e341e6bb005bd0000",
  "f80100010e0c0c0068656c6c6f20776f726c64",
].map(parseHex);

function largestPowerOf2LessThan(n) {
    for (var power = 1; power * 2 < n; power *= 2);
    return power;
}

const elementHash = (elementPreimage) =>  sha256(Buffer.concat([0], elementPreimage))
const combineHashes = (left, right) =>  sha256(Buffer.concat([1], left, right))

const GET_PREIMAGE = 0x40
const GET_MERKLE_LEAF_PROOF = 0x41
const COMMANDS = {
   [GET_PREIMAGE]: getPreImage,
   [GET_MERKLE_LEAF_PROOF]: getMerkleLeafProof  
}
function getPreImage() {

}
function getMerkleLeafProof() {

}

function signMessage() {
    return Buffer.from([
        CLA_BITCOIN,
        SIGN_MESSAGE,
        0, // p1
        PROTOCOL_VERSION, // p2
    ])

}
console.log(signMessage().toString("hex"))
console.log(Buffer.from(messages[0]).toString("hex"))
process.exit()
async function exchange(message) {
  const data = new Uint8Array([...uint16ToBytes(message.length), ...message]);
  let sequenceId = 0;
  for (const chunk of chunks(data, DATA_CHUNK_SIZE)) {
    const payload = Uint8Array.from([
      HID_PREFIX,
      ...getHeader(sequenceId),
      ...chunk,
    ]);
    device.write(payload);
    sequenceId++;
  }
  return read()
}
const read = async () => (await once(onData, "data"))[0];
function getHeader(sequenceId) {
  const buffer = new ArrayBuffer(HEADER_SIZE);
  const uint8Array = new Uint8Array(buffer);
  const dataView = new DataView(buffer);
  dataView.setUint16(0, CHANNEL, true);
  dataView.setUint8(2, TAG, true);
  dataView.setUint16(3, sequenceId, false);
  return uint8Array;
}

function* chunks(iter, chunkLength) {
  let index = 0;
  let current = iter;
  let length = Math.ceil(iter.length / chunkLength);
  while (index < length) {
    yield current.subarray(
      index * chunkLength,
      index * chunkLength + chunkLength,
    );
    index++;
  }
}

function uint16ToBytes(n) {
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);
  view.setUint16(0, n, false);

  return new Uint8Array(buffer);
}

let deviceInfo = HID.devices().find(
  (device) => device.product == "Nano S Plus",
);
let device = new HID.HID(
  deviceInfo.vendorId,
  deviceInfo.productId,
  deviceInfo.serialNumber,
);
device.on("data", (data) => {
  onData.emit("data", data);
});

for (const message of messages) {
  const response = await exchange(message) 
  console.log(Buffer.from(response).toString("hex"));
}
await device.close();
