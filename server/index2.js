const { Server } = require("socket.io");

const io = new Server(8000, {
  cors: true,
});

const emailToSocketIDMap = new Map();
const socketIDToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log("socket connected " + socket.id);

  socket.on("room:join", (data) => {
    const { username, room } = data;
    console.log(`Room Joined ${username} ${room}`);
    emailToSocketIDMap.set(username, socket.id);
    socketIDToEmailMap.set(socket.id, username);
    io.to(room).emit("user:joined", { username, id: socket.id });
    socket.join(room);
    socket.emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    console.log("user:call", { to, offer });
    io.to(to).emit("incoming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, answer }) => {
    console.log("call:accepted", { to, answer });
    io.to(to).emit("call:accepted", { from: socket.id, answer });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", { to, offer });
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, answer }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, answer });
  });
});
