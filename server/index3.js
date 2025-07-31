const { Server } = require("socket.io");

const io = new Server(8000, {
  cors: true,
});

const rooms = new Map(); // Store room information
const socketToRoom = new Map(); // Map socket IDs to room names

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("room:join", (data) => {
    const { username, room } = data;

    // Initialize room if it doesn't exist
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }

    const roomUsers = rooms.get(room);

    // Check if room is full (max 8 users)
    if (roomUsers.size >= 8) {
      socket.emit("room:full");
      return;
    }

    // Add user to room
    roomUsers.add(socket.id);
    socketToRoom.set(socket.id, room);

    // Join socket.io room
    socket.join(room);

    // Notify existing users about the new user
    socket.to(room).emit("user:joined", { username, id: socket.id });

    // Send existing users to the new user
    const existingUsers = Array.from(roomUsers)
      .filter((id) => id !== socket.id)
      .map((id) => ({
        id,
        username: socketToRoom.get(id),
      }));

    socket.emit("room:join", { ...data, existingUsers });
  });

  socket.on("user:call", ({ to, offer }) => {
    socket.to(to).emit("incoming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, answer }) => {
    socket.to(to).emit("call:accepted", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    socket.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    socket.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, answer }) => {
    socket.to(to).emit("peer:nego:final", { from: socket.id, answer });
  });

  socket.on("disconnect", () => {
    const room = socketToRoom.get(socket.id);
    if (room) {
      const roomUsers = rooms.get(room);
      roomUsers.delete(socket.id);

      // Clean up room if empty
      if (roomUsers.size === 0) {
        rooms.delete(room);
      }

      socketToRoom.delete(socket.id);

      // Notify other users about departure
      socket.to(room).emit("user:left", socket.id);
    }
  });
});
