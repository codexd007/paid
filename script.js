// modern login interactions + multi-user localStorage
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const quickDemoBtn = document.getElementById('quickDemo');
const msgEl = document.getElementById('msg');
const character = document.getElementById('character');
const togglePw = document.getElementById('togglePw');

const CHAR_SMILE = "https://upload.wikimedia.org/wikipedia/commons/2/21/Smiling_Face_with_Open_Mouth_Emoji.png";
const CHAR_EYE_COVER = "https://upload.wikimedia.org/wikipedia/commons/2/2e/Face_with_no_mouth_emoji.png";
const CHAR_WINK = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Emoji_u1f609.svg/240px-Emoji_u1f609.svg.png";

// helper: load users
function loadUsers(){ return JSON.parse(localStorage.getItem('sav_users')||'{}'); }
function saveUsers(u){ localStorage.setItem('sav_users', JSON.stringify(u)); }

// character react functions
function setSmile(){ character.src = CHAR_SMILE; character.classList.add('ch-smile'); setTimeout(()=>character.classList.remove('ch-smile'),600); }
function setPeek(){ character.src = CHAR_EYE_COVER; character.classList.add('ch-peek'); setTimeout(()=>character.classList.remove('ch-peek'),600); }
function setWink(){ character.src = CHAR_WINK; character.classList.add('ch-shy'); setTimeout(()=>character.classList.remove('ch-shy'),700); }

// input listeners
usernameEl.addEventListener('input', e=>{
  if(e.target.value.trim().length) setSmile();
});
passwordEl.addEventListener('input', e=>{
  if(e.target.value.length) setPeek();
});

// toggle show/hide password with char reaction
let pwVisible = false;
togglePw.addEventListener('click', ()=>{
  pwVisible = !pwVisible;
  passwordEl.type = pwVisible ? 'text' : 'password';
  togglePw.textContent = pwVisible ? '' : '';
  // when showing password - wink the character
  setWink();
});

// login / create
loginBtn.addEventListener('click', ()=>{
  const u = usernameEl.value.trim();
  const p = passwordEl.value;
  msgEl.textContent = '';
  if(!u || !p){ msgEl.textContent = 'Please enter username and password'; return; }

  let users = loadUsers();
  if(users[u]){
    // user exists -> authenticate
    if(users[u].password === p){
      msgEl.style.color = 'green';
      msgEl.textContent = 'Login successful — opening...';
      setTimeout(()=> {
        setWink();
        openDashboard(u);
      }, 450);
    } else {
      msgEl.style.color = '#d33';
      msgEl.textContent = 'Incorrect password';
      setPeek();
    }
  } else {
    // create new user (prompt monthly goal)
    let goal = prompt("Create account — set your monthly saving goal (e.g., 25000):", "25000");
    if(!goal) { msgEl.textContent='Account creation cancelled'; return; }
    users[u] = { password: p, monthlyGoal: parseInt(goal)||25000, saved: { total:0, days:[] } };
    saveUsers(users);
    msgEl.style.color = 'green';
    msgEl.textContent = 'Account created — opening...';
    setTimeout(()=> {
      setSmile();
      openDashboard(u);
    }, 450);
  }
});

// Demo quick account (preload example)
quickDemoBtn.addEventListener('click', ()=>{
  const demo = 'demouser';
  const demoP = 'demo';
  let users = loadUsers();
  if(!users[demo]){
    users[demo] = { password: demoP, monthlyGoal:25000, saved:{total:0,days:[] } };
    saveUsers(users);
  }
  usernameEl.value = demo;
  passwordEl.value = demoP;
  setSmile();
  setTimeout(()=> loginBtn.click(), 350);
});

// fake open dashboard - here we just show a success modal (replace with real route)
function openDashboard(username){
  // For this demo we do not navigate away. Show small success animation and message.
  document.body.style.transition = 'filter .4s';
  document.body.style.filter = 'blur(2px) saturate(1.05)';
  const success = document.createElement('div');
  success.style = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:linear-gradient(90deg,#7ef0b1,#3ad59f);padding:24px;border-radius:14px;box-shadow:0 18px 44px rgba(10,20,30,0.18);font-weight:700;color:#023;";
  success.innerHTML = `Welcome, ${username}! <br> Dashboard would open here.`;
  document.body.appendChild(success);
  setTimeout(()=> {
    document.body.style.filter = '';
    success.remove();
    // Reset form safely
    usernameEl.value=''; passwordEl.value='';
    setSmile();
  }, 1400);
}

// small accessibility: enter triggers login
[usernameEl,passwordEl].forEach(el=>el.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') loginBtn.click();
}));