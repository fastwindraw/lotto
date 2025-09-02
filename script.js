// --- Global Variables ---
let currentUser = null;
let users = JSON.parse(localStorage.getItem('lottoUsers')) || {};
let adminPIN = "2020"; // Admin PIN
let selectedLottoNumbers = [];
let drawInterval;
let countdownInterval;
let timeLeft = 0; // seconds
let drawStarted = false;
let currentDrawNumbers = [];
let userBets = JSON.parse(localStorage.getItem('lottoUserBets')) || {};
let drawHistory = JSON.parse(localStorage.getItem('lottoDrawHistory')) || [];

const MAX_NUMBER_SELECTION = 6;
const NUMBER_RANGE_MAX = 99;
const DRAW_DURATION_SECONDS = 10 * 60; // 10 minutes

// --- DOM Elements ---
const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authMessage = document.getElementById('auth-message');

const dashboardSection = document.getElementById('dashboard-section');
const welcomeMessage = document.getElementById('welcome-message');
const dashboardAccountNo = document.getElementById('dashboard-account-no');
const dashboardBalance = document.getElementById('dashboard-balance');
const numberGrid = document.getElementById('number-grid');
const selectedNumbersSpan = document.getElementById('selected-numbers');
const stakeAmountInput = document.getElementById('stake-amount');
const placeBetBtn = document.getElementById('place-bet-btn');
const lottoMessage = document.getElementById('lotto-message');
const drawStatus = document.getElementById('draw-status');
const countdownTimer = document.getElementById('countdown-timer');
const startDrawBtn = document.getElementById('start-draw-btn');
const lastDrawNumbers = document.getElementById('last-draw-numbers');
const userLastResult = document.getElementById('user-last-result');
const drawHistoryList = document.getElementById('draw-history-list');
const userBetsList = document.getElementById('user-bets-list');

const withdrawSection = document.getElementById('withdraw-section');
const withdrawBalance = document.getElementById('withdraw-balance');
const withdrawMinMessage = document.getElementById('withdraw-min-message');
const withdrawAmountInput = document.getElementById('withdraw-amount');
const bankNameInput = document.getElementById('bank-name');
const accountNameInput = document.getElementById('account-name');
const accountNumberInput = document.getElementById('account-number');
const withdrawMessage = document.getElementById('withdraw-message');

const adminCreditSection = document.getElementById('admin-credit-section');
const adminPinInput = document.getElementById('admin-pin');
const adminCreditForm = document.getElementById('admin-credit-form');
const creditAccountNoInput = document.getElementById('credit-account-no');
const creditAmountInput = document.getElementById('credit-amount');
const adminMessage = document.getElementById('admin-message');

const welcomePopup = document.getElementById('welcome-popup');
const notificationPopup = document.getElementById('notification-popup');
const notificationTitle = document.getElementById('notification-title');
const notificationText = document.getElementById('notification-text');

// --- Utility Functions ---
function generateAccountNo() {
    return Array(11).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
}

function showAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.style.color = isError ? 'red' : 'green';
}

function showLottoMessage(message, isError = false) {
    lottoMessage.textContent = message;
    lottoMessage.style.color = isError ? 'red' : 'green';
}

function showAdminMessage(message, isError = false) {
    adminMessage.textContent = message;
    adminMessage.style.color = isError ? 'red' : 'green';
}

function showNotification(title, text) {
    notificationTitle.textContent = title;
    notificationText.textContent = text;
    notificationPopup.style.display = 'flex';
}

function hideNotificationPopup() {
    notificationPopup.style.display = 'none';
}

function saveUsers() {
    localStorage.setItem('lottoUsers', JSON.stringify(users));
}

function saveUserBets() {
    localStorage.setItem('lottoUserBets', JSON.stringify(userBets));
}

function saveDrawHistory() {
    localStorage.setItem('lottoDrawHistory', JSON.stringify(drawHistory));
}

// --- Authentication ---
function showRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    authMessage.textContent = '';
}

function showLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    authMessage.textContent = '';
}

