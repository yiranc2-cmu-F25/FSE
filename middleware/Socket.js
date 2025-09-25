class Socket{
    constructor(io){
        this.io = io;
        this.setupEventHandlers();
        this.users = new Map();
    }

    setupEventHandlers(){
        this.io.on('connection', (socket) => {
            console.log('New client connected:', socket.id);

            socket.on('join', (username) => {
                this.users.set(socket.id, username);
                this.boradcastUserJoin(username);
                console.log(`${username} joined the chat.`);
                this.boradcastUserJoin(username);
                this.broadcastUserList();
            });

            socket.on('disconnect', () => {
                const username = this.users.get(socket.id);
                if(username){
                    this.users.delete(socket.id);
                    console.log('Client disconnected:', socket.id);
                    this.boradcastUserLeave(username);
                    this.broadcastUserList();
                }else{
                    console.log('Unknown client disconnected:', socket.id);
                }
            });
        });
    }
    
    boradcastMessage(message){
        this,io.emit('message', message);
    }

    boradcastUserJoin(username){
        this,io.emit('user_join', { username, timestamp: new Date() });
    }

    boradcastUserLeave(username){
        this,io.emit('user_leave', { username, timestamp: new Date() });
    }

    broadcastUserList(){
        const userList = Array.from(this.users.values());
        this.io.emit('user_list', userList);
    }

}

export default Socket;

