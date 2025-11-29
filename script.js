/* Advanced Savings Tracker Frontend
 - uses server endpoints when available:
   POST /api/register  {username,password,monthlyGoal}
   POST /api/login     {username,password} -> {ok, user}
   GET  /api/user/:username -> user data
   POST /api/save      {username, amount, date}
 - If server not reachable, falls back to localStorage multi-user simulation.
*/

// ---------- Config ----------
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000' : (/* put your deployed server URL here */ '');
const USE_SERVER = Boolean(API_BASE); // set to '' or false to force localStorage mode

// DOM
const authCard = document.getElementById('auth-card');
const dashboard = document.getElementById('dashboard');
const charImg = document.getElementById('charImg');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authMsg = document.getElementById('authMsg');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const welcomeTxt = document.getElementById('welcomeTxt');
const goalValue = document.getElementById('goalValue');
const totalSavedEl = document.getElementById('totalSaved');
const remainingAmtEl = document.getElementById('remainingAmt');
const progressBar = document.getElementById('progressBar');
const progressChartCtx = document.getElementById('progressChart').getContext('2d');

const saveInput = document.getElementById('saveInput');
const saveBtn = document.getElementById('saveBtn');
const calendarGrid = document.getElementById('calendarGrid');
const streakCountEl = document.getElementById('streakCount');
const badgeArea = document.getElementById('badgeArea');
const coinLayer = document.getElementById('coinLayer');

const logoutBtn = document.getElementById('logoutBtn');
const modeToggle = document.getElementById('modeToggle');

// in-memory state
let currentUser = null;
let localUsers = JSON.parse(localStorage.getItem('localUsers') || '{}'); // fallback
let chartInstance = null;

// helper: show message
function showAuthMsg(text, ok=true){ authMsg.innerText = text; authMsg.style.color = ok ? 'green' : 'crimson'; }

// character reactions
function charEyesClosed(){ charImg.style.transform='translateY(-3px) scale(.98)'; charImg.style.filter='brightness(.95)'; }
function charSmile(){ charImg.src = "https://upload.wikimedia.org/wikipedia/commons/2/21/Smiling_Face_with_Open_Mouth_Emoji.png"; charImg.style.transform='scale(1)'; }
function charNeutral(){ charImg.src = "https://upload.wikimedia.org/wikipedia/commons/2/2e/Face_with_no_mouth_emoji.png"; charImg.style.transform='scale(1)'; }

// password typing reaction
passwordInput.addEventListener('input', ()=>{
  charEyesClosed();
  setTimeout(()=>charNeutral(), 700);
});

// ---------- AUTH: register/login (server or fallback) ----------
async function serverRequest(path, body){
  if(!USE_SERVER) throw new Error('No server configured');
  const res = await fetch(API_BASE + path, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
  });
  return res.json();
}

loginBtn.addEventListener('click', async ()=>{
  const u = usernameInput.value.trim(), p = passwordInput.value.trim();
  if(!u||!p){ showAuthMsg('Fill username and password', false); return; }
  try{
    if(USE_SERVER){
      const result = await serverRequest('/api/login', {username:u,password:p});
      if(result.ok){ currentUser = result.user; onLoginSuccess(); } else { showAuthMsg(result.msg||'Login failed', false); }
    } else {
      // local fallback
      if(localUsers[u] && localUsers[u].password === p){
        currentUser = localUsers[u]; currentUser.username = u; onLoginSuccess();
      } else showAuthMsg('Invalid credentials', false);
    }
  }catch(err){ showAuthMsg('Server error, using offline mode', false); console.error(err); }
});

registerBtn.addEventListener('click', async ()=>{
  const u = usernameInput.value.trim(), p = passwordInput.value.trim();
  if(!u||!p){ showAuthMsg('Fill username and password', false); return; }
  let monthlyGoal = prompt('Set monthly goal (e.g. 25000):', '25000');
  monthlyGoal = parseInt(monthlyGoal) || 25000;
  try{
    if(USE_SERVER){
      const result = await serverRequest('/api/register', {username:u,password:p,monthlyGoal});
      if(result.ok){ currentUser = result.user; onLoginSuccess(); } else { showAuthMsg(result.msg||'Register failed', false); }
    } else {
      // local fallback store
      localUsers[u] = {password:p, monthlyGoal, savedData:{total:0,days:[],targets:[]}, username:u};
      localStorage.setItem('localUsers', JSON.stringify(localUsers));
      currentUser = localUsers[u];
      showAuthMsg('Account created', true);
      onLoginSuccess();
    }
  }catch(err){ showAuthMsg('Server error, offline mode', false); console.error(err); }
});

