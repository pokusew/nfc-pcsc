"use strict";

// #############
// example not finished, it in progress !!!
// Read NDEF formatted data
// #############

import { NFC, TAG_ISO_14443_3, TAG_ISO_14443_4, KEY_TYPE_A, KEY_TYPE_B, CONNECT_MODE_DIRECT } from '../src/index';
import pretty from './pretty';
import Rx from 'rxjs';
// import chromeNdef from '../src/chromenfcNDEF'
// console.log(chromeNdef)

import ndef from '@taptrack/ndef'; // ndef formater
import { endianness }  from 'endianness'; // MSB first converter*
let isLittleEndian = ((new Uint32Array((new Uint8Array([1,2,3,4])).buffer))[0] === 0x04030201);

import nfcTag from './nfc-parser';

// minilogger for debugging
function log() {
	console.log(...arguments);
}

const minilogger = {
	log: log,
	debug: log,
	info: log,
	warn: log,
	error: log
};

const nfc = new NFC(); // const nfc = new NFC(minilogger); // optionally you can pass logger to see internal debug logs

const DEBUG = true;

const currentAction = 'READ_CARD_MESSAGE';
class NfcReaderService {
  reader = 'test';

  init() {
    // Source
    const onReader$ = Rx.Observable.fromEvent(nfc, 'reader')

    // Events as Observables
    const onCard$ = onReader$.switchMap(readerEvent => Rx.Observable.fromEvent(readerEvent, 'card'));
    const onCardOff$ = onReader$.switchMap(readerEvent => Rx.Observable.fromEvent(readerEvent, 'card.off'));
    const onReaderEnd$ = onReader$.switchMap(readerEvent => Rx.Observable.fromEvent(readerEvent, 'end'));
    const onReaderStatus$ = onReader$.switchMap(readerEvent => Rx.Observable.fromEvent(readerEvent, 'status'));
    const onError$ = onReader$.switchMap(readerEvent => Rx.Observable.fromEvent(readerEvent, 'error'));

    // Subscribes
    const onReader = onReader$.subscribe(reader => {
      // Declare the reader object for our class
      this.reader = reader;
      if (DEBUG) { pretty.info(`device attached`, { reader: this.reader.name }); }
    });
    const onReaderStatus = onReaderStatus$.subscribe(readerStatus => {
      if (DEBUG) { pretty.info(`Reader status`, { readerStatus: readerStatus }); }
    });
    const onReaderEnd = onReaderEnd$.subscribe(readerEnd => {
      if (DEBUG) { pretty.info(`device removed`, { reader: this.reader.name }); }
    });

    const onCard = onCard$.subscribe(async card => {
      if (DEBUG) { console.info(`Found qqqa card`, { card }); }
      
      nfcTag.parse(card.atr)

      // const action = this.actionManager.onCard();
      // action();

    });
    const onCardOff = onCardOff$.subscribe(cardOff => {
      if (DEBUG) { console.info(`The card has been removed`, { card }); }
    });

    const onError = onError$.subscribe(error => {
      if (DEBUG) { pretty.error(`an error occurred`, { error }); }
    });
  }

  // https://github.com/pokusew/nfc-pcsc/blob/master/src/Reader.js#L486
  async readCard(blockNumber, length, blockSize = 4, packetSize = 16) {
    var data = await this.reader.read(blockNumber, length); // await reader.read(4, 16, 16); for Mifare Classic cards
    if (DEBUG) { pretty.info(`data read - (`, currentAction, ')', { reader: this.reader.name, data }); }
  }
  // https://github.com/pokusew/nfc-pcsc/blob/master/src/Reader.js#L557
  async writeCard(blockNumber, data, blockSize = 4) {
    var data = await this.reader.write(blockNumber, length); // await reader.write(4, data, 16); for Mifare Classic cards
    if (DEBUG) { pretty.info(`data written`, { reader: this.reader.name, data }); }
  }

  actionManager = {
    onCard: () => {
      switch (currentAction) {
        case 'READ_CARD_MESSAGE':
          return this.readCard(3, 16);
          break;
        case 'READ_CARD_CONFIG':
          return this.readCard(4, 16);
          break;

        default:
          break;
      }
    }
  }
}
let service = new NfcReaderService();
service.init();
