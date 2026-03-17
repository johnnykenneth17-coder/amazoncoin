// Dashboard functions

// FORCE LOAD CURRENT TAB ON PAGE LOAD / REFRESH
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Dashboard DOMContentLoaded → checking current tab");

  const user = await checkAuth();
  if (!user) {
    console.warn("No authenticated user on DOMContentLoaded");
    return;
  }

  // Small delay to make sure DOM + functions are fully ready
  setTimeout(async () => {
    const activeSectionElement = document.querySelector(
      ".content-section.active",
    );
    if (!activeSectionElement) {
      console.warn("No active content-section found on load");
      return;
    }

    const sectionId = activeSectionElement.id; // e.g. "dashboard-section"
    const sectionName = sectionId.replace("-section", ""); // e.g. "dashboard"

    console.log(`Initial tab detected: ${sectionName}`);

    switch (sectionName) {
      case "dashboard":
        await loadDashboardData(); // your main dashboard loader
        break;

      case "investments":
        await loadAllInvestments(user.id);
        break;

      case "mining":
        await loadMiningStats(user.id);
        break;

      case "transactions":
        await loadAllTransactions(user.id);
        break;

      case "referrals":
        await loadReferralStats(user.id);
        await loadReferralList(user.id);
        break;

      case "wallet":
        await loadWalletBalance(user.id);
        await loadWalletTransactions(user.id);
        break;

      case "live-support":
        await loadLiveChatMessages();
        await startLiveChatSubscription();
        break;

      case "support":
        await loadSupportTickets(user.id);
        break;

      case "settings":
        await loadUserSettings(user.id);
        break;

      default:
        console.log(`No initial loader for section: ${sectionName}`);
    }
  }, 100); // 100ms delay – safe value
});

// === DEBUG WRAPPER ===
document.addEventListener("DOMContentLoaded", async () => {
  console.log("📄 dashboard.html DOMContentLoaded fired");

  const user = await checkAuth();
  console.log("✅ checkAuth returned:", user);

  if (user) {
    console.log("🚀 Starting loadDashboardData...");
    await loadDashboardData();
  } else {
    console.error("❌ No user after checkAuth – redirecting to login");
    window.location.href = "login.html";
  }
});

// Load dashboard data
async function loadDashboardData() {
  /*const {
    data: { user },
  } = await window.supabaseClient.auth.getUser();*/
  try {
    const user = await getUserProfile();
    //if (!user) return;

    if (!user) {
      console.error("❌ No profile data – dashboard cannot render");
      document.getElementById("userName").textContent = "Error loading profile";
      return;
    }

    // Update user info
    document.getElementById("userName").textContent =
      user.full_name || user.username;
    document.getElementById("walletBalance").textContent = formatBTC(
      user.wallet_balance,
    );
    document.getElementById("miningPower").textContent = formatHashrate(
      user.mining_power,
    );
    document.getElementById("referralCode").value = user.referral_code || "";

    // Optional:  active miners count (if you want to hide real number temporarily)
    simulateActiveMiners();

    // Replace or add after loading real mining stats
    loadAndSimulateDailyEarnings(user.id);

    // Load investments
    await loadInvestments(user.id);

    // Load recent transactions
    await loadRecentTransactions(user.id);

    //await loadAllTransactions(user.Id);

    // Load mining stats
    await loadMiningStats(user.id);

    // Load referral stats
    await loadReferralStats(user.id);

    // Load notifications
    await loadNotifications(user.id);

    // Start real-time updates
    startRealTimeUpdates(user.id);
  } catch (error) {
    console.error("Load dashboard error:", error);
    console.error("💥 CRITICAL ERROR in loadDashboardData:", error);
    showError("Failed to load dashboard data");
    alert("Dashboard failed to load: " + error.message);
  }
}

// Mobile menu toggle
// Mobile Menu Toggle
/*document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (!menuBtn || !sidebar) return;

  function toggleMenu() {
    sidebar.classList.toggle("active");
    overlay?.classList.toggle("active");
    document.body.style.overflow = sidebar.classList.contains("active")
      ? "hidden"
      : "";
  }

  menuBtn.addEventListener("click", toggleMenu);
  overlay?.addEventListener("click", toggleMenu);

  // Close on link click (mobile)
  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 860) {
        toggleMenu();
      }
    });
  });
});*/

