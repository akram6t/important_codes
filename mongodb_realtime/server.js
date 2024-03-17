const express = require('express');
const app = express();
const http = require('http');
const PORT = 5000;
const server = http.createServer(app);
const cors = require('cors');
const bodyParser = require('body-parser');

const corsOptions = {
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'UPDATE']
}

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Middleware to parse URL-encoded requests
app.use(bodyParser.urlencoded({ extended: false }));

server.listen(PORT, () => {
    console.log(`Server is Running in PORT: ${PORT}`);
});

function Server(){    
    return { app, server };
}

module.exports = Server;