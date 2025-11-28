let mode = "login";
let users = JSON.parse(localStorage.getItem("users") || "{}");
let currentUser = localStorage.getItem("currentUser");

window.onload = () => {
    if (currentUser && users[currentUser]) openDashboard(currentUser);
    else document.getElementById("authContainer").classList.remove("hidden");
};

function switchAuth() {
    if (mode === "login") {
        mode = "signup";
        authTitle.innerHTML = "Create Account";
        authBtn.innerHTML = "Create";
        authGoal.classList.remove("hidden");
        switchText.innerHTML = "Already have account? Login";
    } else {
        mode = "login";
        authTitle.innerHTML = "Login";
        authBtn.innerHTML = "Login";
        authGoal.classList.add("hidden");
        switchText.innerHTML = "Create New Account?";
    }
}

function authAction() {
    let user = authUsername.value;
    let pass = authPassword.value;

    if (!user || !pass) return alert("Enter full details");

    if (mode === "signup") {
        let goal = Number(authGoal.value);
        users[user] = { pass, goal, saved: {}, totalSaved: 0 };
        localStorage.setItem("users", JSON.stringify(users));
        alert("Account Created!");
        switchAuth();
    } else {
        if (!users[user]) return alert("No account found!");
        if (users[user].pass !== pass) return alert("Wrong password!");

        localStorage.setItem("currentUser", user);
        openDashboard(user);
    }
}

function openDashboard(user) {
    document.getElementById("authContainer").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    let u = users[user];

    welcomeUser.innerHTML = "Welcome, " + user;
    monthlyGoal.innerHTML = u.goal;
    totalSaved.innerHTML = u.totalSaved;

    updateProgress(user);
    generateCalendar(user);
    todayTarget.innerHTML = Math.round(u.goal / 30);
}

function addToday() {
    let amt = Number(addAmount.value);
    if (!amt) return;

    let user = currentUser;
    let u = users[user];
    let today = new Date().getDate();

    u.saved[today] = (u.saved[today] || 0) + amt;
    u.totalSaved += amt;

    localStorage.setItem("users", JSON.stringify(users));

    totalSaved.innerHTML = u.totalSaved;
    updateProgress(user);
    generateCalendar(user);

    addAmount.value = "";
}

function generateCalendar(user) {
    let u = users[user];
    calendar.innerHTML = "";
    let days = new Date().getDate();

    for (let i = 1; i <= 31; i++) {
        let day = document.createElement("div");
        day.innerHTML = i;

        if (u.saved[i]) day.classList.add("savedDay");
        calendar.appendChild(day);
    }
}

function updateProgress(user) {
    let u = users[user];
    let percent = (u.totalSaved / u.goal) * 100;
    progressFill.style.width = percent + "%";
}

function logout() {
    localStorage.removeItem("currentUser");
    location.reload();
}

function closeEyes() {
    peekImage.style.opacity = "0.1";
}