// Mobile Menu Functionality
document.addEventListener("DOMContentLoaded", function () {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (mobileMenuBtn && sidebar && overlay) {
    // Toggle menu function
    function toggleMobileMenu() {
      sidebar.classList.toggle("active");
      overlay.classList.toggle("active");

      // Change icon
      const icon = mobileMenuBtn.querySelector("i");
      if (sidebar.classList.contains("active")) {
        icon.className = "fas fa-times";
        document.body.style.overflow = "hidden";
      } else {
        icon.className = "fas fa-bars";
        document.body.style.overflow = "";
      }
    }

    // Click menu button
    mobileMenuBtn.addEventListener("click", toggleMobileMenu);

    // Click overlay to close
    overlay.addEventListener("click", toggleMobileMenu);

    // Close menu when clicking any sidebar link
    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 800) {
          sidebar.classList.remove("active");
          overlay.classList.remove("active");
          mobileMenuBtn.querySelector("i").className = "fas fa-bars";
          document.body.style.overflow = "";
        }
      });
    });

    // Handle window resize
    window.addEventListener("resize", function () {
      if (window.innerWidth > 800) {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
  }

  // Update mobile user name in sidebar
  updateSidebarUserName();

  // Update notification badge
  updateMobileNotificationBadge();
});

// Update sidebar user name
async function updateSidebarUserName() {
  try {
    const user = await getUserProfile();
    const userNameEl = document.getElementById("userName");
    if (userNameEl && user) {
      userNameEl.textContent = user.full_name || user.username || "User";
    }
  } catch (error) {
    console.error("Error updating user name:", error);
  }
}

// Mobile notifications toggle
function toggleMobileNotifications() {
  const dropdown = document.getElementById("notificationsDropdown");
  if (dropdown) {
    if (dropdown.style.display === "block") {
      dropdown.style.display = "none";
    } else {
      // Style dropdown for mobile
      dropdown.style.position = "fixed";
      dropdown.style.top = "70px";
      dropdown.style.left = "10px";
      dropdown.style.right = "10px";
      dropdown.style.width = "auto";
      dropdown.style.maxWidth = "none";
      dropdown.style.zIndex = "10000";
      dropdown.style.display = "block";
    }
  }
}

// Update mobile notification badge
async function updateMobileNotificationBadge() {
  try {
    const user = await getUserProfile();
    if (user && user.id) {
      const { count, error } = await supabaseClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (!error) {
        const badge = document.getElementById("mobileNotificationBadge");
        if (badge) {
          badge.textContent = count || 0;
          badge.style.display = count > 0 ? "flex" : "none";
        }
      }
    }
  } catch (error) {
    console.error("Error updating notification badge:", error);
  }
}

// Override loadNotifications to update mobile badge
const originalLoadNotifications = loadNotifications;
loadNotifications = async function (userId) {
  await originalLoadNotifications(userId);
  await updateMobileNotificationBadge();
};

// Close mobile notifications when clicking outside
document.addEventListener("click", function (event) {
  if (window.innerWidth <= 800) {
    const dropdown = document.getElementById("notificationsDropdown");
    const notifBtn = event.target.closest(".mobile-action-btn");

    if (dropdown && dropdown.style.display === "block" && !notifBtn) {
      dropdown.style.display = "none";
    }
  }
});

// ────────────────────────────────────────────────
// Real daily earnings + client-side visual simulation
// ────────────────────────────────────────────────
let earningsSimulationInterval = null;
let currentDisplayedEarnings = 0;

async function loadAndSimulateDailyEarnings(userId) {
  try {
    // 1. Get real data from backend
    const { data: sessions } = await supabaseClient
      .from("mining_sessions")
      .select("mining_power")
      .eq("user_id", userId)
      .eq("status", "active");

    const totalPower =
      sessions?.reduce((sum, s) => sum + Number(s.mining_power || 0), 0) || 0;

    // 2. Calculate realistic daily earnings (your real formula)
    // Example: adjust multiplier to match your expected daily ROI
    const realDailyEstimate = (totalPower * 0.00000042).toFixed(8); // ~0.000042 BTC per GH/s per day

    // 3. If no active power → no simulation
    if (totalPower <= 0 || Number(realDailyEstimate) <= 0) {
      const earningsEl = document.getElementById("dailyEarnings");
      if (earningsEl) earningsEl.textContent = "0.00000000";
      stopEarningsSimulation();
      return;
    }

    // 4. Start with real estimate
    currentDisplayedEarnings = Number(realDailyEstimate);
    updateEarningsDisplay(currentDisplayedEarnings);

    // 5. Simulate slow daily growth (only visual)
    startEarningsSimulation(realDailyEstimate);

    console.log(
      `[Earnings Sim] Real base: ${realDailyEstimate} BTC | Started simulation`,
    );
  } catch (err) {
    console.error("Failed to load real daily earnings:", err);
    const earningsEl = document.getElementById("dailyEarnings");
    if (earningsEl) earningsEl.textContent = "Error";
  }
}

// ─── Helper: update displayed value ───
function updateEarningsDisplay(value) {
  const el = document.getElementById("dailyEarnings");
  if (el) {
    el.textContent = formatBTC(value);
  }
}

