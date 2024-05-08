This backend is developed with Node.js,

Technologies
Programming Language > JavaScript https://www.w3schools.com/js/
Framework > Express JS https://expressjs.com/
Database > Mongo DB https://expressjs.com/
Authentication > Jwt.io
Stream.io (For Backend) > Realtime Video and Audio call https://getstream.io/chat/docs/node/?language=javascript
Cloud Storage > AWS S3 Bucket https://expressjs.com/
Realtime Communication > Socket.io https://socket.io/

To use the video call, an account has to be created on getstream.io, an api key will be generated, copy the api key and replace it with the one in the code when the developer open .env file.

To connect database to the code, Developer need to create an account on MongoDB, get the necessary credentials and replace the APP_DB in the environment variable.

Media files are to be connected to AWS S3 Bucket, in route folders like user, post, reels group messages. developer needs to create an account on this cloud service, get the credentials and replace it with the one in the files I mentioned above.

All other technologies including their version and libraries can be found in the package.json file.

After cloning the code from github, on you terminal on vscode, run "npm install" to install all libraries and dependencies.

To start the app, on your terminal, run "npm start"

Developer should know about Node, Express, MongoDB(mongoose) and get-stream very well.

HAPPY CODING (-o)
