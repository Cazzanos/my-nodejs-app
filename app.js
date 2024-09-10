const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const moment = require('moment-timezone');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Fișiere pentru stocarea datelor
const KEYS_FILE = path.join(__dirname, 'keys.json');
const BLACKLIST_FILE = path.join(__dirname, 'blacklist.json');
const NOTIFICATIONS_FILE = path.join(__dirname, 'notifications.json');

// Verifică dacă fișierele există, dacă nu, creează-le
[KEYS_FILE, BLACKLIST_FILE, NOTIFICATIONS_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([]));
    }
});

// Funcții pentru gestionarea datelor
function loadData(file) {
    const data = fs.readFileSync(file);
    return JSON.parse(data);
}

function saveData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Funcție pentru generarea unei chei unice
function generateKey() {
    return 'TheBasement_' + uuidv4().slice(0, 10);  // Prefix followed by 10 characters
}

// Funcție pentru verificarea și adăugarea unei chei
function createKey(ip, maxUsers = 2) {
    const keys = loadData(KEYS_FILE);
    const existingKey = keys.find(key => key.ip === ip && !key.expired);

    if (existingKey) {
        return existingKey;
    }

    const newKey = {
        key: generateKey(),
        ip: ip,
        maxUsers: maxUsers,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 ore
        expired: false,
        inUse: false,
        usedBy: []
    };

    keys.push(newKey);
    saveData(KEYS_FILE, keys);

    return newKey;
}

// Funcție pentru crearea unei chei personalizate
function createCustomKey(key, duration, maxUsers = 1) {
    const keys = loadData(KEYS_FILE);
    const now = Date.now();
    const expiresAt = now + parseInt(duration) * 60 * 60 * 1000; // Durata în ore

    const newKey = {
        key: key,
        ip: 'admin',
        maxUsers: maxUsers,
        createdAt: now,
        expiresAt: expiresAt,
        expired: false,
        inUse: false,
        usedBy: []
    };

    keys.push(newKey);
    saveData(KEYS_FILE, keys);

    return newKey;
}

// Funcție pentru verificarea blacklist-ului
function isBlacklisted(ip, playerName) {
    const blacklist = loadData(BLACKLIST_FILE);
    const now = Date.now();

    // Verifică dacă IP-ul este pe blacklist
    const blacklistedIP = blacklist.find(entry => entry.type === 'ip' && entry.value === ip && (entry.expiry === 'permanent' || entry.expiry > now));
    if (blacklistedIP) {
        return { blacklisted: true, message: `Your IP has been blacklisted${blacklistedIP.expiry !== 'permanent' ? ` until ${moment(blacklistedIP.expiry).format('LLLL')}` : ''}` };
    }

    // Verifică dacă numele jucătorului este pe blacklist
    const blacklistedPlayer = blacklist.find(entry => entry.type === 'player' && entry.value.toLowerCase() === playerName.toLowerCase() && (entry.expiry === 'permanent' || entry.expiry > now));
    if (blacklistedPlayer) {
        return { blacklisted: true, message: `You have been blacklisted${blacklistedPlayer.expiry !== 'permanent' ? ` until ${moment(blacklistedPlayer.expiry).format('LLLL')}` : ''}` };
    }

    return { blacklisted: false };
}

// Middleware pentru verificarea codului de acces
function checkAccess(req, res, next) {
    const { access_code } = req.query;
    if ((req.path === '/keys' && access_code === 'vasiocburatiocsukos') ||
        (req.path === '/admin' && access_code === 'buratiocadminboscotos')) {
        return next();
    }
    res.status(401).send('Unauthorized');
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    let ip = forwarded ? forwarded.split(',').shift() : req.ip;
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }
    return ip;
}

// Funcție pentru eliminarea cheilor expirate
function removeExpiredKeys() {
    const keys = loadData(KEYS_FILE);
    const now = Date.now();
    const validKeys = keys.filter(key => key.expiresAt > now);
    saveData(KEYS_FILE, validKeys);
}

// Funcție pentru eliminarea tuturor cheilor
function removeAllKeys() {
    saveData(KEYS_FILE, []);
}