// ─── Start smooth visual increase (daily earnings animation) ───
function startEarningsSimulation(baseDaily) {
  stopEarningsSimulation(); // prevent multiple intervals

  // Simulate ~24 hours of earnings spread over real-time seconds
  // Example: full daily earnings in ~60 real seconds (for demo feel)
  const secondsForFullDay = 60; // ← change to 86400 for real 24h
  const msPerTick = 1500; // update every 1.5 seconds
  const incrementPerTick = baseDaily / ((secondsForFullDay * 1000) / msPerTick);

  earningsSimulationInterval = setInterval(() => {
    currentDisplayedEarnings += incrementPerTick;
    updateEarningsDisplay(currentDisplayedEarnings);
  }, msPerTick);
}

function stopEarningsSimulation() {
  if (earningsSimulationInterval) {
    clearInterval(earningsSimulationInterval);
    earningsSimulationInterval = null;
  }
}

// ─── Also simulate active miners count (optional, subtle) ───
function simulateActiveMiners() {
  const realCount = Math.floor(Math.random() * 3) + 1; // 1–3
  const el = document.getElementById("activeMiners");
  if (el) {
    el.textContent = realCount;
  }
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + " minutes ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hours ago";
  return Math.floor(diff / 86400) + " days ago";
}

// Load investments
async function loadInvestments(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("investments")
      .select(
        `
                *,
                mining_packages (*)
            `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const container = document.getElementById("investmentsList");
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = '<p class="no-data">No active investments</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (investment) => `
            <div class="investment-card">
                <div class="investment-header">
                    <h4>${investment.mining_packages.name}</h4>
                    <span class="status-badge ${investment.status}">${investment.status}</span>
                </div>
                <div class="investment-details">
                    <div class="detail">
                        <span>Amount:</span>
                        <strong>${formatBTC(investment.amount)} BTC</strong>
                    </div>
                    <div class="detail">
                        <span>Daily Profit:</span>
                        <strong>${formatBTC(investment.daily_profit)} BTC</strong>
                    </div>
                    <div class="detail">
                        <span>Total Profit:</span>
                        <strong>${formatBTC(investment.total_profit)} BTC</strong>
                    </div>
                    <div class="detail">
                        <span>Progress:</span>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${calculateProgress(investment)}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load investments error:", error);
  }
}

// Load recent transactions
async function loadRecentTransactions(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const container = document.getElementById("recentTransactions");
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = '<p class="no-data">No recent transactions</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (tx) => `
            <div class="transaction-item">
                <div class="tx-info">
                    <i class="fas ${getTransactionIcon(tx.type)}"></i>
                    <div>
                        <p class="tx-type">${formatTransactionType(tx.type)}</p>
                        <p class="tx-date">${formatDate(tx.created_at)}</p>
                    </div>
                </div>
                <div class="tx-amount ${tx.type}">
                    ${tx.type === "withdrawal" ? "-" : "+"}${formatBTC(tx.amount)} BTC
                </div>
                <span class="tx-status ${tx.status}">${tx.status}</span>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load transactions error:", error);
  }
}