function registerUser() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (!username || !email || !password || !confirmPassword) {
        showAuthMessage("Please fill in all fields.", true);
        return;
    }
    if (password !== confirmPassword) {
        showAuthMessage("Passwords do not match.", true);
        return;
    }
    if (Object.values(users).some(user => user.email === email)) {
        showAuthMessage("Email already registered.", true);
        return;
    }

    const accountNo = generateAccountNo();
    users[accountNo] = {
        username,
        email,
        password, // In a real app, hash this password!
        accountNo,
        balance: 0,
        bets: []
    };
    saveUsers();
    showAuthMessage(`Registration successful! Your Account Number is: ${accountNo}. Please login.`);
    showLoginForm();
    document.getElementById('login-account-no').value = accountNo;
}

function loginUser() {
    const accountNo = document.getElementById('login-account-no').value;
    const password = document.getElementById('login-password').value;

    if (!accountNo || !password) {
        showAuthMessage("Please enter account number and password.", true);
        return;
    }
    if (!users[accountNo] || users[accountNo].password !== password) {
        showAuthMessage("Invalid account number or password.", true);
        return;
    }

    currentUser = users[accountNo];
    authSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    adminCreditSection.style.display = 'block'; // Show admin panel on dashboard for this demo
    updateDashboard();
    showWelcomePopup();
    initDashboard();
}

function logoutUser() {
    currentUser = null;
    dashboardSection.style.display = 'none';
    adminCreditSection.style.display = 'none';
    authSection.style.display = 'flex'; // Center the auth section
    showLoginForm();
    resetLottoGame(); // Clear any ongoing draws/selections
}

function showWelcomePopup() {
    welcomePopup.style.display = 'flex';
}

function hideWelcomePopup() {
    welcomePopup.style.display = 'none';
}

// --- Dashboard Functions ---
function updateDashboard() {
    if (currentUser) {
        welcomeMessage.textContent = `Hello, ${currentUser.username}!`;
        dashboardAccountNo.textContent = currentUser.accountNo;
        dashboardBalance.textContent = currentUser.balance.toFixed(2);
        renderUserBets();
    }
}

function generateNumberGrid() {
    numberGrid.innerHTML = '';
    for (let i = 1; i <= NUMBER_RANGE_MAX; i++) {
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('lotto-number');
        numberDiv.textContent = i.toString().padStart(2, '0');
        numberDiv.dataset.number = i;
        numberDiv.addEventListener('click', () => toggleNumberSelection(i));
        numberGrid.appendChild(numberDiv);
    }
}

function toggleNumberSelection(number) {
    const index = selectedLottoNumbers.indexOf(number);
    const numberDiv = numberGrid.querySelector(`[data-number="${number}"]`);

    if (index > -1) {
        selectedLottoNumbers.splice(index, 1);
        numberDiv.classList.remove('selected');
    } else {
        if (selectedLottoNumbers.length < MAX_NUMBER_SELECTION) {
            selectedLottoNumbers.push(number);
            numberDiv.classList.add('selected');
        } else {
            showLottoMessage(`You can only select ${MAX_NUMBER_SELECTION} numbers.`, true);
        }
    }
    updateSelectedNumbersDisplay();
}

function updateSelectedNumbersDisplay() {
    selectedLottoNumbers.sort((a, b) => a - b);
    selectedNumbersSpan.textContent = selectedLottoNumbers.length > 0 ?
        selectedLottoNumbers.map(n => n.toString().padStart(2, '0')).join(', ') :
        'None';
}

function quickPick() {
    clearSelection();
    let numbers = new Set();
    while (numbers.size < MAX_NUMBER_SELECTION) {
        numbers.add(Math.floor(Math.random() * NUMBER_RANGE_MAX) + 1);
    }
    selectedLottoNumbers = Array.from(numbers).sort((a, b) => a - b);
    selectedLottoNumbers.forEach(num => {
        numberGrid.querySelector(`[data-number="${num}"]`).classList.add('selected');
    });
    updateSelectedNumbersDisplay();
    showLottoMessage('Quick Pick numbers generated!');
}

function clearSelection() {
    selectedLottoNumbers = [];
    document.querySelectorAll('.lotto-number.selected').forEach(div => {
        div.classList.remove('selected');
    });
    updateSelectedNumbersDisplay();
    showLottoMessage('');
}

