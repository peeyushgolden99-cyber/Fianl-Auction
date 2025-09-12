const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 4000;

app.use(express.json());

const DATA_PATH = path.join(__dirname, 'src', 'data.js');

// Helper to read players from data.js
function getPlayers() {
  const data = fs.readFileSync(DATA_PATH, 'utf8');
  const match = data.match(/export const players = (\[.*?\]);/s);
  if (match) {
    return JSON.parse(match[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
  }
  return [];
}

// Helper to write players to data.js
function savePlayers(players) {
  const teams = [
    { id: 1, name: 'MI' },
    { id: 2, name: 'RCB' },
    { id: 3, name: 'CSK' },
    { id: 4, name: 'GT' },
    { id: 5, name: 'RR' },
    { id: 6, name: 'SRH' }
  ];
  const fileContent = `// Teams\nexport const teams = ${JSON.stringify(teams, null, 2)};\n\n// Players\nexport const players = ${JSON.stringify(players, null, 2)};\n`;
  fs.writeFileSync(DATA_PATH, fileContent, 'utf8');
}

// Get all players
app.get('/api/players', (req, res) => {
  res.json(getPlayers());
});

// Update a player
app.put('/api/players/:id', (req, res) => {
  const id = Number(req.params.id);
  const update = req.body;
  let players = getPlayers();
  players = players.map(p => p.id === id ? { ...p, ...update } : p);
  savePlayers(players);
  res.json({ success: true });
});

// Bulk update all players
app.put('/api/players', (req, res) => {
  const updates = req.body; // Array of player objects
  savePlayers(updates);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Auction backend running on port ${PORT}`);
});
