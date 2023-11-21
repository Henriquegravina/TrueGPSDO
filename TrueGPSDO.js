// An interface to control and monitor the Trueposition GPSDO module
// Author: Henrique B. Gravina 

//Config
var debug = true // Console debug ouput
var serial_device = '/dev/ttyUSB0' // Serial port where module is connected


// GPIO:
var rpio = require('rpio'); // Raspberry pi GPIO 
LED = 16  // GPIO pin LED
LED2 = 18 // GPIO pin LED2
 
rpio.open(LED, rpio.OUTPUT, rpio.LOW);  //Set LED  pin as output
rpio.open(LED2, rpio.OUTPUT, rpio.LOW); //Set LED2 pin as output
  

// Serial port connection:
const { SerialPort, ReadlineParser } = require('serialport')
const port = new SerialPort({path: serial_device, baudRate: 9600 })


const parser = new ReadlineParser()


port.write('$PROCEED\r\n')



port.pipe(parser)
parser.on('data', truposition_decoder)




function truposition_decoder(data_in){

  
  // $CLOCK","$STATUS","$SAT","$GETPOS","$SURVEY","$GETVER"
  switch(data_in.substring(0, data_in.indexOf(' '))){

    // $STATUS Message:
    case "$STATUS":

      status_array = data_in.split(" ")

      status_10mhz = status_array[1]; // 0 = good, 1 = bad
      status_pps   = status_array[2]; // 0 = good (within 25ns), 1 = bad
      status_ant   = status_array[3]; // 0 = good, 1 = bad
      status_hold  = status_array[4]; // number of seconds in holdover ( 0 not holdover )
      status_nsat  = status_array[5]; // number of satellites


      if(status_10mhz == 0 ){
	      rpio.write(LED, rpio.HIGH); //Turn LED on
	      if(debug == true){console.log("10mhz is GOOD!")}
      }else{
              if(debug == true){console.log("10mhz is BAD!")}
              rpio.write(LED, rpio.LOW); //Turn LED off
      }
      
      if(debug == true){console.log("There are %d Sats in use",status_nsat)}
      break;

      // $EXTSTATUS
      case "$EXTSTATUS":
      
        extstatus_array = data_in.split(" ")

        extstatus_survey = extstatus_array[1]; // 0 = normal, 1 = surveying
        extstatus_nsats  = extstatus_array[2]; // Number of sats (different than, but within 2 of $STATUS, perhaps only counts channels 0-9, range is 0-10)
        extstatus_dop    = extstatus_array[3]; // DOP (maybe TDOP?)
        extstatus_temp   = extstatus_array[4]; // temperature
        extstatus_5   = extstatus_array[5]; // unknow

        if(extstatus_survey == 0 ){
          if(debug == true) { console.log("Satus is Normal!") }
          
          rpio.write(LED2, rpio.HIGH); //Turn LED on
      
        }else{
          if(debug == true) { console.log("Satus is Surveying")}
          
          rpio.write(LED2, rpio.LOW); //Turn LED off
        }

         if(debug == true) {console.log("There are %d Sats in view",extstatus_nsats)}
         if(debug == true) {console.log("The temperature is %f degree",extstatus_temp)}

         break;

      // $CLOCK
      case "$CLOCK":
      
        clock_array = data_in.split(" ")

        clock_gpsepoch = clock_array[1] // GPS Epoch time
        clock_leapsec  = clock_array[2] // Count of leap-seconds
        clock_merit    = clock_array[3] // Time figure-of-merit (1=good, 7=bad)
        
        // Unix Time = GPSEpoch + LeapSeconds + 10 years 
        unixTime = parseInt(clock_gpsepoch) + parseInt(clock_leapsec) + 315964800;

        clock_unixepoch = unixTime;

        if(debug == true){ console.log("Unix-Time:"+clock_unixepoch)}

        break;


      default:
        console.log(data_in)
        break;
    


  }

}