function placeBet() {
    if (!currentUser) {
        showLottoMessage("Please login to place a bet.", true);
        return;
    }
    if (selectedLottoNumbers.length !== MAX_NUMBER_SELECTION) {
        showLottoMessage(`Please select exactly ${MAX_NUMBER_SELECTION} numbers.`, true);
        return;
    }

    const stake = parseFloat(stakeAmountInput.value);
    if (isNaN(stake) || stake < 50) {
        showLottoMessage("Minimum stake is 50 NGN.", true);
        return;
    }
    if (currentUser.balance < stake) {
        showLottoMessage("Insufficient balance.", true);
        return;
    }
    if (!drawStarted) {
        showLottoMessage("The draw has not started yet. Click 'Start Draw' first!", true);
        return;
    }

    currentUser.balance -= stake;
    const betId = Date.now().toString(); // Unique ID for the bet
    const bet = {
        betId,
        numbers: [...selectedLottoNumbers],
        stake,
        drawTime: new Date(Date.now() + timeLeft * 1000).toLocaleString(), // When this bet's draw will conclude
        status: 'Pending',
        result: null,
        winnings: 0
    };

    if (!userBets[currentUser.accountNo]) {
        userBets[currentUser.accountNo] = [];
    }
    userBets[currentUser.accountNo].push(bet);

    saveUsers();
    saveUserBets();
    updateDashboard();
    showLottoMessage(`Bet placed successfully for ${stake.toFixed(2)} NGN! Good luck!`);
    clearSelection();
    stakeAmountInput.value = 100; // Reset stake
}

// --- Draw Functions ---
function startDraw() {
    if (drawStarted) {
        showLottoMessage("Draw is already in progress.", true);
        return;
    }

    drawStarted = true;
    startDrawBtn.disabled = true;
    placeBetBtn.disabled = false;
    drawStatus.textContent = "Draw in progress...";
    timeLeft = DRAW_DURATION_SECONDS;
    updateCountdownDisplay();
    countdownInterval = setInterval(updateCountdown, 1000);

    drawInterval = setTimeout(() => {
        executeDraw();
        clearInterval(countdownInterval);
        drawStarted = false;
        startDrawBtn.disabled = false;
        placeBetBtn.disabled = true;
        drawStatus.textContent = "Draw not started.";
        showNotification("Draw Complete!", "The winning numbers have been announced!");
    }, DRAW_DURATION_SECONDS * 1000);

    showLottoMessage("New draw started! You have 10 minutes to place your bets.", false);
}


function updateCountdown() {
    timeLeft--;
    updateCountdownDisplay();
    if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        countdownTimer.textContent = "00:00";
    }
}

function updateCountdownDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    countdownTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function generateWinningNumbers() {
    let numbers = new Set();
    while (numbers.size < MAX_NUMBER_SELECTION) {
        numbers.add(Math.floor(Math.random() * NUMBER_RANGE_MAX) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
}

function executeDraw() {
    currentDrawNumbers = generateWinningNumbers();
    lastDrawNumbers.textContent = `Winning Numbers: ${currentDrawNumbers.map(n => n.toString().padStart(2, '0')).join(', ')}`;
    console.log("Winning Numbers:", currentDrawNumbers);

    const drawResult = {
        drawId: Date.now(),
        numbers: currentDrawNumbers,
        timestamp: new Date().toLocaleString()
    };
    drawHistory.unshift(drawResult);
    saveDrawHistory();
    renderDrawHistory();

    // Process all pending bets for all users
    for (const accountNo in userBets) {
        if (userBets.hasOwnProperty(accountNo)) {
            userBets[accountNo] = userBets[accountNo].map(bet => {
                // Check if the bet was placed for this specific draw
                // This is a simplified check for the current draw. In a multi-draw system, you'd link bets to draw IDs.
                // For this implementation, we assume all pending bets are for the just-concluded draw.
                if (bet.status === 'Pending') {
                    const matchedNumbers = bet.numbers.filter(num => currentDrawNumbers.includes(num));
                    const matchCount = matchedNumbers.length;
                    let winnings = 0;
                    let resultText = `Matched ${matchCount} numbers.`;

                    // Simple prize tiers (customize as needed)
                    if (matchCount === 6) {
                        winnings = bet.stake * 1000; // Jackpot
                        resultText = `JACKPOT! Matched all 6 numbers!`;
                    } else if (matchCount === 5) {
                        winnings = bet.stake * 100;
                    } else if (matchCount === 4) {
                        winnings = bet.stake * 10;
                    } else if (matchCount === 3) {
                        winnings = bet.stake * 2;
                    }

                    if (winnings > 0) {
                        users[accountNo].balance += winnings;
                        bet.status = 'Win';
                        bet.winnings = winnings;
                        showNotification("Congratulations!", `You won ${winnings.toFixed(2)} NGN!`);
                    } else {
                        bet.status = 'Loss';
                        bet.winnings = 0; // Explicitly set to 0 for losses
                        // No notification for loss to avoid spam for all users
                    }
                    bet.result = resultText;
                }
                return bet;
            });
        }
    }

    saveUsers();
    saveUserBets();
    updateDashboard();
    checkUserLastResult();
}

function checkUserLastResult() {
    if (currentUser && userBets[currentUser.accountNo] && userBets[currentUser.accountNo].length > 0) {
        const lastBet = userBets[currentUser.accountNo].slice(-1)[0];
        if (lastBet.result) {
            userLastResult.textContent = `Your Last Bet: ${lastBet.result} ${lastBet.winnings > 0 ? `Won ${lastBet.winnings.toFixed(2)} NGN` : ''}`;
            userLastResult.style.color = lastBet.status === 'Win' ? 'green' : 'red';
        } else {
            userLastResult.textContent = "No result for your last bet yet.";
            userLastResult.style.color = 'black';
        }
    } else {
        userLastResult.textContent = "";
    }
}


function renderUserBets() {
    userBetsList.innerHTML = '';
    if (currentUser && userBets[currentUser.accountNo] && userBets[currentUser.accountNo].length > 0) {
        userBets[currentUser.accountNo].forEach(bet => {
            const betDiv = document.createElement('div');
            betDiv.classList.add('user-bet-item', bet.status.toLowerCase());
            betDiv.innerHTML = `
                <p><strong>Numbers:</strong> ${bet.numbers.map(n => n.toString().padStart(2, '0')).join(', ')}</p>
                <p><strong>Stake:</strong> ${bet.stake.toFixed(2)} NGN</p>
                <p><strong>Status:</strong> ${bet.status}</p>
                ${bet.result ? `<p><strong>Result:</strong> ${bet.result} ${bet.winnings > 0 ? `(+${bet.winnings.toFixed(2)} NGN)` : ''}</p>` : ''}
            `;
            userBetsList.appendChild(betDiv);
        });
    } else {
        userBetsList.innerHTML = '<p>No bets placed yet.</p>';
    }
}

function renderDrawHistory() {
    drawHistoryList.innerHTML = '';
    drawHistory.slice(0, 5).forEach(draw => { // Show last 5 draws
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>Draw ID ${draw.drawId}:</strong> ${draw.numbers.map(n => n.toString().padStart(2, '0')).join(', ')}
            <br><small>${draw.timestamp}</small>
        `;
        drawHistoryList.appendChild(listItem);
    });
}

function resetLottoGame() {
    clearInterval(countdownInterval);
    clearTimeout(drawInterval);
    selectedLottoNumbers = [];
    drawStarted = false;
    currentDrawNumbers = [];
    timeLeft = 0;

    countdownTimer.textContent = "00:00";
    drawStatus.textContent = "Draw not started.";
    startDrawBtn.disabled = false;
    placeBetBtn.disabled = true;
    selectedNumbersSpan.textContent = 'None';
    lottoMessage.textContent = '';
    document.querySelectorAll('.lotto-number.selected').forEach(div => div.classList.remove('selected'));
}

// --- Withdrawal Functions ---
function showWithdrawForm() {
    if (!currentUser) {
        showLottoMessage("Please login to withdraw.", true);
        return;
    }
    dashboardSection.style.display = 'none';
    adminCreditSection.style.display = 'none';
    withdrawSection.style.display = 'flex';
    withdrawBalance.textContent = currentUser.balance.toFixed(2);
    withdrawMinMessage.textContent = `Minimum withdrawal: 20,000.00 NGN`;
    withdrawAmountInput.value = '';
    bankNameInput.value = '';
    accountNameInput.value = '';
    accountNumberInput.value = '';
    withdrawMessage.textContent = '';
}

function hideWithdrawForm() {
    withdrawSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    adminCreditSection.style.display = 'block';
    updateDashboard();
}

function submitWithdrawal() {
    if (!currentUser) {
        withdrawMessage.textContent = "Please login to withdraw.", true;
        return;
    }

    const amount = parseFloat(withdrawAmountInput.value);
    const bankName = bankNameInput.value.trim();
    const accountName = accountNameInput.value.trim();
    const bankAccountNumber = accountNumberInput.value.trim();

    if (isNaN(amount) || amount < 20000) {
        withdrawMessage.textContent = "Withdrawal amount must be at least 20,000 NGN.", true;
        return;
    }
    if (currentUser.balance < amount) {
        withdrawMessage.textContent = "Insufficient balance.", true;
        return;
    }
    if (!bankName || !accountName || !bankAccountNumber) {
        withdrawMessage.textContent = "Please fill in all bank details.", true;
        return;
    }

    // Simulate withdrawal (in a real app, this would be an API call)
    currentUser.balance -= amount;
    saveUsers();
    updateDashboard(); // Update dashboard balance
    showNotification("Withdrawal Request Submitted!", `Your request for ${amount.toFixed(2)} NGN to ${bankName} (${bankAccountNumber}) has been submitted.`);
    withdrawMessage.textContent = "Withdrawal request submitted successfully! Funds will be processed shortly.", false;

    // Optional: Hide form after success or keep it open for more withdrawals
    setTimeout(hideWithdrawForm, 3000);
}

// --- Admin Panel Functions ---
function verifyAdminPin() {
    const pin = adminPinInput.value;
    if (pin === adminPIN) {
        adminCreditForm.style.display = 'block';
        adminPinInput.style.display = 'none'; // Hide PIN input after verification
        showAdminMessage("Admin PIN verified. You can now credit accounts.");
    } else {
        showAdminMessage("Invalid Admin PIN.", true);
    }
}

function creditUserAccount() {
    const accountNo = creditAccountNoInput.value;
    const amount = parseFloat(creditAmountInput.value);

    if (!accountNo || !amount || isNaN(amount) || amount <= 0) {
        showAdminMessage("Please enter a valid account number and amount.", true);
        return;
    }
    if (!users[accountNo]) {
        showAdminMessage("User with this account number not found.", true);
        return;
    }

    users[accountNo].balance += amount;
    saveUsers();
    showAdminMessage(`Successfully credited ${amount.toFixed(2)} NGN to account ${accountNo}.`);
    // If the admin is also the current user, update their dashboard
    if (currentUser && currentUser.accountNo === accountNo) {
        updateDashboard();
    }
    creditAmountInput.value = ''; // Clear amount
}

function hideAdminCreditForm() {
    adminCreditForm.style.display = 'none';
    adminPinInput.style.display = 'block'; // Show PIN input again for next credit session
    adminPinInput.value = '';
    adminMessage.textContent = '';
    creditAccountNoInput.value = '';
    creditAmountInput.value = '';
}

// --- Initialization ---
function initDashboard() {
    generateNumberGrid();
    renderDrawHistory();
    checkUserLastResult();
    placeBetBtn.disabled = true; // Disable until draw starts
    // If a draw was previously started and the page refreshed, you'd need logic to resume it.
    // For this simple demo, starting a new draw is assumed.
}

// Check if user is already logged in (e.g., from a previous session)
document.addEventListener('DOMContentLoaded', () => {
    // Attempt to retrieve a "last logged in" user or session token here
    // For this demo, we'll just start at the login screen.
    authSection.style.display = 'flex'; // Ensure auth section is visible initially and centered
    initDashboard(); // Initialize dashboard components even if not logged in to prepare them
});