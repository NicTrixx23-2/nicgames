const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, name }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], hostId: socket.id, confirmed: 0, votes: {}, votingActive: false };
    }
    rooms[roomId].players.push({ id: socket.id, name, isImpostor: false });
    socket.join(roomId);
    io.to(roomId).emit("playerList", {
      names: rooms[roomId].players.map(p => p.name),
      hostId: rooms[roomId].hostId
    });
  });

  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
const words = [
  "Affe", "Algorithmus", "Angst", "Ananas", "Apfel", "Architekt", "Astronaut", "Autor", "Auto",
  "Bäcker", "Bahn", "Balkon", "Ball", "Banane", "Bär", "Baum", "Berg", "Bett", "Bildschirm",
  "Birne", "Blitz", "Blume", "Blumenkohl", "Bleistift", "Boot", "Bonbon", "Bohne", "Brot", "Brötchen",
  "Brokkoli", "Buch", "Burger", "Bus", "Chemiker", "Chef", "Cola", "Computer", "Dachboden", "Datenbank",
  "Designer", "Detektiv", "Dichter", "Dorf", "Dreieck", "Drucker", "Eier", "Einstein", "Ei", "Einhorn",
  "Eis", "Elefant", "Erbse", "Erde", "Erinnerung", "Essig", "Eule", "Evolution", "Fähre", "Fahrrad",
  "Fernseher", "Feuer", "Feuerwehr", "Fisch", "Flasche", "Fleisch", "Flugzeug", "Fluss", "Friseur", "Freiheit",
  "Frosch", "Gabel", "Gans", "Gärtner", "Geduld", "Geheimnis", "Gerechtigkeit", "Gericht", "Glas", "Gold",
  "Gott", "Gras", "Gummi", "Gurke", "Hahn", "Handy", "Haus", "Heft", "Himmel", "Hoffnung",
  "Holz", "Hund", "Hypothese", "Idee", "Insel", "Ironie", "Jäger", "Journalist", "Kabel", "Kaffee",
  "Karotte", "Kartoffel", "Karte", "Karteikarte", "Kamera", "Kellner", "Keks", "Keller", "Kiwi", "Kino",
  "Kleber", "Koch", "Kompass", "Korn", "Krokodil", "Kuchen", "Kuh", "Kuli", "Kupfer", "Lampe",
  "Laptop", "Laser", "Lautsprecher", "Lehrer", "Licht", "Linsen", "Lineal", "Löwe", "Luft", "Magnet",
  "Mais", "Maler", "Marker", "Maus", "Mechaniker", "Meer", "Mehl", "Melone", "Metall", "Metapher",
  "Mikroskop", "Milch", "Mikrofon", "Molekül", "Mond", "Motorrad", "Müll", "Mund", "Mut", "Natur",
  "Neuron", "Nudel", "Obst", "Orange", "Oxidation", "Papier", "Paprika", "Paradoxon", "Park", "Pfeffer",
  "Philosophie", "Pilot", "Pizza", "Physiker", "Pinguin", "Plastik", "Planet", "Polizei", "Pommes", "Pony",
  "Programmierer", "Radiergummi", "Radieschen", "Rakete", "Radio", "Regen", "Reis", "Reise", "Restaurant", "Roboter",
  "Roller", "Salat", "Salz", "Sänger", "Schauspieler", "Schere", "Schiff", "Schlange", "Schloss", "Schmetterling",
  "Schnee", "Schokolade", "Schreiner", "Schule", "Schüler", "Schuh", "Schrank", "See", "Seide", "Seife",
  "Sessel", "Silber", "Sofa", "Soldat", "Sonne", "Spiegel", "Spinat", "Sportler", "Sprache", "Spuk",
  "Stadt", "Starkstrom", "Stecker", "Stein", "Stern", "Stift", "Stoff", "Stromkreis", "Stuhl", "Sturm",
  "Substanz", "Suppe", "Symmetrie", "Tänzer", "Tal", "Tasse", "Tastatur", "Tee", "Technik", "Telefon",
  "Teleskop", "Thermodynamik", "Tiger", "Tisch", "Tomate", "Toaster", "Torte", "Traube", "Traum", "Traktor",
  "Tür", "Uhr", "Verkäufer", "Vertrauen", "Vogel", "Vulkan", "Wald", "Wasser", "Wecker", "Wein",
  "Welt", "Wind", "Wiese", "Wolke", "Wolle", "Wort", "Wurst", "Zahnarzt", "Zebra", "Zeit",
  "Zettel", "Ziel", "Zimmer", "Zinn", "Zitrone", "Zug", "Zucker", "Zufall", "Zunge", "Zwiebel"
];

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
    const irregulars = [
    3, 5, 7, 9,
    ];
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
      if (room.players == irregulars) {
      majority - 0.5;
      };
      const result = Object.entries(voteCounts).find(([name, count]) => count >= majority);
      if (result) {
        const votedOut = result[0];
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
      room.players = room.players.filter(p => p.id !== socket.id);
      room.confirmed = 0;
      if (room.players.length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit("playerList", {
          names: room.players.map(p => p.name),
          hostId: room.hostId
        });
      }
    }
  });
});

/*socket.on("host-change", () => {
  
})*/

http.listen(PORT, () => console.log("Server läuft auf Port", PORT));
