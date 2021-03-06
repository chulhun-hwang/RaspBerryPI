const http = require('http'), gpio = require('wiring-pi');
const fs = require('fs');
const socketio = require('socket.io');
const TRIG = 9, ECHO = 8;
const mysql = require('mysql');

var startTime, travelTime; // 초음파거리계산용
var index = 0, value = []; // 측정거리데이터 저장용
var timerid, timeout = 800; // 타이머제어용
var cnt = 1; // 타이머 제어용

const client = mysql.createConnection({
		  host: 'localhost',
		  port: 3306,
		  user: 'hooney',
		  password: 'hch',
		  database: 'sensor7'
});


const server = http.createServer(function(request, response) {
		  fs.readFile('view/web_so.html', 'utf8', function(error, data) {
			  		      response.writeHead(200, {
						      			            'Content-Type': 'text/html'
						      			          });
			  		      response.end(data);
			  		    });
}).listen(65001, function() {
		  gpio.wiringPiSetup();
		  gpio.pinMode(ECHO, gpio.INPUT);
		  gpio.pinMode(TRIG, gpio.OUTPUT);
		  console.log('Server running at http://IP주소:65001');
});
const io = socketio.listen(server);
io.sockets.on('connection', function(socket) {
		  socket.on('startmsg', function(data) {
			  		      console.log('가동메시지 수신(측정주기:%d)!', data);
			  		      timeout = data;
			  		      watchon(); // 타이머가동(초음파가동)
			  		    });
		  socket.on('stopmsg', function(data) {
			  		      console.log('중지메시자 수신!');
			  		      clearTimeout(timerid);
			  		    });
});

const watchon = () => {
		  gpio.digitalWrite(TRIG, gpio.LOW);
		  gpio.delayMicroseconds(2)
		  gpio.digitalWrite(TRIG, gpio.HIGH);
		  gpio.delayMicroseconds(20)
		  gpio.digitalWrite(TRIG, gpio.LOW);
		  while (gpio.digitalRead(ECHO) == gpio.LOW);
		  startTime = gpio.micros();
		  while (gpio.digitalRead(ECHO) == gpio.HIGH);
		  travelTime = gpio.micros() - startTime;
		  distance = travelTime / 58;
		  if (distance < 400) { // 센서는 400 cm 이내만 측정가능 함
			if (index < 500) {
				value[index++] = distance;
				console.log('근접거리: %d cm', value[index - 1]);
				io.sockets.emit('watch', value[index - 1]);

						if(distance < 10){
										      			            let stamptime = new Date();
										      			            client.query('INSERT INTO SHS VALUES(?,?)', [stamptime, distance], (err, result) => {
													 if (err) {
																						    							              console.log("DB저장 실패!");
																						    							              console.log(err);
																						    							            }
															    					            else console.log("DB저장 완료!");
															    					          });
										      				      io.sockets.emit('watch','DB 저장 완료!!');
										      			      }
						      			      }
			  			     
			  			  
			  			      } else index = 0;

		  timerid = setTimeout(watchon, timeout);
}
