// ===== Login System =====
let loginContainer = document.getElementById('login-container');
let dashboardContainer = document.getElementById('dashboard-container');
let loginBtn = document.getElementById('login-btn');
let loginMsg = document.getElementById('login-msg');

loginBtn.addEventListener('click', ()=>{
  let username = document.getElementById('username').value.trim();
  let password = document.getElementById('password').value.trim();
  if(!username || !password) return loginMsg.innerText = "Enter username & password";

  let storedUser = JSON.parse(localStorage.getItem('user'));
  if(storedUser){
    if(storedUser.username === username && storedUser.password === password){
      loginMsg.innerText = "Login successful!";
      startDashboard();
    } else {
      loginMsg.innerText = "Incorrect username or password!";
    }
  } else {
    // Create new user
    localStorage.setItem('user', JSON.stringify({username, password}));
    loginMsg.innerText = "Account created! Logging in...";
    startDashboard();
  }
});

// ===== Dashboard Setup =====
function startDashboard(){
  loginContainer.style.display = 'none';
  dashboardContainer.style.display = 'block';
  setupSavings();
}

// ===== Savings Tracker =====
function setupSavings(){
  let monthlyGoal = 25000;
  let today = new Date();
  let month = today.getMonth();
  let year = today.getFullYear();
  let dayNum = today.getDate();
  let daysInMonth = new Date(year, month+1,0).getDate();

  let savedData = JSON.parse(localStorage.getItem('savedData')) || {total:0, days:[]};
  let targets = JSON.parse(localStorage.getItem('targets')) || [];

  // Generate targets if empty
  if(targets.length ===0){
    let remaining = monthlyGoal;
    for(let i=1;i<=daysInMonth;i++){
      let maxDaily = Math.min(1000, remaining-(daysInMonth-i)*100);
      let minDaily = Math.max(50, Math.floor(remaining/daysInMonth));
      let amt = Math.floor(Math.random()*(maxDaily-minDaily+1)+minDaily);
      remaining -= amt;
      targets.push(amt);
    }
    localStorage.setItem('targets', JSON.stringify(targets));
  }

  document.getElementById('today-target').innerText = `💵 Today's Target: Rs ${targets[dayNum-1]}`;
  document.getElementById('total').innerText = `Total Saved: Rs ${savedData.total}`;

  updateProgress(savedData.total, monthlyGoal);

  // Calendar
  let calendar = document.getElementById('calendar');
  calendar.innerHTML='';
  for(let i=1;i<=daysInMonth;i++){
    let day = document.createElement('div');
    day.className='day';
    day.innerText=i;
    if(savedData.days[i-1]) day.classList.add('saved');
    calendar.appendChild(day);
  }

  // Save Money
  document.getElementById('save-btn').addEventListener('click', ()=>{
    let amt = parseInt(document.getElementById('amount').value);
    if(!amt) return alert("Enter amount first!");
    savedData.total += amt;
    savedData.days[dayNum-1]=true;
    localStorage.setItem('savedData', JSON.stringify(savedData));
    animateCoins();
    document.getElementById('total').innerText = `Total Saved: Rs ${savedData.total}`;
    updateProgress(savedData.total, monthlyGoal);
    calendar.children[dayNum-1].classList.add('saved');
    alert(`✅ You added Rs ${amt} today!`);
  });

  // Reset
  document.getElementById('reset-btn').addEventListener('click', ()=>{
    if(confirm("Reset month? All data lost.")){
      localStorage.removeItem('savedData');
      localStorage.removeItem('targets');
      location.reload();
    }
  });

  // Mode
  document.getElementById('mode-btn').addEventListener('click', ()=>document.body.classList.toggle('dark'));

  // Daily Notification
  if(Notification.permission!=="granted") Notification.requestPermission();
  else new Notification("💸 Savings Reminder",{body:`Today save Rs ${targets[dayNum-1]}!`});
}

// ===== Functions =====
function updateProgress(total, goal){
  let percent = Math.min(100, Math.floor(total/goal*100));
  let progress = document.getElementById('progress');
  progress.style.width=percent+'%';
  progress.innerText = percent + '%';
}

function animateCoins(){
  for(let i=0;i<10;i++){
    let coin = document.createElement('div');
    coin.className='coins';
    coin.style.left=Math.random()*window.innerWidth+'px';
    document.body.appendChild(coin);
    setTimeout(()=>coin.remove(),2000);
  }
}