// ── Full list for the dedicated Investments tab ────────────────────────────────
async function loadAllInvestments(userId) {
  const container = document.getElementById("allInvestments");
  if (!container) {
    console.warn("Container #allInvestments not found");
    return;
  }

  container.innerHTML = '<p class="no-data">Loading investments...</p>';

  try {
    const { data, error } = await supabaseClient
      .from("investments")
      .select(
        `
                *,
                mining_packages (name, price, mining_power, daily_roi, duration_days)
            `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No investments found</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (inv) => `
            <div class="investment-card">
                <div class="investment-header">
                    <h4>${inv.mining_packages?.name || "Unnamed Package"}</h4>
                    <span class="status-badge ${inv.status}">${inv.status}</span>
                </div>
                <div class="investment-details">
                    <div><strong>Amount:</strong> ${formatBTC(inv.amount)} BTC</div>
                    <div><strong>Status:</strong> ${inv.status}</div>
                    <div><strong>Created:</strong> ${formatDate(inv.created_at)}</div>
                    ${inv.mining_power ? `<div><strong>Mining power:</strong> ${formatHashrate(inv.mining_power)}</div>` : ""}
                    ${inv.daily_profit ? `<div><strong>Daily profit:</strong> ${formatBTC(inv.daily_profit)} BTC</div>` : ""}
                    ${
                      inv.status === "active" && inv.start_date && inv.end_date
                        ? `
                        <div>
                            <strong>Progress:</strong>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${calculateProgress(inv)}%"></div>
                            </div>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error("loadAllInvestments failed:", err);
    container.innerHTML = '<p class="no-data">Could not load investments</p>';
  }
}

// ── Full transaction history (add if missing) ──────────────────────────────────
async function loadAllTransactions(userId) {
  const container =
    document.getElementById("transactionsList") ||
    document.getElementById("allTransactions") ||
    document.getElementById("transactionHistory");

  if (!container) {
    console.warn("No transactions container found in DOM");
    return;
  }

  container.innerHTML = '<p class="no-data">Loading transactions...</p>';

  try {
    const { data, error } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No transactions yet</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (tx) => `
            <div class="transaction-item">
                <div class="tx-info">
                    <i class="fas ${getTransactionIcon(tx.type)}"></i>
                    <div>
                        <p class="tx-type">${formatTransactionType(tx.type)}</p>
                        <p class="tx-date">${formatDate(tx.created_at)}</p>
                    </div>
                </div>
                <div class="tx-amount ${tx.type}">
                    ${tx.type.includes("withdrawal") || tx.type === "fee" ? "-" : "+"}${formatBTC(tx.amount)} BTC
                </div>
                <span class="tx-status ${tx.status}">${tx.status}</span>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error("loadAllTransactions failed:", err);
    container.innerHTML = '<p class="no-data">Could not load transactions</p>';
  }
}

// ────────────────────────────────────────────────
// Simulated mining stats (looks real & updates slightly)
// ────────────────────────────────────────────────
/*async function loadMiningStats(userId) {
  // Fake realistic values
  const fakeActiveSessions = Math.floor(Math.random() * 3) + 1; // 1–3 active miners
  const fakeHashrateMHs = Math.floor(Math.random() * 8000) + 1200; // 1.2–9.2 GH/s range
  const fakeDailyProfit = (fakeHashrateMHs * 0.00000038).toFixed(8); // rough realistic rate

  // Update DOM safely
  const sessionsEl = document.getElementById("miningSessions");
  if (sessionsEl) sessionsEl.textContent = ActiveSessions;

  const hashrateEl = document.getElementById("totalHashrate");
  if (hashrateEl)
    hashrateEl.textContent = formatHashrate(fakeHashrateMHs * 1000); // convert to GH/s or TH/s

  const profitEl = document.getElementById("todayProfit");
  if (profitEl) profitEl.textContent = `${fakeDailyProfit} BTC`;

  // Optional: small "live" feel → update once every ~45 seconds
  setTimeout(() => loadMiningStats(userId), 45000);
}

// ────────────────────────────────────────────────
// Simulated active mining sessions (looks like real work)
// ────────────────────────────────────────────────
async function loadMiningSessions(userId) {
  const container =
    document.getElementById("miningSessionsList") ||
    document.querySelector("#mining-section .sessions-list") ||
    document.querySelector("#mining-section .mining-activity");

  if (!container) {
    console.warn("No mining sessions container found");
    return;
  }

  // Fake session data
  const fakeSessions = [
    {
      name: "Gold Package #1",
      power: 4500,
      started: new Date(Date.now() - 3600000 * 3), // 3 hours ago
      profit: 0.00012456,
    },
    {
      name: "Silver Package #2",
      power: 2800,
      started: new Date(Date.now() - 3600000 * 14), // 14 hours ago
      profit: 0.00008912,
    },
    {
      name: "Bronze Package #3",
      power: 950,
      started: new Date(Date.now() - 3600000 * 27), // 27 hours ago
      profit: 0.00003478,
    },
  ].slice(0, Math.floor(Math.random() * 3) + 1); // show 1–3 randomly

  let html = "";
  fakeSessions.forEach((s) => {
    html += `
            <div class="mining-session-card">
                <div class="session-header">
                    <h4>${s.name}</h4>
                    <span class="status-badge active">Active</span>
                </div>
                <div class="session-details">
                    <div><strong>Power:</strong> ${formatHashrate(s.power * 1000)}</div>
                    <div><strong>Started:</strong> ${formatDate(s.started)}</div>
                    <div><strong>Profit so far:</strong> ${formatBTC(s.profit)} BTC</div>
                </div>
            </div>
        `; 
  });

  if (html === "") {
    html = '<p class="no-data">No active mining sessions (simulation)</p>';
  }

  container.innerHTML = html;

  // Re-run every ~60 seconds for "live" feeling
  setTimeout(() => loadMiningSessions(userId), 60000);
}

// ────────────────────────────────────────────────
// Simulated mining profit history (looks like daily rewards)
// ────────────────────────────────────────────────
async function loadMiningHistory(userId) {
  const container =
    document.getElementById("miningHistoryList") ||
    document.querySelector("#mining-section .history-list") ||
    document.querySelector("#mining-section .profit-history");

  if (!container) {
    console.warn("No mining history container found");
    return;
  }

  // Fake profit entries (last 7 days)
  const fakeProfits = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const amount = (Math.random() * 0.00018 + 0.00003).toFixed(8);
    fakeProfits.push({ date, amount });
  }

  let html = "";
  fakeProfits.forEach((p) => {
    html += `
            <div class="profit-entry">
                <div class="profit-date">${formatDate(p.date)}</div>
                <div class="profit-amount">+${p.amount} BTC</div>
                <div class="profit-note small">Daily mining reward</div>
            </div>
        `;
  });

  container.innerHTML =
    html || '<p class="no-data">No profit history yet (simulation)</p>';

  // Refresh every few minutes for demo
  setTimeout(() => loadMiningHistory(userId), 120000);
}*/

// ────────────────────────────────────────────────
// Mining tab - overall stats (without stimulation)
// ────────────────────────────────────────────────
async function loadMiningStats(userId) {
  try {
    // Active sessions count + total hashrate
    const { data: sessions, error: sessErr } = await supabaseClient
      .from("mining_sessions")
      .select("mining_power")
      .eq("user_id", userId)
      .eq("status", "active");

    if (sessErr) throw sessErr;

    const totalPower =
      sessions?.reduce((sum, s) => sum + (Number(s.mining_power) || 0), 0) || 0;
    const activeCount = sessions?.length || 0;

    // ────── FIXED: safe DOM updates ──────
    const sessionsEl = document.getElementById("miningSessions");
    if (sessionsEl) {
      sessionsEl.textContent = activeCount;
    }

    const hashrateEl = document.getElementById("totalHashrate");
    if (hashrateEl) {
      hashrateEl.textContent = formatHashrate(totalPower);
    }

    // Today's profit (example – adjust calculation as needed)
    const todayProfitEl = document.getElementById("todayProfit");
    if (todayProfitEl) {
      const estimatedProfit = (totalPower * 0.0000005).toFixed(8); // example rate
      todayProfitEl.textContent = `${estimatedProfit} BTC`;
    }

    console.log(
      `Mining stats updated → Sessions: ${activeCount}, Hashrate: ${totalPower}`,
    );
  } catch (err) {
    console.error("loadMiningStats failed:", err);

    // Optional: show error in UI
    const errorPlace = document.getElementById("miningSessions")?.parentElement;
    if (errorPlace) {
      errorPlace.insertAdjacentHTML(
        "beforeend",
        '<span style="color:#ef4444; font-size:0.9rem;">Failed to load mining stats</span>',
      );
    }
  }
}

// ────────────────────────────────────────────────
// Active mining sessions list
// ────────────────────────────────────────────────
async function loadMiningSessions(userId) {
  const container =
    document.getElementById("miningSessionsList") ||
    document.querySelector("#mining-section .sessions-list") ||
    document.querySelector("#mining-section .mining-activity");

  if (!container) {
    console.warn("No container found for mining sessions");
    return;
  }

  container.innerHTML = '<p class="no-data">Loading active sessions...</p>';

  try {
    const { data, error } = await supabaseClient
      .from("mining_sessions")
      .select(
        `
                id,
                mining_power,
                start_time,
                profit_generated,
                status,
                investment_id,
                investments!inner (
                    mining_packages!inner (name)
                )
            `,
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("start_time", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No active mining sessions</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (s) => `
            <div class="mining-session-card">
                <div class="session-header">
                    <h4>${s.investments?.mining_packages?.name || "Active Mining"}</h4>
                    <span class="status-badge active">Running</span>
                </div>
                <div class="session-details">
                    <div><strong>Power:</strong> ${formatHashrate(s.mining_power)}</div>
                    <div><strong>Started:</strong> ${formatDate(s.start_time)}</div>
                    <div><strong>Profit generated:</strong> ${formatBTC(s.profit_generated || 0)} BTC</div>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error("loadMiningSessions failed:", err);
    container.innerHTML = '<p class="no-data">Failed to load sessions</p>';
  }
}

// ────────────────────────────────────────────────
// Mining profit history (daily earnings)
// ────────────────────────────────────────────────
async function loadMiningHistory(userId) {
  const container =
    document.getElementById("miningHistoryList") ||
    document.querySelector("#mining-section .history-list") ||
    document.querySelector("#mining-section .profit-history");

  if (!container) {
    console.warn("No container found for mining history");
    return;
  }

  container.innerHTML = '<p class="no-data">Loading profit history...</p>';

  try {
    const { data, error } = await supabaseClient
      .from("transactions")
      .select("amount, created_at, description")
      .eq("user_id", userId)
      .eq("type", "mining_profit")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML =
        '<p class="no-data">No mining profits recorded yet</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (p) => `
            <div class="profit-entry">
                <div class="profit-date">${formatDate(p.created_at)}</div>
                <div class="profit-amount">+${formatBTC(p.amount)} BTC</div>
                <div class="profit-note small">${p.description || "Daily mining reward"}</div>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error("loadMiningHistory failed:", err);
    container.innerHTML = '<p class="no-data">Failed to load history</p>';
  }
}

// ────────────────────────────────────────────────
// Wallet tab - current balance + quick summary
// ────────────────────────────────────────────────
async function loadWalletBalance(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("wallet_balance, wallet_address")
      .eq("id", userId)
      .single();

    if (error) throw error;
    if (!data) throw new Error("User wallet data not found");

    // Update balance
    const balanceEl = document.getElementById("walletBalanceDetails");
    if (balanceEl) {
      balanceEl.textContent = formatBTC(data.wallet_balance || 0);
    }

    // Update wallet address (if you have this element)
    const addressEl =
      document.getElementById("walletAddress") ||
      document.getElementById("depositAddress") ||
      document.querySelector("#wallet-section .wallet-address");
    if (addressEl) {
      addressEl.textContent = data.wallet_address || "No address set";
      // or if it's an <input>
      // addressEl.value = data.wallet_address || '';
    }

    console.log(`Wallet balance updated: ${data.wallet_balance} BTC`);
  } catch (err) {
    console.error("loadWalletBalance failed:", err);

    // Optional: show error in UI
    const errorPlace = document.getElementById("walletBalance")?.parentElement;
    if (errorPlace) {
      errorPlace.insertAdjacentHTML(
        "beforeend",
        '<span style="color: #ef4444; font-size: 0.9rem;">Failed to load balance</span>',
      );
    }
  }
}