// ---------- After login ----------
function onLoginSuccess(){
  showAuthMsg('Welcome, loading dashboard...', true);
  setTimeout(()=>{ authCard.style.display='none'; dashboard.style.display='block'; }, 400);
  charSmile();
  // set UI
  welcomeTxt.innerText = `Hello, ${currentUser.username || currentUser.user?.username || 'Friend'}`;
  goalValue.innerText = currentUser.monthlyGoal || currentUser.user?.monthlyGoal || 25000;
  initDashboard();
}

// ---------- Dashboard logic ----------
async function initDashboard(){
  // get latest user data from server or local
  let userData = currentUser.savedData ? currentUser : null;
  if(USE_SERVER){
    try{
      const res = await fetch(`${API_BASE}/api/user/${currentUser.username}`);
      if(res.ok){ userData = await res.json(); currentUser = userData; }
    }catch(e){ console.warn('server unreachable'); }
  }
  if(!userData) userData = currentUser;

  // populate UI
  const monthlyGoal = parseInt(userData.monthlyGoal || 25000);
  goalValue.innerText = monthlyGoal;
  if(!userData.savedData) userData.savedData = {total:0,days:[],targets:[]};

  // build daily targets (if empty)
  if(!userData.savedData.targets || userData.savedData.targets.length === 0){
    userData.savedData.targets = buildTargets(monthlyGoal);
    await persistUserData(userData);
  }

  // totals
  document.getElementById('totalSaved').innerText = userData.savedData.total || 0;
  document.getElementById('remainingAmt').innerText = Math.max(0, monthlyGoal - (userData.savedData.total || 0));
  updateProgressVisual(userData.savedData.total || 0, monthlyGoal);

  buildCalendar(userData);
  updateChart(userData);
  updateStreak(userData);

  // save button behavior
  saveBtn.onclick = async ()=>{
    const amt = parseInt(saveInput.value);
    if(!amt || amt<=0) return alert('Enter valid amount');
    const dateStr = new Date().toISOString().slice(0,10);
    // update userData
    userData.savedData.total = (userData.savedData.total || 0) + amt;
    // mark today saved amount (store actual amount)
    const todayIdx = new Date().getDate() - 1;
    userData.savedData.days = userData.savedData.days || [];
    userData.savedData.days[todayIdx] = (userData.savedData.days[todayIdx] || 0) + amt;
    await persistSave(currentUser.username, amt, dateStr);
    // animations and UI
    spawnCoins(8);
    showBadgeIfNeeded(userData.savedData.total, monthlyGoal);
    document.getElementById('totalSaved').innerText = userData.savedData.total;
    document.getElementById('remainingAmt').innerText = Math.max(0, monthlyGoal - userData.savedData.total);
    updateProgressVisual(userData.savedData.total, monthlyGoal);
    buildCalendar(userData);
    updateChart(userData);
    updateStreak(userData);
    saveInput.value = '';
  };
}

// build daily target distribution (balanced but varied)
function buildTargets(monthlyGoal){
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  let remaining = monthlyGoal;
  const targets = [];
  for(let i=0;i<daysInMonth;i++){
    const avg = Math.floor(remaining / (daysInMonth - i));
    // vary to avoid monotony
    const variance = Math.min(500, Math.floor(avg * 0.4));
    const min = Math.max(100, avg - variance);
    const max = Math.min(avg + variance, remaining - (daysInMonth - i - 1)*100);
    const val = Math.floor(Math.random()*(max-min+1) + min);
    targets.push(val);
    remaining -= val;
  }
  return targets;
}

// calendar
function buildCalendar(userData){
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  calendarGrid.innerHTML = '';
  for(let i=1;i<=daysInMonth;i++){
    const d = document.createElement('div');
    d.className = 'day';
    if(userData.savedData.days && userData.savedData.days[i-1]) d.classList.add('saved');
    d.title = `Target: Rs ${userData.savedData.targets[i-1] || '-'}\nSaved: Rs ${userData.savedData.days?.[i-1] || 0}`;
    d.innerHTML = `<div>${i}</div><div class="small muted">${userData.savedData.days?.[i-1]||''}</div>`;
    calendarGrid.appendChild(d);
  }
}

