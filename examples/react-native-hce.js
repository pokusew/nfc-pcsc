/** 
 * this is a simple example on how to use this library with react-native-hce
 * tested with an acr122
 */

const { NFC } = require('nfc-pcsc');

// relay log messages to the console
const logger = {
  info: console.info,
  debug: console.debug,
  warn: console.warn,
  error: console.error
}

const nfc = new NFC(logger);

nfc.on('reader', async reader => {
  console.log(`${reader.reader.name}  device attached`);

  // reset reader.aid
  delete reader.aid; 
  
  // disable auto processing
  reader.autoProcessing = true;

  //this is a fixed value in react-native-hce (at least for now)
  //it won't work with another aid
  reader.aid = 'D2760000850101';
  
  reader.on('card', async (card) => {
    console.log(`${reader.reader.name}  card inserted`, card);
	
    //it seems that the default data readed from simulated card is always empty
    //const data = card.data.toString('utf8');
    //console.log('data');
	
    //get data length if you want to read exact byte length;
    //packet = Buffer.from([0x00, 0xB0, 0x00, 0x00, 0x02]);
	
    //..or read data (first 256 bytes)
    const packet = Buffer.from([0x00, 0xB0, 0x00, 0x00, 0xff]);
    console.log(packet);
    try {
      const response = await reader.transmit(packet, 255);
      console.log(response);

      //slice the response to get only the data without headers and response codes
      const data = response.slice(9, response.length-2);
      console.log(data.toString('utf8'))

    } catch (e) {
      console.log('ERROR');
      console.log(e);
    }

  });

  reader.on('status', status => {
    console.log(status);
  })

  reader.on('card.off', card => {
    console.log(`${reader.reader.name}  card removed`);
  });

  reader.on('error', err => {
    console.log(`${reader.reader.name}  an error occurred`, err);
    console.log(err);
  });

  reader.on('end', () => {
    console.log(`${reader.reader.name}  device removed`);
  });

});

nfc.on('error', err => {
  console.log('an error occurred', err);
});