// ────────────────────────────────────────────────
// Recent wallet movements (deposits + withdrawals)
// ────────────────────────────────────────────────
async function loadWalletTransactions(userId) {
  const container =
    document.getElementById("walletTransactionsList") ||
    document.querySelector("#wallet-section .transactions-list");

  if (!container) {
    console.warn("No wallet transactions container found");
    return;
  }

  container.innerHTML = '<p class="no-data">Loading wallet activity...</p>';

  try {
    const { data, error } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .in("type", ["deposit", "withdrawal"]) // only deposit & withdrawal
      .order("created_at", { ascending: false })
      .limit(10); // recent 10 items

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No wallet activity yet</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (tx) => `
            <div class="wallet-tx-item ${tx.type}">
                <div class="tx-left">
                    <i class="fas ${tx.type === "deposit" ? "fa-arrow-down" : "fa-arrow-up"}"></i>
                    <div>
                        <div class="tx-type">${formatTransactionType(tx.type)}</div>
                        <div class="tx-date small">${formatDate(tx.created_at)}</div>
                    </div>
                </div>
                <div class="tx-right">
                    <div class="tx-amount ${tx.type}">
                        ${tx.type === "withdrawal" ? "-" : "+"}${formatBTC(tx.amount)} BTC
                    </div>
                    <span class="tx-status ${tx.status}">${tx.status}</span>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error("loadWalletTransactions failed:", err);
    container.innerHTML =
      '<p class="no-data">Could not load wallet activity</p>';
  }
}

// Load referral stats
async function loadReferralStats(userId) {
  try {
    // Count referrals
    const { count: referralCount, error: countError } = await supabaseClient
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", userId);

    if (countError) throw countError;

    // Get referral earnings
    const { data: earnings, error: earningsError } = await supabaseClient
      .from("referral_earnings")
      .select("amount")
      .eq("user_id", userId);

    if (earningsError) throw earningsError;

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

    document.getElementById("referralCount").textContent = referralCount || 0;
    document.getElementById("referralEarnings").textContent =
      formatBTC(totalEarnings);

    // Load referral list
    await loadReferralList(userId);
  } catch (error) {
    console.error("Load referral stats error:", error);
  }
}

// Load referral list
async function loadReferralList(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("username, created_at, wallet_balance")
      .eq("referred_by", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    const container = document.getElementById("referralList");
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = '<p class="no-data">No referrals yet</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (ref) => `
            <div class="referral-item">
                <div>
                    <p class="ref-username">${ref.username}</p>
                    <p class="ref-date">Joined ${formatDate(ref.created_at)}</p>
                </div>
                <span class="ref-earnings">${formatBTC(ref.wallet_balance)} BTC</span>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load referral list error:", error);
  }
}

