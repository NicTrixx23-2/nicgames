const socket = io();
let currentRoom = "";
let isHost = false;
let players = [];
let hasVoted = false;

document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  const room = document.getElementById("roomInput").value.trim();
  if (!name || !room) return alert("Bitte Name und Raumcode eingeben.");
  localStorage.setItem("name", name);
  localStorage.setItem("room", room);
  connectSocketAndJoinRoom(name, room);
});

function connectSocketAndJoinRoom(name, room) {
  if (typeof socket.disconnected === "boolean" && socket.disconnected) {
    socket.connect();
  }
  currentRoom = room;
  socket.emit("joinRoom", { name, roomId: room });
  document.getElementById("join").style.display = "none";
  document.getElementById("game").style.display = "block";
}

document.getElementById("leaveBtn").addEventListener("click", () => {
  socket.emit("leaveRoom", currentRoom);
  socket.disconnect();
  localStorage.removeItem("name");
  localStorage.removeItem("room");
  location.reload();
});

socket.on("playerList", ({ names, hostId }) => {
  players = names;
  const list = document.getElementById("playerList");
  list.innerHTML = names.map(n => `<li>${n}</li>`).join("");
  isHost = socket.id === hostId;
  document.getElementById("startBtn").style.display = isHost ? "inline-block" : "none";
  document.getElementById("beginVoting").style.display = isHost ? "inline-block" : "none";
});

document.getElementById("startBtn").addEventListener("click", () => {
  socket.emit("startGame", currentRoom);
});

socket.on("assignRole", ({ role, word }) => {
  document.getElementById("game").style.display = "none";
  document.getElementById("cardContainer").style.display = "block";
  const wordDiv = document.getElementById("word");
  wordDiv.innerText = role === "impostor" ? "Du bist der IMPOSTOR!" : `Dein Wort: ${word}`;
  wordDiv.style = "";
  document.getElementById("confirmBtn").style.display = "inline-block";
  document.getElementById("cover").style.left = "0";
  document.getElementById("slider").value = 0;
  hasVoted = false;
});

document.getElementById("confirmBtn").addEventListener("click", () => {
  socket.emit("confirmedWord", currentRoom);
  document.getElementById("confirmBtn").style.display = "none";
  const wordDiv = document.getElementById("word");
  wordDiv.style.position = "absolute";
  wordDiv.style.top = "10px";
  wordDiv.style.right = "10px";
  wordDiv.style.fontSize = "1.2em";
});

socket.on("startTimer", (seconds) => {
  document.getElementById("cardContainer").style.display = "none";
  document.getElementById("timer").style.display = "block";
  document.getElementById("chatContainer").style.display = "block";
  const countdownEl = document.getElementById("countdown");
  countdownEl.innerText = seconds;

  let timeLeft = seconds;
  const interval = setInterval(() => {
    timeLeft--;
    countdownEl.innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(interval);
      document.getElementById("timer").style.display = "none";
    }
  }, 1000);
});

document.getElementById("sendBtn").addEventListener("click", () => {
  const msg = document.getElementById("chatInput").value.trim();
  if (msg) {
    socket.emit("chatMessage", { roomId: currentRoom, message: msg });
    document.getElementById("chatInput").value = "";
  }
});

socket.on("chatMessage", ({ name, message }) => {
  const box = document.getElementById("chatBox");
  box.innerHTML += `<div><strong>${name}:</strong> ${message}</div>`;
  box.scrollTop = box.scrollHeight;
});

document.getElementById("beginVoting").addEventListener("click", () => {
  socket.emit("beginVoting", currentRoom);
});

socket.on("showVoting", ({ names }) => {
  const voting = document.getElementById("voting");
  const buttons = document.getElementById("voteButtons");
  voting.style.display = "block";
  buttons.innerHTML = "";
  names.forEach(name => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.onclick = () => {
      if (hasVoted) return;
      hasVoted = true;
      socket.emit("vote", { roomId: currentRoom, votedFor: name });
      voting.innerHTML = `<p>Du hast für <strong>${name}</strong> gestimmt.</p>`;
    };
    buttons.appendChild(btn);
  });
});

socket.on("voteResult", ({ votedOut, isImpostor }) => {
  document.getElementById("voting").style.display = "none";
  document.getElementById("voteSummary").style.display = "block";
  document.getElementById("voteSummary").innerHTML =
    `<h2>${votedOut} wurde gewählt.<br>${votedOut === "Niemand" ? "Keine Mehrheit erreicht." : isImpostor ? "✅ Impostor enttarnt!" : "❌ Falsche Wahl – Impostor gewinnt!"}</h2>`;
});

document.getElementById("slider").addEventListener("input", (e) => {
  const val = (e.target.value / 100) * 300;
  document.getElementById("cover").style.left = `${val}px`;
});
document.getElementById("slider").addEventListener("mouseup", () => {
  document.getElementById("slider").value = 0;
  document.getElementById("cover").style.left = "0";
});

window.addEventListener("beforeunload", () => {
  socket.emit("leaveRoom", currentRoom);
  /*socket.emit("host-change");*/
  socket.disconnect();
  localStorage.removeItem("name");
  localStorage.removeItem("room");
});
