const socketio = require('socket.io')(3000,
    {
        cors: {
            origin: '*',
        }
    });

socketio.on('connection', (socket, rawData) => {
    console.log('a user connected');
    socket.emit('A new user connected', socket.id)
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('chat-message', (msg, room) => { 
        console.log('Received chat message:', msg);  
        socket.broadcast.emit('chat-message-server', msg);
    });
    
    socket.on('public-key-exchange', (nameAndPublickey) => {
        console.log('UserName is : ' + JSON.stringify(nameAndPublickey));
        socket.broadcast.emit('remote-public-key', nameAndPublickey);
    });
});