// ────────────────────────────────────────────────
// Open Live Support Chat from top bar button
// ────────────────────────────────────────────────
document.getElementById("open-support-chat")?.addEventListener("click", () => {
  showSection("live-support");

  // Optional: small visual feedback
  const btn = document.getElementById("open-support-chat");
  if (btn) {
    btn.classList.add("pulse-once");
    setTimeout(() => btn.classList.remove("pulse-once"), 800);
  }
});
// ==================== LIVE SUPPORT CHAT ====================
//let liveChatSubscription = null;

async function loadLiveChatMessages() {
  const user = await getUserProfile();
  if (!user) return;

  const { data } = await supabaseClient
    .from("chat_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const container = document.getElementById("liveChatMessages");
  container.innerHTML = data
    .map(
      (msg) => `
        <div class="message ${msg.is_from_admin ? "admin" : "user"}">
            <div class="message-bubble">
                ${msg.message}
                <span class="time">${formatTimeAgo(msg.created_at)}</span>
            </div>
        </div>
    `,
    )
    .join("");
  scrollChatToBottom();
}

function appendChatMessage(msg) {
  const container = document.getElementById("liveChatMessages");
  if (!container) {
    console.error("Chat container #liveChatMessages not found in DOM");
    return;
  }

  console.log("Appending message:", msg.message);

  const div = document.createElement("div");
  div.className = `message ${msg.is_from_admin ? "admin" : "user"}`;
  div.innerHTML = `
        <div class="message-bubble">
            ${msg.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
            <span class="time">${formatTimeAgo(msg.created_at)}</span>
        </div>
    `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight; // force scroll
}

function scrollChatToBottom() {
  const el = document.getElementById("liveChatMessages");
  if (el) el.scrollTop = el.scrollHeight;
}

async function sendLiveChatMessage() {
  const input = document.getElementById("liveChatInput");
  const text = input.value.trim();
  if (!text) return;

  const user = await getUserProfile();
  if (!user || !user.id) {
    alert("Not logged in");
    return;
  }

  // Optimistic UI – show message immediately
  const optimisticMsg = {
    message: text,
    is_from_admin: false,
    created_at: new Date().toISOString(),
    user_id: user.id,
  };
  appendChatMessage(optimisticMsg);

  try {
    const { error } = await supabaseClient.from("chat_messages").insert({
      user_id: user.id,
      message: text,
      is_from_admin: false,
    });

    if (error) {
      console.error("Send failed:", error);
      alert("Message not sent – check connection");
      // Optionally remove optimistic message or show error state
      return;
    }

    console.log("Message sent successfully");
    input.value = "";
  } catch (err) {
    console.error("Unexpected send error", err);
  }
}

let liveChatSubscription = null;

function startLiveChatSubscription() {
  const userPromise = getUserProfile();

  userPromise
    .then((user) => {
      if (!user || !user.id) {
        console.error("Cannot subscribe – no user or no user.id");
        return;
      }

      console.log(`Subscribing to chat for user: ${user.id}`);

      // Clean up old subscription
      if (liveChatSubscription) {
        console.log("Unsubscribing old channel");
        supabaseClient.removeChannel(liveChatSubscription);
        liveChatSubscription = null;
      }

      liveChatSubscription = supabaseClient
        .channel(`live-chat-user-${user.id}`) // ← unique name per user helps debugging
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("→ Realtime message received!", payload.new);
            appendChatMessage(payload.new);
          },
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status: ${status}`);
        });
    })
    .catch((err) => {
      console.error("Could not get user for subscription", err);
    });
}

async function refreshUserChat() {
  const btn = document.querySelector("#live-support-section .mini-refresh-btn");
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
    btn.disabled = true;
  }

  await loadLiveChatMessages(); // your existing function
  // Optional: restart subscription if needed
  // startLiveChatSubscription();

  setTimeout(() => {
    if (btn) {
      btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
      btn.disabled = false;
    }
  }, 800);
}

// ────────────────────────────────────────────────
// Settings tab loader (stub – loads current user data)
// ────────────────────────────────────────────────
async function loadUserSettings(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("full_name, email, two_factor_enabled, wallet_address")
      .eq("id", userId)
      .single();

    if (error) throw error;
    if (!data) return;

    // These are CORRECT assignments
    const fullNameInput = document.getElementById("fullName");
    if (fullNameInput) fullNameInput.value = data.full_name || "";

    const emailEl =
      document.getElementById("emailDisplay") ||
      document.getElementById("email");
    if (emailEl) emailEl.textContent = data.email || data.email; // or .value if input

    const twoFactorCheckbox = document.getElementById("twoFactor");
    if (twoFactorCheckbox)
      twoFactorCheckbox.checked = !!data.two_factor_enabled;

    const walletAddrInput = document.getElementById("walletAddress");
    if (walletAddrInput) walletAddrInput.value = data.wallet_address || "";

    console.log("Settings loaded successfully");
  } catch (err) {
    console.error("loadUserSettings failed:", err);
  }
}

// ────────────────────────────────────────────────
// Support tickets loader (stub)
// ────────────────────────────────────────────────
async function loadSupportTickets(userId) {
  const container =
    document.getElementById("supportTicketsList") ||
    document.querySelector("#support-section .tickets-container");

  if (!container) {
    console.warn("No support tickets container found");
    return;
  }

  container.innerHTML = '<p class="no-data">Loading tickets...</p>';

  try {
    const { data, error } = await supabaseClient
      .from("support_tickets")
      .select("id, subject, priority, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="no-data">No support tickets yet</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (ticket) => `
            <div class="ticket-item" data-ticket-id="${ticket.id}">
                <div class="ticket-subject">${ticket.subject}</div>
                <div class="ticket-meta">
                    <span class="priority ${ticket.priority}">${ticket.priority}</span>
                    <span class="status ${ticket.status}">${ticket.status}</span>
                    <span class="date small">${formatDate(ticket.created_at)}</span>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error("loadSupportTickets failed:", err);
    container.innerHTML = '<p class="no-data">Failed to load tickets</p>';
  }
}

// Load notifications
async function loadNotifications(userId) {
  try {
    const { data, error } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    const container = document.getElementById("notificationsList");
    const badge = document.getElementById("notificationBadge");

    if (badge) {
      badge.textContent = data.length;
      badge.style.display = data.length > 0 ? "flex" : "none";
    }

    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = '<p class="no-data">No new notifications</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (notification) => `
            <div class="notification-item ${notification.type}" onclick="markNotificationRead('${notification.id}')">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
                <div class="notification-content">
                    <p class="notification-title">${notification.title}</p>
                    <p class="notification-message">${notification.message}</p>
                    <p class="notification-time">${formatTimeAgo(notification.created_at)}</p>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load notifications error:", error);
  }
}

// Mark notification as read
async function markNotificationRead(notificationId) {
  try {
    const { error } = await supabaseClient
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw error;

    // Reload notifications
    const user = await getUserProfile();
    if (user) {
      loadNotifications(user.id);
    }
  } catch (error) {
    console.error("Mark notification read error:", error);
  }
}

// Start real-time updates
function startRealTimeUpdates(userId) {
  // Subscribe to transactions
  const transactionSubscription = supabaseClient
    .channel("transactions-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transactions",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Update transactions list
        loadRecentTransactions(userId);
        // Show notification
        showTransactionNotification(payload.new);
      },
    )
    .subscribe();

  // Subscribe to mining profits
  const miningSubscription = supabaseClient
    .channel("mining-channel")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "mining_sessions",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Update mining stats
        loadMiningStats(userId);
      },
    )
    .subscribe();

  // Subscribe to notifications
  const notificationSubscription = supabaseClient
    .channel("notifications-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Show notification popup
        showNotificationPopup(payload.new);
        // Reload notifications list
        loadNotifications(userId);
      },
    )
    .subscribe();
}

