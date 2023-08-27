const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Store active rooms and their data
const activeRooms = new Map();

app.use(express.static(__dirname + "/public"));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (roomId, fileId, userId) => {
    socket.join(roomId);
    socket.join(fileId);
    console.log(`User ${userId} joined room ${roomId} and file ${fileId}`);

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Map());
    }

    const roomData = activeRooms.get(roomId);

    if (!roomData.has(fileId)) {
      roomData.set(fileId, {
        text: "",
        cursors: new Map(),
      });
    }

    const fileData = roomData.get(fileId);

    fileData.cursors.set(socket.id, [0]); // Initialize with an array containing a single cursor at position 0

    socket.emit("initFile", fileData.text, Array.from(fileData.cursors));

    socket.to(fileId).emit("userJoined", userId);
  });

  // Handle multiple cursor positions
  socket.on("cursorChange", (roomId, fileId, newPositions) => {
    const roomData = activeRooms.get(roomId);
    if (!roomData) return;

    const fileData = roomData.get(fileId);
    if (!fileData) return;

    fileData.cursors.set(socket.id, newPositions); // New positions is an array

    socket.to(fileId).emit("cursorChanged", socket.id, newPositions); // Broadcast new positions array
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    activeRooms.forEach((roomData, roomId) => {
      roomData.forEach((fileData, fileId) => {
        if (fileData.cursors.has(socket.id)) {
          fileData.cursors.delete(socket.id);

          socket.to(fileId).emit("cursorLeft", socket.id);
        }
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