// Route pentru pagina principală
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Basement Hub Key System</title>
            <style>
                body {
                    background: linear-gradient(to top, #003366, white);
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                h1 {
                    color: #fff;
                }
                a {
                    background-color: #0056b3;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-size: 16px;
                }
                a:hover {
                    background-color: #003d80;
                }
            </style>
        </head>
        <body>
            <div>
                <h1>Welcome to Basement Hub Key System</h1>
                <a href="/redirect-to-linkvertise">Generate a Key</a>
            </div>
        </body>
        </html>
    `);
});

// Redirecționare către primul Linkvertise după ce utilizatorul apasă pe Generate a Key
app.get('/redirect-to-linkvertise', (req, res) => {
    const ip = getClientIp(req);
    createKey(ip); // Creează cheia în avans
    res.redirect('https://link-center.net/1203734/the-basement-key1'); // Primul Linkvertise
});


// Checkpoint 2: Redirecționare către al doilea Linkvertise
app.get('/checkpoint2', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Basement Hub Key System | Checkpoint 2</title>
            <style>
                body {
                    background: linear-gradient(to top, #003366, white);
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                h1 {
                    color: white;
                }
                a {
                    background-color: #0056b3;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-size: 16px;
                }
                a:hover {
                    background-color: #003d80;
                }
            </style>
        </head>
        <body>
            <div>
                <h1>Basement Hub Key System | Checkpoint 2</h1>
                <a href="https://link-target.net/1203734/key">Complete Checkpoint 2</a> <!-- Al doilea Linkvertise -->
            </div>
        </body>
        </html>
    `);
});

// Redirect după finalizarea checkpoint2 la key-generated
app.get('/redirect-to-key-generated', (req, res) => {
    res.redirect('/key-generated');
});