// Format functions
function formatBTC(amount) {
  return Number(amount).toFixed(8);
}

function formatHashrate(power) {
  if (power >= 1000000) return (power / 1000000).toFixed(2) + " TH/s";
  if (power >= 1000) return (power / 1000).toFixed(2) + " GH/s";
  return power + " MH/s";
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + " minutes ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hours ago";
  return Math.floor(diff / 86400) + " days ago";
}


function formatTransactionType(type) {
  const types = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    mining_profit: "Mining Profit",
    referral_bonus: "Referral Bonus",
  };
  return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function getTransactionIcon(type) {
  const icons = {
    deposit: "fa-arrow-down",
    withdrawal: "fa-arrow-up",
    mining_profit: "fa-bolt",
    referral_bonus: "fa-users",
  };
  return icons[type] || "fa-circle";
}

function getNotificationIcon(type) {
  const icons = {
    success: "fa-check-circle",
    warning: "fa-exclamation-triangle",
    error: "fa-times-circle",
    info: "fa-info-circle",
  };
  return icons[type] || "fa-bell";
}

function calculateProgress(investment) {
  const start = new Date(investment.start_date);
  const end = new Date(investment.end_date);
  const now = new Date();

  if (now >= end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.floor((elapsed / total) * 100));
}

// Show transaction notification
function showTransactionNotification(transaction) {
  const message = `${formatTransactionType(transaction.type)} of ${formatBTC(transaction.amount)} BTC ${transaction.status}`;
  showNotification(
    "Transaction Update",
    message,
    transaction.status === "completed" ? "success" : "info",
  );
}

// Show notification popup
function showNotificationPopup(notification) {
  showNotification(notification.title, notification.message, notification.type);
}

// Show notification
function showNotification(title, message, type = "info") {
  // Check if browser supports notifications
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return;
  }

  // Request permission if needed
  if (Notification.permission === "granted") {
    new Notification(title, { body: message, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body: message, icon: "/favicon.ico" });
      }
    });
  }
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 5000);
  }
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuth();
  if (user) {
    loadDashboardData();
  }
});