// progress visuals
function updateProgressVisual(total, goal){
  const pct = Math.min(100, Math.floor((total/goal)*100));
  progressBar.style.width = pct + '%';
  progressBar.innerText = pct + '%';
}

// chart
function updateChart(userData){
  const days = userData.savedData.days || [];
  const labels = days.map((_,i)=>i+1);
  const data = days.map(a=>a||0);
  if(chartInstance){ chartInstance.data.labels = labels; chartInstance.data.datasets[0].data = data; chartInstance.update(); return; }
  chartInstance = new Chart(progressChartCtx, {
    type:'bar',
    data:{labels, datasets:[{label:'Daily saved', data, backgroundColor:'#2bb673'}]},
    options:{responsive:true, maintainAspectRatio:true, scales:{x:{grid:{display:false}}, y:{beginAtZero:true}}}
  });
}

// streak
function updateStreak(userData){
  const days = userData.savedData.days || [];
  let streak = 0;
  for(let i=days.length-1;i>=0;i--){
    if(days[i] && days[i]>0) streak++; else break;
  }
  streakCountEl.innerText = streak;
}

// spawn coin animation
function spawnCoins(n=10){
  for(let i=0;i<n;i++){
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.style.left = (window.innerWidth/2 + (Math.random()*200-100)) + 'px';
    coin.style.top = (200 + Math.random()*40) + 'px';
    coin.style.backgroundImage = "url('https://upload.wikimedia.org/wikipedia/commons/3/3f/Gold_coin_icon.png')";
    coinLayer.appendChild(coin);
    animateCoin(coin, i);
  }
  setTimeout(()=>{ coinLayer.innerHTML = ''; }, 2200);
}
function animateCoin(el, idx){
  // random bezier path using CSS transform animation
  const dx = (Math.random()*400 - 200);
  const endY = window.innerHeight + 200;
  el.animate([
    { transform:`translate3d(0,0,0) rotate(${Math.random()*360}deg)`, opacity:1 },
    { transform:`translate3d(${dx}px, ${endY}px,0) rotate(${Math.random()*720}deg)`, opacity:0.02 }
  ], { duration:1800 + Math.random()*800, easing:'cubic-bezier(.2,.8,.2,1)'});
}

// badges
function showBadge(text){
  const b = document.createElement('div'); b.className='badge'; b.innerText = text;
  badgeArea.appendChild(b);
  setTimeout(()=>b.remove(), 3000);
}
function showBadgeIfNeeded(total, goal){
  const pct = Math.floor(total/goal*100);
  [25,50,75,100].forEach(th=>{
    if(pct >= th && pct < th+5){ showBadge(`${th}% reached`); }
  });
}

// persist to server or local
async function persistUserData(userData){
  if(USE_SERVER){
    try{
      await fetch(API_BASE + '/api/update-user', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(userData)});
      return;
    }catch(e){ console.warn('persist failed, falling back'); }
  }
  // fallback local
  localUsers[userData.username] = userData;
  localStorage.setItem('localUsers', JSON.stringify(localUsers));
}

async function persistSave(username, amount, dateStr){
  if(USE_SERVER){
    try{
      await fetch(API_BASE + '/api/save', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username, amount, date:dateStr})});
      return;
    }catch(e){ console.warn('save to server failed'); }
  }
  // local fallback, already updated current user in memory; persist
  localUsers[currentUser.username] = currentUser;
  localStorage.setItem('localUsers', JSON.stringify(localUsers));
}

// logout
logoutBtn.addEventListener('click', ()=>{
  currentUser = null;
  dashboard.style.display = 'none';
  authCard.style.display = 'block';
  usernameInput.value = passwordInput.value = '';
  charNeutral();
});

// Dark/Light
modeToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
});

// attempt to show notification
function tryNotify(msg){
  if(!("Notification" in window)) return;
  if(Notification.permission === 'granted'){ new Notification(msg); }
  else Notification.requestPermission();
}

// auto remind today target when app shows
setTimeout(()=>{ if(dashboard.style.display !== 'none') tryNotify('Time to save today!'); }, 2000);