// După finalizarea Checkpoint 2, redirecționează către pagina key-generated
app.get('/key-generated', (req, res) => {
    const ip = getClientIp(req);
    const keys = loadData(KEYS_FILE);
    const existingKey = keys.find(key => key.ip === ip && !key.expired);

    if (!existingKey) {
        return res.redirect('/');
    }

    const timeLeft = existingKey.expiresAt - Date.now();
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Your Generated Key</title>
            <style>
                body {
                    background: linear-gradient(to bottom, #003366, white);
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                h1 {
                    color: #fff;
                }
                p {
                    color: #333;
                }
                a {
                    background-color: #0056b3;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-size: 16px;
                }
                a:hover {
                    background-color: #003d80;
                }
                .timer {
                    font-size: 18px;
                    color: #ff0000;
                }
            </style>
        </head>
        <body>
            <div>
                <h1>Your Generated Key</h1>
                <p>Your new key: <strong>${existingKey.key}</strong></p>
                <p>It will expire in: <strong><span id="timer">${hours}h ${minutes}m ${seconds}s</span></strong></p>
                <a href="/">Go back</a>
            </div>
            <script>
                var countDownDate = new Date().getTime() + ${timeLeft};
                var x = setInterval(function() {
                    var now = new Date().getTime();
                    var distance = countDownDate - now;

                    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

                    document.getElementById("timer").innerHTML = hours + "h " + minutes + "m " + seconds + "s ";

                    if (distance < 0) {
                        clearInterval(x);
                        document.getElementById("timer").innerHTML = "EXPIRED";
                        setTimeout(function() {
                            location.reload();
                        }, 1000);
                    }
                }, 1000);
            </script>
        </body>
        </html>
    `);
});

// Route pentru verificarea unei chei
app.get('/verify-key', (req, res) => {
    const { key, playerName } = req.query;
    const ip = getClientIp(req);
    const blacklistCheck = isBlacklisted(ip, playerName);

    if (blacklistCheck.blacklisted) {
        return res.json({ valid: false, message: blacklistCheck.message });
    }

    const keys = loadData(KEYS_FILE);
    const foundKey = keys.find(k => k.key === key && !k.expired && k.expiresAt > Date.now());

    if (foundKey) {
        if (foundKey.usedBy.length >= foundKey.maxUsers) {
            return res.json({ valid: false, message: "Cheia a atins limita de utilizatori." });
        }

        if (!foundKey.usedBy.includes(playerName)) {
            foundKey.usedBy.push(playerName);
            foundKey.inUse = true;
            saveData(KEYS_FILE, keys);
        }

        res.json({ valid: true, message: "Cheia este validă." });
    } else {
        res.json({ valid: false, message: "Cheia nu este validă sau a expirat." });
    }
});

// Admin Page pentru gestionarea cheilor și blacklist-ului
app.get('/admin', checkAccess, (req, res) => {
    removeExpiredKeys();

    const keys = loadData(KEYS_FILE);
    const blacklist = loadData(BLACKLIST_FILE);

    let keysHtml = keys.map(key => `
        <tr>
            <td>${key.key}</td>
            <td>${key.ip}</td>
            <td><span id="timer-${key.key}">${moment(key.expiresAt).format('LLLL')}</span></td>
            <td>${key.inUse ? key.usedBy.join(', ') : 'false'}</td>
            <td>${key.maxUsers}</td>
            <td>
                <form action="/admin/delete-key" method="POST" style="display:inline;">
                    <input type="hidden" name="key" value="${key.key}">
                    <button type="submit">Delete</button>
                </form>
                <form action="/admin/add-time" method="POST" style="display:inline;">
                    <input type="hidden" name="key" value="${key.key}">
                    <input type="number" name="hours" placeholder="Hours" required>
                    <button type="submit">Add Time</button>
                </form>
            </td>
        </tr>
    `).join('');

    let blacklistHtml = blacklist.map(entry => `
        <tr>
            <td>${entry.type === 'ip' ? 'IP' : 'Player'}</td>
            <td>${entry.value}</td>
            <td>${entry.expiry === 'permanent' ? 'Permanent' : moment(entry.expiry).format('LLLL')}</td>
            <td>
                <form action="/admin/remove-blacklist" method="POST" style="display:inline;">
                    <input type="hidden" name="value" value="${entry.value}">
                    <button type="submit">Remove</button>
                </form>
                <form action="/admin/modify-blacklist-time" method="POST" style="display:inline;">
                    <input type="hidden" name="value" value="${entry.value}">
                    <input type="number" name="hours" placeholder="Hours" required>
                    <button type="submit">Add/Reduce Time</button>
                </form>
            </td>
        </tr>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Page</title>
            <style>
                body {
                    background: linear-gradient(to bottom, #003366, white);
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                h1 {
                    color: #333;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                th {
                    background-color: #003d80;
                    color: white;
                }
                button {
                    background-color: #0056b3;
                    color: white;
                    padding: 5px 10px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: #003d80;
                }
                input[type="number"] {
                    width: 60px;
                    padding: 5px;
                    border-radius: 5px;
                    border: 1px solid #ddd;
                }
                input[type="text"] {
                    padding: 5px;
                    border-radius: 5px;
                    border: 1px solid #ddd;
                    margin-right: 10px;
                }
            </style>
        </head>
        <body>
            <h1>Admin Page</h1>
            <input type="text" id="search-bar" placeholder="Search by key, IP, or player name" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ddd; margin-bottom: 20px;">
            <table id="keys-table">
                <tr>
                    <th>Key</th>
                    <th>IP</th>
                    <th>Expires At</th>
                    <th>In Use</th>
                    <th>Max Users</th>
                    <th>Actions</th>
                </tr>
                ${keysHtml}
            </table>
            <h2>Blacklist</h2>
            <table id="blacklist-table">
                <tr>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Expiry</th>
                    <th>Actions</th>
                </tr>
                ${blacklistHtml}
            </table>
            <h2>Add to Blacklist</h2>
            <form id="blacklist-form">
                <select id="blacklist-type" required>
                    <option value="player">Player</option>
                    <option value="ip">IP</option>
                </select>
                <input type="text" id="blacklist-value" placeholder="Player Name or IP" required>
                <input type="text" id="blacklist-duration" placeholder="Duration (hours or 'permanent')" required>
                <button type="submit">Add to Blacklist</button>
            </form>
            <h2>Delete Expired Keys</h2>
            <form action="/admin/delete-expired-keys" method="POST">
                <button type="submit">Delete Expired Keys</button>
            </form>
            <h2>Delete All Keys</h2>
            <form action="/admin/delete-all-keys" method="POST">
                <button type="submit">Delete All Keys</button>
            </form>
            <h2>Create Custom Key</h2>
            <form action="/admin/create-custom-key" method="POST">
                <input type="text" name="key" placeholder="Custom Key" required>
                <input type="number" name="duration" placeholder="Duration (hours)" required>
                <input type="number" name="maxUsers" placeholder="Max Users" required>
                <button type="submit">Create Custom Key</button>
            </form>
            <h2>Add Time to All Keys</h2>
            <form action="/admin/add-time-all" method="POST">
                <input type="number" name="hours" placeholder="Hours to Add" required>
                <button type="submit">Add Time to All Keys</button>
            </form>
            <h2>Send Notification</h2>
            <form id="notification-form">
                <input type="text" id="notification-message" placeholder="Message to Send" required>
                <button type="submit">Send Notification</button>
            </form>
            <h2>Send Kick Message</h2>
            <form id="kick-form">
                <input type="text" id="kick-message" placeholder="Kick Message" required>
                <button type="submit">Send Kick</button>
            </form>
            <script>
                document.getElementById('blacklist-form').addEventListener('submit', function(event) {
                    event.preventDefault();
                    const type = document.getElementById('blacklist-type').value;
                    const value = document.getElementById('blacklist-value').value;
                    const duration = document.getElementById('blacklist-duration').value;
                    fetch('/admin/add-blacklist', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            'type': type,
                            'value': value,
                            'duration': duration
                        })
                    }).then(response => response.text()).then(data => {
                        alert(data);
                        location.reload();
                    });
                });

                document.getElementById('notification-form').addEventListener('submit', function(event) {
                    event.preventDefault();
                    const message = document.getElementById('notification-message').value;
                    fetch('/admin/send-notification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            'message': message
                        })
                    }).then(response => response.text()).then(data => {
                        alert(data);
                        location.reload();
                    });
                });

                document.getElementById('kick-form').addEventListener('submit', function(event) {
                    event.preventDefault();
                    const message = document.getElementById('kick-message').value;
                    fetch('/admin/send-kick', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            'message': message
                        })
                    }).then(response => response.text()).then(data => {
                        alert(data);
                        location.reload();
                    });
                });

                document.getElementById('search-bar').addEventListener('input', function(event) {
                    const searchQuery = event.target.value.toLowerCase();
                    const rows = document.querySelectorAll('#keys-table tr:not(:first-child), #blacklist-table tr:not(:first-child)');
                    rows.forEach(row => {
                        const key = row.cells[0]?.textContent.toLowerCase() || '';
                        const value = row.cells[1]?.textContent.toLowerCase() || '';
                        const usedBy = row.cells[3]?.textContent.toLowerCase() || '';
                        if (key.includes(searchQuery) || value.includes(searchQuery) || usedBy.includes(searchQuery)) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                });

                // Setează timerele pentru chei în pagina de admin
                const keys = ${JSON.stringify(keys)};
                keys.forEach(key => {
                    const timerElement = document.getElementById('timer-' + key.key);
                    if (timerElement) {
                        const countDownDate = new Date(key.expiresAt).getTime();
                        const x = setInterval(function() {
                            const now = new Date().getTime();
                            const distance = countDownDate - now;

                            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                            timerElement.innerHTML = hours + "h " + minutes + "m " + seconds + "s ";

                            if (distance < 0) {
                                clearInterval(x);
                                timerElement.innerHTML = "EXPIRED";
                                setTimeout(function() {
                                    location.reload();
                                }, 1000);
                            }
                        }, 1000);
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Route pentru adăugarea pe blacklist
app.post('/admin/add-blacklist', (req, res) => {
    const { type, value, duration } = req.body;
    const blacklist = loadData(BLACKLIST_FILE);
    let expiry;

    if (duration.toLowerCase() === 'permanent') {
        expiry = 'permanent';
    } else {
        expiry = Date.now() + parseInt(duration) * 60 * 60 * 1000; // Durata în ore
    }

    blacklist.push({
        type: type,
        value: value,
        expiry: expiry
    });

    saveData(BLACKLIST_FILE, blacklist);
    res.send('Added to blacklist successfully.');
});

// Route pentru ștergerea de pe blacklist
app.post('/admin/remove-blacklist', (req, res) => {
    const { value } = req.body;
    let blacklist = loadData(BLACKLIST_FILE);
    blacklist = blacklist.filter(entry => entry.value !== value);
    saveData(BLACKLIST_FILE, blacklist);
    res.redirect('/admin?access_code=buratiocadminboscotos');
});

// Route pentru modificarea timpului pe blacklist
app.post('/admin/modify-blacklist-time', (req, res) => {
    const { value, hours } = req.body;
    const blacklist = loadData(BLACKLIST_FILE);
    const now = Date.now();

    const entry = blacklist.find(entry => entry.value === value);
    if (entry) {
        if (entry.expiry !== 'permanent') {
            entry.expiry = Math.max(now, entry.expiry) + parseInt(hours) * 60 * 60 * 1000;
        }
    }

    saveData(BLACKLIST_FILE, blacklist);
    res.redirect('/admin?access_code=buratiocadminboscotos');
});

// Route pentru ștergerea unei chei
app.post('/admin/delete-key', (req, res) => {
    const { key } = req.body;
    let keys = loadData(KEYS_FILE);
    keys = keys.filter(k => k.key !== key);
    saveData(KEYS_FILE, keys);
    res.redirect('/admin?access_code=buratiocadminboscotos');
});

// Route pentru ștergerea cheilor expirate
app.post('/admin/delete-expired-keys', (req, res) => {
    removeExpiredKeys();
    res.redirect('/admin?access_code=buratiocadminboscotos');
});

// Route pentru ștergerea tuturor cheilor
app.post('/admin/delete-all-keys', (req, res) => {
    removeAllKeys();
    res.redirect('/admin?access_code=buratiocadminboscotos');
});

// Route pentru crearea unei chei noi
app.post('/admin/create-key', (req, res) => {
    const ip = 'admin';
    createKey(ip);
    res.redirect('/admin?access_code=buratiocadminboscotos');
});

// Route pentru crearea unei chei personalizate
app.post('/admin/create-custom-key', (req, res) => {
    const { key, duration, maxUsers } = req.body;
    createCustomKey(key, duration, maxUsers);
    res.send('Custom key created successfully.');
});

// Route pentru trimiterea unei notificări
app.post('/admin/send-notification', (req, res) => {
    const { message } = req.body;
    const notifications = loadData(NOTIFICATIONS_FILE);

    notifications.push({ message, type: 'notification' });
    saveData(NOTIFICATIONS_FILE, notifications);
    res.send('Notification sent successfully.');
});

// Route pentru trimiterea unui kick
app.post('/admin/send-kick', (req, res) => {
    const { message } = req.body;
    const notifications = loadData(NOTIFICATIONS_FILE);

    notifications.push({ message, type: 'kick' });
    saveData(NOTIFICATIONS_FILE, notifications);
    res.send('Kick sent successfully.');
});

// Route pentru obținerea notificărilor active
app.get('/get-notifications', (req, res) => {
    const notifications = loadData(NOTIFICATIONS_FILE);
    res.json(notifications);
});

// Șterge notificările după ce au fost procesate
app.post('/clear-notifications', (req, res) => {
    saveData(NOTIFICATIONS_FILE, []);
    res.send('Notifications cleared.');
});

// Route pentru adăugarea timpului la toate cheile
app.post('/admin/add-time-all', (req, res) => {
    const { hours } = req.body;
    const keys = loadData(KEYS_FILE);
    const updatedKeys = keys.map(k => {
        if (!k.expired) {
            k.expiresAt += parseInt(hours) * 60 * 60 * 1000;
        }
        return k;
    });
    saveData(KEYS_FILE, updatedKeys);
    res.redirect('/admin?access_code=buratiocadminboscotos');
});

// Route pentru adăugarea de timp unei chei
app.post('/admin/add-time', (req, res) => {
    const { key, hours } = req.body;
    const keys = loadData(KEYS_FILE);
    const updatedKeys = keys.map(k => {
        if (k.key === key && !k.expired) {
            k.expiresAt += parseInt(hours) * 60 * 60 * 1000; // Adaugă timpul în ore
        }
        return k;
    });
    saveData(KEYS_FILE, updatedKeys);
    res.redirect('/admin?access_code=buratiocadminboscotos');
});

// Pornire server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
