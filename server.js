const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let rooms = {};

function getAllLobbies() {
  return Object.entries(rooms).map(([roomId, room]) => ({
    roomId,
    name: room.name || "Lobby",
    playerCount: room.players.length
  }));
}

io.on("connection", (socket) => {
  socket.on("getLobbies", () => {
    socket.emit("lobbyList", getAllLobbies());
  });

  socket.on("createRoom", ({ roomId, name }) => {
    rooms[roomId] = {
      players: [],
      hostId: socket.id,
      confirmed: 0,
      votes: {},
      votingActive: false,
      name: "Lobby"
    };
    socket.emit("roomCreated", roomId);
  });

  socket.on("joinRoom", ({ roomId, name }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].players.push({ id: socket.id, name, isImpostor: false });
    socket.join(roomId);

    io.to(roomId).emit("playerList", {
      names: rooms[roomId].players.map(p => p.name),
      hostId: rooms[roomId].hostId,
      groupName: rooms[roomId].name
    });

    io.emit("lobbyList", getAllLobbies());
  });

  socket.on("changeGroupName", ({ roomId, newName }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].name = newName;
    io.to(roomId).emit("updateGroupName", newName);
    io.emit("lobbyList", getAllLobbies());
  });

  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    const words = [ /* Wortliste wie oben, hier aus Platzgründen abgekürzt */ "Apfel", "Blume", "Zug", "Pizza", "Rakete", "Wald", "Luft", "Elefant", "Tisch", "Kaffee", "Programmierer", "Zitrone" ];
    const word = words[Math.floor(Math.random() * words.length)];
    const impostorIndex = Math.floor(Math.random() * room.players.length);

    room.confirmed = 0;
    room.votes = {};
    room.votingActive = false;

    room.players.forEach((player, i) => {
      const role = i === impostorIndex ? "impostor" : word;
      player.isImpostor = i === impostorIndex;
      io.to(player.id).emit("assignRole", { role, word });
    });
  });

  socket.on("confirmedWord", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.confirmed++;
    if (room.confirmed === room.players.length) {
      io.to(roomId).emit("startTimer", 10);
    }
  });

  socket.on("chatMessage", ({ roomId, message }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      io.to(roomId).emit("chatMessage", { name: player.name, message });
    }
  });

  socket.on("beginVoting", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.votes = {};
    room.votingActive = true;

    io.to(roomId).emit("showVoting", { names: room.players.map(p => p.name) });

    setTimeout(() => {
      const voteCounts = {};
      Object.values(room.votes).forEach(vote => {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      });

      const majority = Math.floor(room.players.length / 2) + 1;
      const result = Object.entries(voteCounts).find(([_, count]) => count >= majority);

      if (result) {
        const [votedOut] = result;
        const votedPlayer = room.players.find(p => p.name === votedOut);
        io.to(roomId).emit("voteResult", {
          votedOut,
          isImpostor: votedPlayer ? votedPlayer.isImpostor : false
        });
      } else {
        io.to(roomId).emit("voteResult", {
          votedOut: "Niemand",
          isImpostor: false
        });
      }

      room.votingActive = false;
    }, 15000);
  });

  socket.on("vote", ({ roomId, votedFor }) => {
    const room = rooms[roomId];
    if (!room || !room.votingActive) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player && !room.votes[player.name]) {
      room.votes[player.name] = votedFor;
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room) continue;

      const wasHost = socket.id === room.hostId;

      room.players = room.players.filter(p => p.id !== socket.id);
      room.confirmed = 0;

      if (room.players.length === 0) {
        delete rooms[roomId];
      } else {
        // Host-Neuzuweisung
        if (wasHost) {
          room.hostId = room.players[0]?.id || null;
        }

        io.to(roomId).emit("playerList", {
          names: room.players.map(p => p.name),
          hostId: room.hostId,
          groupName: room.name
        });
      }
    }

    io.emit("lobbyList", getAllLobbies());
  });
});

http.listen(PORT, () => console.log("✅ Server läuft auf Port", PORT));
