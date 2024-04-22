import hashlib
import base64
import ledger_bitcoin
from ledger_bitcoin import WalletPolicy, MultisigWallet, AddressType, Chain
from ledger_bitcoin.exception.errors import DenyError, NotSupportedError, SecurityStatusNotSatisfiedError
from ledger_bitcoin.key import KeyOriginInfo
from ledgercomm.interfaces.hid_device import HID

# legacy imports
# note: we could replace "btchip" with "ledger_bitcoin.btchip" but the latter does not support HW.1
import hid
from btchip.btchipComm import HIDDongleHIDAPI
from btchip.btchip import btchip
from btchip.btchipUtils import compress_public_key
from btchip.bitcoinTransaction import bitcoinTransaction
from btchip.btchipException import BTChipException

path = "DevSrvsID:4294970371"
hid_device = HID()
hid_device.path = path.encode('utf-8')
hid_device.open()
transport = ledger_bitcoin.TransportClient('hid', hid=hid_device)
client = ledger_bitcoin.client.NewClient(transport, Chain.MAIN, debug=True)
message = "hello world".encode('utf8')
message_hash = hashlib.sha256(message).hexdigest().upper()

result = b''
try:
    result = base64.b64decode(client.sign_message(message, "84'/0'/0'/0/0"))
except DenyError:
    pass  # cancelled by user
print(base64.b64encode(result))