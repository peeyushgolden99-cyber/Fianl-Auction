// ...existing code...

import React, { useState, useEffect } from 'react';
import { teams, players as initialPlayers } from './data';

const AUCTION_AMOUNT = 84000;
const MAX_PLAYERS_PER_TEAM = 6;
const BASE_PRICES = {
  'Int': 4000,
  'Int+': 6000,
  'ADV': 9000,
  'ADV+': 12500
};


function App() {
  const [players, setPlayers] = useState(initialPlayers);
  const [soldPrice, setSoldPrice] = useState('');
  const [skippedIds, setSkippedIds] = useState([]);
  const [auctionTab, setAuctionTab] = useState('INT');
  const [timeLeft, setTimeLeft] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const initialPlayersKey = JSON.stringify(initialPlayers);

  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayersKey]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    if (timeLeft <= 0) {
      setTimerRunning(false);
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const resetTimer = () => {
    setTimeLeft(300);
    setTimerRunning(false);
  };

  // Filter unsold/unassigned players for each tab
  const unsoldPlayersINT = players.filter(p => p.teamId !== 0 && !p.teamId && (p.category === 'Int' || p.category === 'Int+') && !(p.gender && (p.gender.toLowerCase() === 'female' || p.gender.toLowerCase() === 'w')));
  const unsoldPlayersADV = players.filter(p => p.teamId !== 0 && !p.teamId && (p.category === 'ADV' || p.category === 'ADV+') && !(p.gender && (p.gender.toLowerCase() === 'female' || p.gender.toLowerCase() === 'w')));
  const unsoldPlayersWOMEN = players.filter(p => p.teamId !== 0 && !p.teamId && (p.gender && (p.gender.toLowerCase() === 'female' || p.gender.toLowerCase() === 'w')));
  const notAssignedPlayers = players.filter(p => p.teamId === 0);

  // Get next player for current tab
  const getNextTabPlayer = () => {
    let pool = [];
    if (auctionTab === 'INT') pool = unsoldPlayersINT;
    else if (auctionTab === 'ADV') pool = unsoldPlayersADV;
    else if (auctionTab === 'WOMEN') pool = unsoldPlayersWOMEN;
    else if (auctionTab === 'UNASSIGNED') pool = notAssignedPlayers;
    return pool.length > 0 ? pool[0] : null;
  };
  const nextTabPlayer = getNextTabPlayer();

  // Calculate auction amount left for each team
  const getTeamStats = teamId => {
    const teamPlayers = players.filter(p => p.teamId === teamId);
    const spent = teamPlayers.reduce((sum, p) => sum + (p.soldPrice || BASE_PRICES[p.category]), 0);
    return {
      count: teamPlayers.length,
      spent,
      left: AUCTION_AMOUNT - spent
    };
  };



  const [selectedTeamId, setSelectedTeamId] = useState('');

  const submitPlayerUpdate = () => {
    if (!nextUnassignedPlayer) return;
    if (!selectedTeamId) {
      alert('Please select a team for this player.');
      return;
    }
    if (!soldPrice || Number(soldPrice) < BASE_PRICES[nextUnassignedPlayer.category]) {
      alert('Please enter a valid sold price (at least base price).');
      return;
    }

    const isUnassigned = selectedTeamId === 'UNASSIGNED';
    if (!isUnassigned) {
      const stats = getTeamStats(Number(selectedTeamId));
      if (stats.count >= MAX_PLAYERS_PER_TEAM) {
        alert('This team already has 6 players!');
        return;
      }
      if (stats.left < Number(soldPrice)) {
        alert('This team does not have enough auction amount left.');
        return;
      }
    }

    setPlayers(players.map(p =>
      p.id === nextUnassignedPlayer.id ? { ...p, teamId: isUnassigned ? 0 : Number(selectedTeamId), soldPrice: Number(soldPrice) } : p
    ));
    setSoldPrice('');
    setSelectedTeamId('');
    setSkippedIds(skippedIds.filter(id => id !== nextUnassignedPlayer.id));
  };

  // Use tab-based next player
  const nextUnassignedPlayer = nextTabPlayer;

  // Next button handler: skip current player, with decision popup
  const handleNextPlayer = () => {
    if (!nextUnassignedPlayer) return;
    // If neither team nor sold price is selected, show popup
    const notAssigned = !soldPrice || soldPrice < BASE_PRICES[nextUnassignedPlayer.category];
    const notSelectedTeam = !nextUnassignedPlayer.teamId;
    if (notAssigned && notSelectedTeam) {
      const proceed = window.confirm('Neither team nor sold price is selected. Do you want to skip this player for now?');
      if (!proceed) return;
      // Move player to end of category
      setPlayers(prev => {
        const idx = prev.findIndex(p => p.id === nextUnassignedPlayer.id);
        if (idx === -1) return prev;
        const updated = [...prev];
        const [removed] = updated.splice(idx, 1);
        updated.push(removed);
        return updated;
      });
    }
    setSkippedIds([...skippedIds, nextUnassignedPlayer.id]);
    setSoldPrice('');
  };

  // Download CSV handler
  const handleDownloadCSV = () => {
    const header = ['ID', 'Name', 'Category', 'Gender', 'Team', 'Sold Price'];
    const rows = players.map(p => [
      p.id,
      p.name,
      p.category,
      p.gender,
      teams.find(t => t.id === p.teamId)?.name || '',
      p.soldPrice || ''
    ]);
    const csvContent = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auction_players.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Team color codes
  const teamColors = {
    MI: '#1976d2',
    RCB: '#c62828',
    CSK: '#fbc02d',
    GT: '#283593',
    RR: '#8e24aa',
    SRH: '#ff9800'
  };

  return (
    <div style={{ padding: 20, background: 'linear-gradient(135deg, #e3f2fd 0%, #fffde7 100%)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, gap: 40 }}>
        {/* Left: Auction tile + Categories + Next player (35%) */}
        <div style={{ flex: '0 0 35%', maxWidth: '35%' }}>
          <h1 style={{ color: '#283593', fontWeight: 'bold', fontSize: 32, marginBottom: 20 }}>FBL Team's Tournament Auction Dashboard</h1>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#d32f2f', lineHeight: 1 }}>{formatTime(timeLeft)}</div>
              <div>
                <div style={{ color: '#1976d2', fontSize: 14, fontWeight: 700, letterSpacing: 1.2 }}>AUCTION TIMER</div>
                <div style={{ color: timerRunning ? '#388e3c' : '#757575', fontSize: 14 }}>{timerRunning ? 'Live now' : timeLeft === 0 ? 'Auction ended' : 'Paused'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setTimerRunning(true)} style={{ padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Start</button>
              <button onClick={() => setTimerRunning(false)} style={{ padding: '8px 16px', background: '#757575', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Pause</button>
              <button onClick={resetTimer} style={{ padding: '8px 16px', background: '#0288d1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Reset</button>
            </div>
          </div>
          {/* Auction Tabs and Player Window */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setAuctionTab('INT')} style={{ padding: '8px 24px', background: auctionTab === 'INT' ? '#1976d2' : '#e0e0e0', color: auctionTab === 'INT' ? '#fff' : '#333', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>INT & INT+</button>
            <button onClick={() => setAuctionTab('ADV')} style={{ padding: '8px 24px', background: auctionTab === 'ADV' ? '#1976d2' : '#e0e0e0', color: auctionTab === 'ADV' ? '#fff' : '#333', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>ADV & ADV+</button>
            <button onClick={() => setAuctionTab('WOMEN')} style={{ padding: '8px 24px', background: auctionTab === 'WOMEN' ? '#1976d2' : '#e0e0e0', color: auctionTab === 'WOMEN' ? '#fff' : '#333', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Women Players</button>
            <button onClick={() => setAuctionTab('UNASSIGNED')} style={{ padding: '8px 24px', background: auctionTab === 'UNASSIGNED' ? '#1976d2' : '#e0e0e0', color: auctionTab === 'UNASSIGNED' ? '#fff' : '#333', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Not Assigned</button>
          </div>
          <h2 style={{ color: '#1976d2' }}>Next Player for Auction</h2>
          {nextUnassignedPlayer ? (
            <div style={{ marginBottom: 16, border: '2px solid #1976d2', borderRadius: 12, padding: 20, background: '#fffbe6', maxWidth: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 'bold', fontSize: 18 }}>{nextUnassignedPlayer.name}</span>
              </div>
              <div><strong>Category:</strong> {nextUnassignedPlayer.category}</div>
              <div><strong>Gender:</strong> {nextUnassignedPlayer.gender}</div>
              <div><strong>Base Price:</strong> ₹{BASE_PRICES[nextUnassignedPlayer.category]}</div>
              <div style={{ marginTop: 10 }}>
                <label htmlFor="soldPrice"><strong>Sold Price:</strong></label>
                <input
                  id="soldPrice"
                  type="number"
                  min={BASE_PRICES[nextUnassignedPlayer.category]}
                  value={soldPrice}
                  onChange={e => setSoldPrice(e.target.value)}
                  style={{ marginLeft: 8, marginRight: 8, width: 100 }}
                  placeholder={`≥ ₹${BASE_PRICES[nextUnassignedPlayer.category]}`}
                />
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                <select
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                >
                  <option value="" disabled>Select team or mark Not Assigned</option>
                  <option value="UNASSIGNED">Not assigned to any team</option>
                  {teams.map(team => {
                    const stats = getTeamStats(team.id);
                    const price = soldPrice ? Number(soldPrice) : BASE_PRICES[nextUnassignedPlayer.category];
                    return (
                      <option
                        key={team.id}
                        value={team.id}
                        disabled={stats.count >= MAX_PLAYERS_PER_TEAM || stats.left < price}
                      >
                        {team.name} {stats.count >= MAX_PLAYERS_PER_TEAM ? '(Full)' : ''}
                      </option>
                    );
                  })}
                </select>
                <button onClick={submitPlayerUpdate} style={{ padding: '6px 16px', background: '#388e3c', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold' }}>Submit</button>
                <button onClick={handleNextPlayer} style={{ padding: '6px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold' }}>Next</button>
              </div>
            </div>
          ) : (
            <div style={{ color: 'green', fontWeight: 'bold' }}>All players in this category have been assigned or skipped!</div>
          )}
          <button onClick={handleDownloadCSV} style={{ marginTop: 20, padding: '8px 20px', background: '#283593', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>Download Player List (CSV)</button>
        </div>
        {/* Teams Section - Right 65%, 2 rows of 3 */}
        <div style={{ flex: '0 0 65%', maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 20 }}>
            {teams.slice(0, 3).map(team => {
              const stats = getTeamStats(team.id);
              const color = teamColors[team.name] || '#f9f9f9';
              const teamPlayers = players.filter(p => p.teamId === team.id);
              const intermediateCount = teamPlayers.filter(p => p.category === 'Int' || p.category === 'Int+').length;
              const advanceCount = teamPlayers.filter(p => p.category === 'ADV' || p.category === 'ADV+').length;
              const womenCount = teamPlayers.filter(p => p.gender && (p.gender.toLowerCase() === 'female' || p.gender.toLowerCase() === 'w')).length;
              return (
                <div key={team.id} style={{ minWidth: 180, border: '2px solid #fff', borderRadius: 12, padding: 14, background: color, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <strong style={{ fontSize: 20 }}>{team.name}</strong><br />
                  <span>💰 Total Auction Amount: ₹{AUCTION_AMOUNT}</span><br />
                  <span>👥 Players: {stats.count} / {MAX_PLAYERS_PER_TEAM}</span><br />
                  <span>💸 Amount Left: ₹{stats.left}</span><br />
                  <span>🟡 Intermediate Players: {intermediateCount}</span><br />
                  <span>🚀 Advance Players: {advanceCount}</span><br />
                  <span>♀️ Women Players: {womenCount}</span>
                  <ul style={{ marginTop: 8 }}>
                    {teamPlayers.map(p => (
                      <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 'bold' }}>
                        <span>{p.name} (₹{p.soldPrice || BASE_PRICES[p.category]})</span>
                        {p.teamId && (
                          <span style={{ padding: '3px 8px', borderRadius: 12, background: 'linear-gradient(135deg, #ff8a65, #ff5252)', color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>SOLD</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 20 }}>
            {teams.slice(3, 6).map(team => {
              const stats = getTeamStats(team.id);
              const color = teamColors[team.name] || '#f9f9f9';
              const teamPlayers = players.filter(p => p.teamId === team.id);
              const intermediateCount = teamPlayers.filter(p => p.category === 'Int' || p.category === 'Int+').length;
              const advanceCount = teamPlayers.filter(p => p.category === 'ADV' || p.category === 'ADV+').length;
              const womenCount = teamPlayers.filter(p => p.gender && (p.gender.toLowerCase() === 'female' || p.gender.toLowerCase() === 'w')).length;
              return (
                <div key={team.id} style={{ minWidth: 180, border: '2px solid #fff', borderRadius: 12, padding: 14, background: color, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <strong style={{ fontSize: 20 }}>{team.name}</strong><br />
                  <span>💰 Total Auction Amount: ₹{AUCTION_AMOUNT}</span><br />
                  <span>👥 Players: {stats.count} / {MAX_PLAYERS_PER_TEAM}</span><br />
                  <span>💸 Amount Left: ₹{stats.left}</span><br />
                  <span>🟡 Intermediate Players: {intermediateCount}</span><br />
                  <span>🚀 Advance Players: {advanceCount}</span><br />
                  <span>♀️ Women Players: {womenCount}</span>
                  <ul style={{ marginTop: 8 }}>
                    {teamPlayers.map(p => (
                      <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 'bold' }}>
                        <span>{p.name} (₹{p.soldPrice || BASE_PRICES[p.category]})</span>
                        {p.teamId && (
                          <span style={{ padding: '3px 8px', borderRadius: 12, background: 'linear-gradient(135deg, #ff8a65, #ff5252)', color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>SOLD</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
