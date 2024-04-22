import "./style.css";
import javascriptLogo from "./javascript.svg";
import viteLogo from "/vite.svg";
// import { Buffer } from "buffer";
import * as secp from "@noble/secp256k1";
import Btc from "@ledgerhq/hw-app-btc";
import _ from "lodash";
import varuint from "varuint-bitcoin";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import bitcoinMessage from "bitcoinjs-message";
import { bech32 } from "@scure/base";
const RELAYERS = ["http://localhost:3000/"];
// https://github.com/bitcoin/bitcoin/blob/a85e5a7c9ab75209bc88e49be6991ba0a467034e/src/util/message.cpp#L24
const MESSAGE_MAGIC = Buffer.from("Bitcoin Signed Message:\n");

async function loadAddress(e) {
  e.preventDefault();
  try {
    const transport = await TransportWebHID.create();
    const btc = new Btc({ transport });
    const { bitcoinAddress } = await btc.getWalletPublicKey("84'/0'/0'/0/0", {
      format: "bech32",
    });
    transport.close();
    document.getElementById("bitcoin-1-address").value = bitcoinAddress;
    const utxos = loadUtxos();
  } catch (e) {
    if (e.message) {
      alert(e.message);
    }
  }
}

async function loadUtxos() {
  const address = document.querySelector("#bitcoin-1-address").value;
  const utxos = await (
    await fetch(`https://mempool.space/api/address/${address}/utxo`)
  ).json();
  document.getElementById("message").value = messageToSign(utxos);
  showTotalValue(utxos);
  // console.log(document.querySelector('#bitcoin-1-address').value)
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

async function signMessage(e) {
  e.preventDefault();
  const bitcoinAddress = document.querySelector("#bitcoin-1-address").value;
  try {
    const transport = await TransportWebHID.create();
    const message = document.getElementById("message").value;
    const btc = new Btc({ transport });
    const result = await btc.signMessage(
      "84'/0'/0'/0/0",
      Buffer.from(message).toString("hex"),
    );
    transport.close();
    var v = result["v"] + 27 + 4;
    console.log(bitcoinAddress)
    console.log(result)
    var signature = Buffer.from(
      v.toString(16) + result["r"] + result["s"],
      "hex",
    ).toString("base64");

    document.getElementById("signature").value = signature;
    console.log(`x${message}x`)
    console.log(
      bitcoinMessage.verify(message, bitcoinAddress, signature, null, true),
    );
  } catch (e) {
    if (e.message) {
      alert(e.message);
    }
  }
}
async function getTransport() {
  try {
    return await TransportWebHID.request();
  } catch (e) {
    if (e.statusCode == 27013) {
      alert("Signing was cancelled");
    } else {
      alert(e);
    }
  }
  /*if(window.transport) {
    return window.transport
  }

  window.transport = await TransportWebHID.request(); 
  return window.transport*/
}
function messageToSign(utxos) {
  return [
    "Action: Upgrade",
    "Chain ID: 203",
    "Inputs:",
    ...utxos.map(({ txid, vout }) => [txid, vout].join("")),
  ].join("\n");
}

function showTotalValue(utxos) {
  const value = totalValue(utxos);
  document.querySelector("#total-value").innerText =
    `You have ${value / 100000000} BTC to migrate to Bitcoin 2.0`;
  document.querySelector("#total-value").classList.remove("d-none");
}

function migrate(e) {
  const TRANSFER_BY_MESSAGE = 0x00;
  e.preventDefault();
  console.log(
    [TRANSFER_BY_MESSAGE],
    Buffer.from(document.getElementById("message").value),
    Buffer.from(document.getElementById("signature").value, "base64"),
  );
  const body = Buffer.concat([
    Buffer.from([TRANSFER_BY_MESSAGE]),
    Buffer.from(document.getElementById("message").value),
    Buffer.from(document.getElementById("signature").value, "base64"),
  ]);
  console.log(body.toString("hex"));
  fetch(_.sample(RELAYERS), {
    mode: "no-cors",
    method: "POST",
    body,
  });
}

const totalValue = (utxos) => _.sumBy(utxos, "value");

console
  .log
  // showTotalValue(
  //   [
  //     {
  //         "txid": "49168ebc826a82cc84c0139660d9bafb919a6a51d2f01bf31629896061e394d0",
  //         "vout": 0,
  //         "status": {
  //             "confirmed": true,
  //             "block_height": 834695,
  //             "block_hash": "000000000000000000003b869494f4d6e7de0436d5ecd1b9e897728cdf5ca940",
  //             "block_time": 1710440752
  //         },
  //         "value": 136265
  //     }
  // ]
  // )
  ();
document
  .querySelector("#load-bitcoin-address")
  .addEventListener("click", loadAddress);
document
  .querySelector("#sign-with-ledger")
  .addEventListener("click", signMessage);
document
  .querySelector("#bitcoin-1-address")
  .addEventListener("change", loadUtxos);
document.getElementById("migrate").addEventListener("click", migrate);

// document.querySelector('#app').innerHTML = `

//   <div>
//     <a href="https://vitejs.dev" target="_blank">
//       <img src="${viteLogo}" class="logo" alt="Vite logo" />
//     </a>
//     <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
//       <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
//     </a>
//     <h1>Hello Vite!</h1>
//     <div class="card">
//       <button id="counter" type="button">Unlock</button>
//     </div>
//     <p class="read-the-docs">
//       Click on the Vite logo to learn more
//     </p>
//   </div>
// `

// setupCounter(document.querySelector('#counter'))
