const socket = io();
let currentRoom = null;
let playerName = "";
let isHost = false;

const menu = document.getElementById("menu");
const lobbyList = document.getElementById("lobbyList");
const refreshBtn = document.getElementById("refreshBtn");
const createForm = document.getElementById("createForm");
const joinForm = document.getElementById("joinForm");
const gameDiv = document.getElementById("game");
const groupNameEl = document.getElementById("groupName");
const editGroupSpan = document.getElementById("editGroup");
const groupNameInput = document.getElementById("groupNameInput");
const playersDiv = document.getElementById("players");
const startBtn = document.getElementById("startBtn");
const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const votingBox = document.getElementById("votingBox");
const leaveBtn = document.getElementById("leaveBtn");

function showMenu() {
  menu.style.display = "block";
  gameDiv.style.display = "none";
  socket.emit("getRooms");
}

function showGame() {
  menu.style.display = "none";
  gameDiv.style.display = "block";
}

refreshBtn.onclick = () => socket.emit("getRooms");

socket.on("roomsList", list => {
  lobbyList.innerHTML = "";
  list.forEach(r => {
    const el = document.createElement("div");
    el.textContent = `${r.groupName} (${r.playerCount})${r.hasPassword?" 🔒":""}`;
    el.className = "lobbyEntry";
    el.onclick = () => {
      const name = prompt("Dein Name:");
      const pwd = r.hasPassword ? prompt("Passwort:") : "";
      playerName = name || "";
      currentRoom = r.roomId;
      socket.emit("joinRoom", { roomId: r.roomId, name, password: pwd });
    };
    lobbyList.appendChild(el);
  });
});

createForm.onsubmit = e => {
  e.preventDefault();
  socket.emit("createRoom", {
    roomId: createForm.createRoomId.value,
    groupName: createForm.createGroupName.value,
    password: createForm.createPassword.value
  });
};

socket.on("createRoomResult", r => {
  if (!r.success) alert(r.message);
  else showMenu();
});

joinForm.onsubmit = e => {
  e.preventDefault();
  playerName = joinForm.joinName.value;
  currentRoom = joinForm.joinRoomId.value;
  socket.emit("joinRoom", {
    roomId: currentRoom,
    name: playerName,
    password: joinForm.joinPassword.value
  });
};

socket.on("joinRoomResult", r => {
  if (!r.success) alert(r.message);
  else showGame();
});

socket.on("playerList", ({ players, hostId, groupName }) => {
  isHost = socket.id === hostId;
  groupNameEl.textContent = groupName;
  editGroupSpan.style.display = isHost ? "inline" : "none";
  playersDiv.innerText = "Spieler: " + players.map(p => p.name).join(", ");
  startBtn.style.display = isHost ? "inline-block" : "none";
});

groupNameInput.onkeypress = e => {
  if (e.key === "Enter") {
    const newName = groupNameInput.value.trim();
    if (newName) socket.emit("renameGroup", { roomId: currentRoom, newName });
  }
};

socket.on("groupRenamed", newName => {
  groupNameEl.textContent = newName;
});

startBtn.onclick = () => socket.emit("startGame", currentRoom);

chatForm.onsubmit = e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (msg) socket.emit("chatMessage", { roomId: currentRoom, message: msg });
  chatInput.value = "";
};

socket.on("chatMessage", ({ name, message }) => {
  const d = document.createElement("div");
  d.innerHTML = `<strong>${name}:</strong> ${message}`;
  chatBox.appendChild(d);
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("showVoting", ({ names }) => {
  votingBox.innerHTML = "<h3>Stimme ab:</h3>";
  names.forEach(n => {
    const b = document.createElement("button");
    b.textContent = n;
    b.onclick = () => {
      socket.emit("vote", { roomId: currentRoom, votedFor: n });
      votingBox.innerText = `Du hast für ${n} abgestimmt.`;
    };
    votingBox.appendChild(b);
  });
});

socket.on("voteResult", ({ votedOut, isImpostor }) => {
  votingBox.innerHTML = `<strong>${votedOut} wurde rausgewählt.</strong><br>` +
    (votedOut === "Niemand" ? "Keine Mehrheit." : (isImpostor ? "Er war der Impostor!" : "Er war unschuldig."));
});

leaveBtn.onclick = () => {
  socket.emit("leaveRoom", currentRoom);
  currentRoom = null;
  showMenu();
};

window.addEventListener("beforeunload", () => {
  if (currentRoom) socket.emit("leaveRoom", currentRoom);
});

showMenu();
