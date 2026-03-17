// Admin Panel JavaScript

// Check if user is admin
async function checkAdminAuth() {
  const user = await checkAuth();
  if (!user) return false;

  const profile = await getUserProfile();
  if (!profile || !profile.is_admin) {
    window.location.href = "dashboard.html";
    return false;
  }

  document.getElementById("adminName").textContent =
    profile.full_name || profile.username;
  return true;
}

// Load admin dashboard data
async function loadAdminDashboard() {
  try {
    // Load stats
    await loadAdminStats();

    // Load charts
    initCharts();

    // Load recent data
    await loadRecentUsers();
    await loadRecentTransactions();

    // Load notifications
    await loadAdminNotifications();
  } catch (error) {
    console.error("Load admin dashboard error:", error);
    showAdminError("Failed to load dashboard data");
  }
}

// Load admin stats
async function loadAdminStats() {
  try {
    // Total users
    const { count: totalUsers } = await supabaseClient
      .from("users")
      .select("*", { count: "exact", head: true });

    document.getElementById("totalUsers").textContent = totalUsers || 0;

    // Total mining power
    const { data: miningData } = await supabaseClient
      .from("users")
      .select("mining_power");

    const totalPower =
      miningData?.reduce((sum, user) => sum + (user.mining_power || 0), 0) || 0;
    document.getElementById("totalMiningPower").textContent =
      formatAdminHashrate(totalPower);

    // Total investments
    const { data: investments } = await supabaseClient
      .from("investments")
      .select("amount");

    const totalInvestments =
      investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    document.getElementById("totalInvestments").textContent =
      totalInvestments.toFixed(8) + " BTC";

    // Pending withdrawals
    const { count: pendingWithdrawals } = await supabaseClient
      .from("withdrawal_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    document.getElementById("pendingWithdrawals").textContent =
      pendingWithdrawals || 0;
  } catch (error) {
    console.error("Load admin stats error:", error);
  }
}

// Initialize charts
// Global chart instances (so we can destroy them later)
let userGrowthChart = null;
let investmentChart = null;

function initCharts() {
  // Destroy existing charts if they exist (prevents "canvas already in use")
  if (userGrowthChart) {
    userGrowthChart.destroy();
    userGrowthChart = null;
  }
  if (investmentChart) {
    investmentChart.destroy();
    investmentChart = null;
  }

  // User Growth Chart
  const userCtx = document.getElementById("userGrowthChart")?.getContext("2d");
  if (userCtx) {
    userGrowthChart = new Chart(userCtx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "New Users",
            data: [65, 78, 90, 115, 142, 178],
            borderColor: "#f7931a",
            backgroundColor: "rgba(247, 147, 26, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#e5e7eb" } } },
        scales: {
          y: { grid: { color: "#2a2d36" }, ticks: { color: "#9ca3af" } },
          x: { grid: { color: "#2a2d36" }, ticks: { color: "#9ca3af" } },
        },
      },
    });
  }

  // Investment Overview Chart
  const invCtx = document.getElementById("investmentChart")?.getContext("2d");
  if (invCtx) {
    investmentChart = new Chart(invCtx, {
      type: "doughnut",
      data: {
        labels: ["Active", "Completed", "Cancelled"],
        datasets: [
          {
            data: [65, 25, 10],
            backgroundColor: ["#10b981", "#f7931a", "#ef4444"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#e5e7eb" } } },
      },
    });
  }
}

// Load recent users
async function loadRecentUsers() {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    const container = document.getElementById("recentUsers");
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = '<p class="no-data">No recent users</p>';
      return;
    }

    container.innerHTML = data
      .map(
        (user) => `
            <div class="admin-recent-item">
                <div class="admin-recent-info">
                    <div class="admin-recent-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="admin-recent-details">
                        <p>${user.username}</p>
                        <span>Joined ${formatDate(user.created_at)}</span>
                    </div>
                </div>
                <span class="admin-badge ${user.is_active ? "active" : "inactive"}">
                    ${user.is_active ? "Active" : "Inactive"}
                </span>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load recent users error:", error);
  }
}

// Load recent transactions
async function loadRecentTransactions() {
  try {
    const { data, error } = await supabaseClient
      .from("transactions")
      .select(
        `
                *,
                users (username)
            `,
      )
      .order("created_at", { ascending: false })
      .limit(5);

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
            <div class="admin-recent-item">
                <div class="admin-recent-info">
                    <div class="admin-recent-details">
                        <p>${tx.users?.username || "Unknown"}</p>
                        <span>${formatTransactionType(tx.type)}</span>
                    </div>
                </div>
                <div>
                    <span class="admin-recent-value">${tx.type === "withdrawal" ? "-" : "+"}${tx.amount} BTC</span>
                    <span class="admin-badge ${tx.status}">${tx.status}</span>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load recent transactions error:", error);
  }
}

// Load users table
async function loadUsersTable(page = 1, filter = "all", search = "") {
  try {
    let query = supabaseClient.from("users").select("*", { count: "exact" });

    // Apply filter
    if (filter === "active") {
      query = query.eq("is_active", true);
    } else if (filter === "inactive") {
      query = query.eq("is_active", false);
    } else if (filter === "verified") {
      query = query.eq("email_verified", true);
    } else if (filter === "unverified") {
      query = query.eq("email_verified", false);
    }

    // Apply search
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Pagination
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="loading-row">No users found</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map(
        (user) => `
            <tr>
                <td>${user.id.substring(0, 8)}...</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.wallet_balance?.toFixed(8) || 0} BTC</td>
                <td>${formatHashrate(user.mining_power || 0)}</td>
                <td>
                    <span class="admin-badge ${user.is_active ? "active" : "inactive"}">
                        ${user.is_active ? "Active" : "Inactive"}
                    </span>
                </td>
                <td>${formatDate(user.created_at)}</td>
                <td class="admin-actions-cell">
                    <button class="admin-btn-icon" onclick="editUser('${user.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-btn-icon" onclick="viewUser('${user.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="admin-btn-icon delete" onclick="toggleUserStatus('${user.id}')" title="${user.is_active ? "Deactivate" : "Activate"}">
                        <i class="fas ${user.is_active ? "fa-ban" : "fa-check"}"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");

    // Update pagination
    const totalPages = Math.ceil(count / pageSize);
    updatePagination("usersPagination", page, totalPages, (p) =>
      loadUsersTable(p, filter, search),
    );
  } catch (error) {
    console.error("Load users table error:", error);
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
// Load investments table
async function loadInvestmentsTable(page = 1, filter = "all", search = "") {
  try {
    let query = supabaseClient.from("investments").select(
      `
                *,
                users (username),
                mining_packages (name)
            `,
      { count: "exact" },
    );

    // Apply filter
    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    // Apply search
    if (search) {
      query = query.or(`users.username.ilike.%${search}%`);
    }

    // Pagination
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const tbody = document.getElementById("investmentsTableBody");
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="10" class="loading-row">No investments found</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map(
        (inv) => `
            <tr>
                <td>${inv.id.substring(0, 8)}...</td>
                <td>${inv.users?.username || "Unknown"}</td>
                <td>${inv.mining_packages?.name || "Unknown"}</td>
                <td>${inv.amount} BTC</td>
                <td>${formatHashrate(inv.mining_power)}</td>
                <td>${inv.daily_profit} BTC</td>
                <td>${formatDate(inv.start_date)}</td>
                <td>${formatDate(inv.end_date)}</td>
                <td>
                    <span class="admin-badge ${inv.status}">${inv.status}</span>
                </td>
                <td class="admin-actions-cell">
                    <button class="admin-btn-icon" onclick="viewInvestment('${inv.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load investments table error:", error);
  }
}

// Load withdrawals table
/*async function loadWithdrawalsTable(filter = "all") {
  try {
    let query = supabaseClient;
    const { data, error, count } = await supabaseClient
      .from("withdrawal_requests")
      .select(
        `
    *,
    requester:users!withdrawal_requests_user_id_fkey (username, email, full_name)
    -- , processor:users!withdrawal_requests_processed_by_admin_id_fkey (username)
  `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });
    //.from('withdrawal_requests')
    //.select(`
    //  *,
    //  users (username, email)
    // `);

    // Apply filter
    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    //const { data, error, } = await query

    // .order('created_at', { ascending: false });

    if (error) throw error;

    const tbody = document.getElementById("withdrawalsTableBody");
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="loading-row">No withdrawal requests found</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map(
        (withdrawal) => `
            <tr>
                <td>${withdrawal.id.substring(0, 8)}...</td>
                <td>${withdrawal.requester?.username || "—"}</td>
                <td>${withdrawal.requester?.email || "—"}</td>              
                <td>${withdrawal.amount} BTC</td>
                <td>${withdrawal.wallet_address.substring(0, 15)}...</td>
                <td>${withdrawal.processor?.username || "—"}</td>
                <td>
                    <span class="admin-badge ${withdrawal.status}">${withdrawal.status}</span>
                </td>
                <td>${formatDate(withdrawal.created_at)}</td>
                <td class="admin-actions-cell">
                    ${
                      withdrawal.status === "pending"
                        ? `
                        <button class="admin-btn-icon" onclick="processWithdrawal('${withdrawal.id}', 'approve')" title="Approve">
                            <i class="fas fa-check" style="color: var(--admin-success);"></i>
                        </button>
                        <button class="admin-btn-icon" onclick="processWithdrawal('${withdrawal.id}', 'reject')" title="Reject">
                            <i class="fas fa-times" style="color: var(--admin-danger);"></i>
                        </button>
                    `
                        : ""
                    }
                    <button class="admin-btn-icon" onclick="viewWithdrawal('${withdrawal.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load withdrawals table error:", error);
  }
}*/
async function loadWithdrawalsTable(filter = "all") {
  try {
    let query = supabaseClient
      .from("withdrawal_requests")
      .select(
        `
                id,
                amount,
                wallet_address,
                status,
                created_at,
                processed_at,
                rejection_reason,
                user_id,
                users!user_id (username, email)
            `,
      )
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Withdrawals fetch error:", error);
      return;
    }

    const tbody = document.getElementById("withdrawalsTableBody");
    if (!tbody) return;

    if (!data?.length) {
      tbody.innerHTML =
        '<tr><td colspan="6">No withdrawal requests found</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map(
        (req) => `
            <tr>
                <td>${formatDate(req.created_at)}</td>
                <td>${req.users?.username || req.users?.email || "—"}</td>
                <td>${formatBTC(req.amount)}</td>
                <td title="${req.wallet_address}">${req.wallet_address.substring(0, 8)}...</td>
                <td><span class="status-badge status-${req.status}">${req.status}</span></td>
                <td class="actions">
                    ${
                      req.status === "pending"
                        ? `
                        <button class="btn btn-success btn-sm me-1" 
                                onclick="adminProcessWithdrawal('${req.id}', 'approved')">
                            Approve
                        </button>
                        <button class="btn btn-danger btn-sm" 
                                onclick="adminProcessWithdrawal('${req.id}', 'rejected')">
                            Reject
                        </button>
                    `
                        : req.status.charAt(0).toUpperCase() +
                          req.status.slice(1)
                    }
                </td>
            </tr>
        `,
      )
      .join("");
  } catch (err) {
    console.error("Load withdrawals crash:", err);
  }
}

// Very important function – handles both approve & reject
async function adminProcessWithdrawal(requestId, action) {
  if (
    !confirm(
      `Are you sure you want to ${action === "approved" ? "APPROVE" : "REJECT"} this withdrawal?`,
    )
  ) {
    return;
  }

  let rejectionReason = null;
  if (action === "rejected") {
    rejectionReason = prompt(
      "Reason for rejection (will be sent to user):",
    )?.trim();
    if (!rejectionReason) {
      alert("You must provide a rejection reason.");
      return;
    }
  }

  try {
    // Get current admin
    const adminProfile = await getUserProfile();
    if (!adminProfile?.is_admin) {
      alert("Only administrators can process withdrawals.");
      return;
    }

    // 1. Fetch the withdrawal request + user's current balance
    const { data: req, error: fetchErr } = await supabaseClient
      .from("withdrawal_requests")
      .select(
        `
                id,
                amount,
                user_id,
                wallet_address,
                status,
                created_at,
                users!user_id (wallet_balance)
            `,
      )
      .eq("id", requestId)
      .single();

    if (fetchErr) throw fetchErr;
    if (!req) throw new Error("Withdrawal request not found");

    if (req.status !== "pending") {
      alert(`This request is already ${req.status}.`);
      return;
    }

    console.log("Withdrawal request data:", req);

    // 2. Check user balance exists
    if (!req.users || typeof req.users.wallet_balance !== "number") {
      throw new Error("User balance information is missing");
    }

    const currentBalance = Number(req.users.wallet_balance);
    const withdrawAmount = Number(req.amount);

    // 3. APPROVE logic
    if (action === "approved") {
      if (currentBalance < withdrawAmount) {
        alert(
          `Insufficient balance (${currentBalance.toFixed(8)} < ${withdrawAmount.toFixed(8)})`,
        );
        return;
      }

      const newBalance = currentBalance - withdrawAmount;

      // Update user balance
      const { error: balanceErr } = await supabaseClient
        .from("users")
        .update({ wallet_balance: newBalance })
        .eq("id", req.user_id);

      if (balanceErr) throw balanceErr;

      // Log transaction – non-blocking
      try {
        await supabaseClient.from("transactions").insert({
          user_id: req.user_id,
          type: "withdrawal",
          amount: -withdrawAmount,
          status: "completed",
          description: `Approved withdrawal to ${req.wallet_address}`,
          completed_at: new Date().toISOString(),
        });
      } catch (txErr) {
        console.error("Could not log transaction:", txErr);
        // Don't stop the process – it's just logging
      }

      // Notify user
      await createNotification(
        req.user_id,
        "Withdrawal Approved",
        `Your withdrawal of ${withdrawAmount.toFixed(8)} BTC has been approved and processed.`,
        "success",
      );
    }
    // 4. REJECT logic
    else {
      await createNotification(
        req.user_id,
        "Withdrawal Rejected",
        `Your withdrawal request of ${withdrawAmount.toFixed(8)} BTC was rejected.\n\nReason: ${rejectionReason}`,
        "error",
      );
    }

    // 5. Update withdrawal request status
    const updateData = {
      status: action === "approved" ? "approved" : "rejected",
      processed_by: adminProfile.id,
      processed_at: new Date().toISOString(),
    };

    if (action === "rejected") {
      updateData.rejection_reason = rejectionReason;
    }

    const { error: updateErr } = await supabaseClient
      .from("withdrawal_requests")
      .update(updateData)
      .eq("id", requestId);

    if (updateErr) throw updateErr;

    alert(
      `Withdrawal request successfully ${action === "approved" ? "approved" : "rejected"}.`,
    );

    // Refresh table
    loadWithdrawalsTable?.();
  } catch (err) {
    console.error("adminProcessWithdrawal error:", err);
    alert(
      "Error processing withdrawal:\n" +
        (err.message || "Check console for details"),
    );
  }
}

// Load packages grid
async function loadPackagesGrid() {
  try {
    const { data, error } = await supabaseClient
      .from("mining_packages")
      .select("*")
      .order("price");

    if (error) throw error;

    const container = document.getElementById("packagesGrid");
    if (!container) return;

    container.innerHTML = data
      .map(
        (pkg) => `
            <div class="admin-package-card">
                <div class="admin-package-header">
                    <h3>${pkg.name}</h3>
                    <span class="admin-package-status ${pkg.is_active ? "" : "inactive"}">
                        ${pkg.is_active ? "Active" : "Inactive"}
                    </span>
                </div>
                <div class="admin-package-details">
                    <p><strong>Price:</strong> ${pkg.price} BTC</p>
                    <p><strong>Mining Power:</strong> ${formatHashrate(pkg.mining_power)}</p>
                    <p><strong>Daily ROI:</strong> ${pkg.daily_roi}%</p>
                    <p><strong>Duration:</strong> ${pkg.duration_days} days</p>
                    <p><strong>Min Purchase:</strong> ${pkg.min_purchase} BTC</p>
                    <p><strong>Max Purchase:</strong> ${pkg.max_purchase} BTC</p>
                </div>
                <div class="admin-package-actions">
                    <button class="admin-btn-icon" onclick="editPackage('${pkg.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-btn-icon" onclick="togglePackageStatus('${pkg.id}')" title="${pkg.is_active ? "Deactivate" : "Activate"}">
                        <i class="fas ${pkg.is_active ? "fa-ban" : "fa-check"}"></i>
                    </button>
                    <button class="admin-btn-icon delete" onclick="deletePackage('${pkg.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load packages grid error:", error);
  }
}

// Load tickets table
async function loadTicketsTable(filter = "all", priority = "all") {
  try {
    let query = supabaseClient;

    const { data, error, count } = await supabaseClient
      .from("support_tickets")
      .select(
        `
    *,
    opener:users!support_tickets_user_id_fkey (username, email, full_name)
    -- , assignee:users!support_tickets_assigned_to_user_id_fkey (username)
  `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    //.from('support_tickets')
    // .select(`
    //     *,
    //     users (username)
    // `);

    // Apply filters
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    if (priority !== "all") {
      query = query.eq("priority", priority);
    }

    //const { data, error } = await query
    //.order('created_at', { ascending: false });

    if (error) throw error;

    const tbody = document.getElementById("ticketsTableBody");
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" class="loading-row">No tickets found</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map(
        (ticket) => `
            <tr onclick="viewTicket('${ticket.id}')" style="cursor: pointer;">
                <td>${ticket.id.substring(0, 8)}...</td>
                <td>${ticket.opener?.username || "—"}</td> 
                <td>${ticket.opener?.email || "—"}</td>
                <td>${ticket.subject}</td>
                <td>
                    <span class="ticket-priority ${ticket.priority}">${ticket.priority}</span>
                </td>
                <td>
                    <span class="ticket-status ${ticket.status}">${ticket.status.replace("_", " ")}</span>
                </td>
                <td>${formatDate(ticket.created_at)}</td>
                <td>${formatDate(ticket.updated_at)}</td>
                <td class="admin-actions-cell">
                    <button class="admin-btn-icon" onclick="viewTicket('${ticket.id}'); event.stopPropagation();" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load tickets table error:", error);
  }
}

// Process withdrawal
async function processWithdrawal(withdrawalId, action) {
  try {
    const status = action === "approve" ? "approved" : "rejected";
    const adminNotes = prompt(`Enter notes for ${action}:`);

    const { error } = await supabaseClient
      .from("withdrawal_requests")
      .update({
        status: status,
        admin_notes: adminNotes,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId);

    if (error) throw error;

    if (action === "approve") {
      // Process the withdrawal (this would integrate with blockchain in production)
      alert("Withdrawal approved successfully");
    } else {
      alert("Withdrawal rejected");
    }

    // Reload withdrawals
    const filter = document.getElementById("withdrawalFilter")?.value || "all";
    loadWithdrawalsTable(filter);
  } catch (error) {
    console.error("Process withdrawal error:", error);
    alert("Error processing withdrawal: " + error.message);
  }
}

// ==================== ADMIN LIVE SUPPORT (WhatsApp Style) ====================
let currentChatUserId = null;
let adminGlobalSub = null;
let adminUserSub = null;

async function loadConversations() {
  const { data } = await supabaseClient
    .from("chat_messages")
    .select(
      `
            id, message, created_at, is_from_admin, user_id,
            users!chat_messages_user_id_fkey (username)
        `,
    )
    .order("created_at", { ascending: false });

  const conversations = {};
  data.forEach((m) => {
    if (!conversations[m.user_id]) {
      conversations[m.user_id] = {
        user_id: m.user_id,
        username: m.users?.username || "User",
        lastMessage: m.message,
        time: m.created_at,
        unread: 0,
      };
    }
    if (!m.is_from_admin) conversations[m.user_id].unread++;
  });

  const html = Object.values(conversations)
    .map(
      (c) => `
        <div class="conversation-item ${currentChatUserId === c.user_id ? "active" : ""}" 
             onclick="openAdminChat('${c.user_id}', '${c.username}')">
            <strong>${c.username}</strong>
            <small>${c.lastMessage.substring(0, 45)}${c.lastMessage.length > 45 ? "..." : ""}</small>
            ${c.unread > 0 ? `<span class="unread-badge">${c.unread}</span>` : ""}
        </div>
    `,
    )
    .join("");

  document.getElementById("conversationsList").innerHTML =
    html ||
    '<p style="padding:20px;color:#777;text-align:center;">No chats yet</p>';
}

// Open chat with specific user
async function openAdminChat(userId, username) {
  currentChatUserId = userId;
  document.getElementById("chatWithUser").textContent = `Chat with ${username}`;

  // Load history
  const { data } = await supabaseClient
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const container = document.getElementById("adminChatMessages");
  container.innerHTML = data
    .map(
      (m) => `
        <div class="message ${m.is_from_admin ? "admin" : "user"}">
            <div class="message-bubble">${m.message}<span class="time">${formatTimeAgo(m.created_at)}</span></div>
        </div>
    `,
    )
    .join("");
  container.scrollTop = container.scrollHeight;

  // Mark as read
  await supabaseClient
    .from("chat_messages")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_from_admin", false);

  // Start listening only to this user

  if (adminUserSub) {
    supabaseClient.removeChannel(adminUserSub);
    adminUserSub = null;
  }

  adminUserSub = supabaseClient
    .channel(`admin-chat-user-${userId}`) // unique name = easier to debug
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("→ Admin received realtime message:", payload.new);
        appendAdminMessage(payload.new);
        // Refresh conversation list (shows latest message & unread)
        loadConversations();
      },
    )
    .subscribe((status) => {
      console.log(`Admin → user ${userId} subscription status: ${status}`);
    });
}

// Append new message (used by realtime)
function appendAdminMessage(msg) {
  const container = document.getElementById("adminChatMessages");
  if (!container) {
    console.error("#adminChatMessages not found");
    return;
  }

  const div = document.createElement("div");
  div.className = `message ${msg.is_from_admin ? "admin" : "user"}`;

  const escaped = msg.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  div.innerHTML = `
        <div class="message-bubble">
            ${escaped}
            <span class="time">${formatTimeAgo(msg.created_at)}</span>
        </div>
    `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Send reply from admin
async function sendAdminReply() {
  const input = document.getElementById("adminChatInput");
  const text = input.value.trim();
  if (!text || !currentChatUserId) {
    console.warn("Cannot send: no text or no user selected");
    return;
  }

  const optimisticMsg = {
    message: text,
    is_from_admin: true,
    created_at: new Date().toISOString(),
    user_id: currentChatUserId,
  };

  // 1. Show message immediately (optimistic UI)
  appendAdminMessage(optimisticMsg);

  // 2. Clear input right away → feels responsive
  input.value = "";

  try {
    const { error } = await supabaseClient.from("chat_messages").insert({
      user_id: currentChatUserId,
      message: text,
      is_from_admin: true,
    });

    if (error) {
      console.error("Admin reply failed:", error.message, error.details);
      // You can add visual "failed to send" state here later
      alert("Message could not be sent – check connection");
      return;
    }

    console.log("Admin reply sent successfully");
  } catch (err) {
    console.error("Unexpected error while sending admin reply:", err);
  }
}

// Global listener (so new chats appear in list even if no chat open)
function startAdminGlobalListener() {
  if (adminGlobalSub) return;

  adminGlobalSub = supabaseClient
    .channel("admin-global-chat")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: "is_from_admin=eq.false",
      },
      () => {
        loadConversations();
        // Optional sound/notification
      },
    )
    .subscribe();
}

async function refreshAdminChat() {
  if (!currentChatUserId) return;

  const btn = document.querySelector(".admin-refresh");
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
    btn.disabled = true;
  }

  // Reload current conversation
  await openAdminChat(
    currentChatUserId,
    document
      .querySelector("#chatWithUser")
      ?.textContent.replace("Chat with ", "") || "User",
  );

  // Also refresh list
  await loadConversations();

  setTimeout(() => {
    if (btn) {
      btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
      btn.disabled = false;
    }
  }, 900);
}

/*function scrollChatToBottom(id) {
  const el = document.getElementById(id);
  if (el) el.scrollTop = el.scrollHeight;
}*/

// View ticket
async function viewTicket(ticketId) {
  try {
    const { data: ticket, error } = await supabaseClient

      .from("support_tickets")
      .select(
        `
                *,
                users (username, email)
            `,
      )
      .eq("id", ticketId)
      .single();

    if (error) throw error;

    // Load replies
    const { data: replies } = await supabaseClient
      .from("ticket_replies")
      .select(
        `
                *,
                users (username)
            `,
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    // Populate modal
    document.getElementById("ticketSubject").textContent = ticket.subject;
    document.getElementById("ticketUser").textContent =
      ticket.users?.username || "Unknown";
    document.getElementById("ticketPriority").textContent = ticket.priority;
    document.getElementById("ticketPriority").className =
      `ticket-priority ${ticket.priority}`;
    document.getElementById("ticketStatus").textContent = ticket.status.replace(
      "_",
      " ",
    );
    document.getElementById("ticketStatus").className =
      `ticket-status ${ticket.status}`;
    document.getElementById("ticketCreated").textContent = formatDate(
      ticket.created_at,
    );
    document.getElementById("ticketMessage").textContent = ticket.message;

    // Display replies
    const repliesContainer = document.getElementById("ticketReplies");
    if (replies && replies.length > 0) {
      repliesContainer.innerHTML = replies
        .map(
          (reply) => `
                <div class="ticket-reply ${reply.is_admin_reply ? "admin" : ""}">
                    <div class="ticket-reply-header">
                        <strong>${reply.users?.username || "Unknown"}</strong>
                        <span>${formatDate(reply.created_at)}</span>
                    </div>
                    <div class="ticket-reply-content">${reply.message}</div>
                </div>
            `,
        )
        .join("");
    } else {
      repliesContainer.innerHTML = '<p class="no-data">No replies yet</p>';
    }

    // Store ticket ID for reply
    document.getElementById("viewTicketModal").dataset.ticketId = ticketId;

    // Show modal
    document.getElementById("viewTicketModal").style.display = "block";
  } catch (error) {
    console.error("View ticket error:", error);
  }
}

// Send ticket reply
async function sendTicketReply() {
  const ticketId = document.getElementById("viewTicketModal").dataset.ticketId;
  const message = document.getElementById("ticketReplyMessage").value;

  if (!message) {
    alert("Please enter a message");
    return;
  }

  try {
    const user = await getUserProfile();

    const { error } = await supabaseClient.from("ticket_replies").insert([
      {
        ticket_id: ticketId,
        user_id: user.id,
        message: message,
        is_admin_reply: true,
      },
    ]);

    if (error) throw error;

    // Update ticket status to in_progress if it was open
    await supabaseClient
      .from("support_tickets")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    // Clear input and refresh
    document.getElementById("ticketReplyMessage").value = "";
    viewTicket(ticketId);
  } catch (error) {
    console.error("Send reply error:", error);
    alert("Error sending reply: " + error.message);
  }
}

// Close ticket
async function closeTicket() {
  const ticketId = document.getElementById("viewTicketModal").dataset.ticketId;

  try {
    const { error } = await supabaseClient
      .from("support_tickets")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) throw error;

    alert("Ticket closed");
    closeAdminModal("viewTicketModal");

    // Reload tickets
    const filter = document.getElementById("ticketFilter")?.value || "all";
    const priority =
      document.getElementById("ticketPriorityFilter")?.value || "all";
    loadTicketsTable(filter, priority);
  } catch (error) {
    console.error("Close ticket error:", error);
    alert("Error closing ticket: " + error.message);
  }
}

// Add new user
async function handleAddUser(event) {
  event.preventDefault();

  const username = document.getElementById("newUsername").value;
  const email = document.getElementById("newEmail").value;
  const fullName = document.getElementById("newFullName").value;
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;

  try {
    // Create auth user
    const { data: authData, error: authError } =
      await supabaseClient.auth.signUp({
        email: email,
        password: password,
      });

    if (authError) throw authError;

    // Create user profile
    const { error: dbError } = await supabaseClient.from("users").insert([
      {
        id: authData.user.id,
        username: username,
        email: email,
        full_name: fullName,
        is_admin: role === "admin",
        email_verified: true,
        referral_code: generateReferralCode(username),
      },
    ]);

    if (dbError) throw dbError;

    alert("User created successfully");
    closeAdminModal("addUserModal");

    // Reload users table
    loadUsersTable();
  } catch (error) {
    console.error("Add user error:", error);
    alert("Error creating user: " + error.message);
  }
}

// Edit user
async function editUser(userId) {
  try {
    const { data: user, error } = await supabaseClient
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;

    document.getElementById("editUserId").value = user.id;
    document.getElementById("editUsername").value = user.username;
    document.getElementById("editEmail").value = user.email;
    document.getElementById("editFullName").value = user.full_name || "";
    document.getElementById("editBalance").value = user.wallet_balance || 0;
    document.getElementById("editStatus").value = user.is_active;
    document.getElementById("editRole").value = user.is_admin
      ? "admin"
      : "user";

    document.getElementById("editUserModal").style.display = "block";
  } catch (error) {
    console.error("Edit user error:", error);
    alert("Error loading user data");
  }
}

// Handle edit user
async function handleEditUser(event) {
  event.preventDefault();

  const userId = document.getElementById("editUserId").value;
  const username = document.getElementById("editUsername").value;
  const email = document.getElementById("editEmail").value;
  const fullName = document.getElementById("editFullName").value;
  const balance = document.getElementById("editBalance").value;
  const status = document.getElementById("editStatus").value === "true";
  const role = document.getElementById("editRole").value === "admin";

  try {
    const { error } = await supabaseClient
      .from("users")
      .update({
        username: username,
        email: email,
        full_name: fullName,
        wallet_balance: balance,
        is_active: status,
        is_admin: role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    alert("User updated successfully");
    closeAdminModal("editUserModal");

    // Reload users table
    loadUsersTable();
  } catch (error) {
    console.error("Update user error:", error);
    alert("Error updating user: " + error.message);
  }
}

// =============================================
// View single user details (modal or alert)
// =============================================
async function viewUser(userId) {
  try {
    console.log(`Viewing user: ${userId}`);

    // 1. Fetch user data from public.users
    const { data: profile, error: profileError } = await supabaseClient
      .from("users")
      .select("*")
      /*id,
                email,
                username,
                full_name,
                wallet_balance,
                mining_power,
                referral_code,
                referred_by,
                email_verified,
                two_factor_enabled,
                is_admin,
                is_active,
                last_login,
                created_at,
                updated_at,
                password_hash   -- included, but usually NULL*/

      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      alert("Could not load user details.\nError: " + profileError.message);
      return;
    }

    if (!profile) {
      alert("User not found in database.");
      return;
    }

    // 2. Optional: try to get auth metadata (email_confirmed_at etc.)
    let authInfo = {};
    try {
      const { data: authUser } =
        await supabaseClient.auth.admin.getUserById(userId);
      if (authUser?.user) {
        authInfo = {
          confirmed_at: authUser.user.confirmed_at || "Not confirmed",
          last_sign_in: authUser.user.last_sign_in_at || "Never",
          banned: authUser.user.banned_until ? "Yes" : "No",
        };
      }
    } catch (e) {
      console.warn(
        "Could not fetch auth metadata (admin API required):",
        e.message,
      );
    }

    // 3. Build nice readable info
    const created = profile.created_at
      ? new Date(profile.created_at).toLocaleString()
      : "—";
    const lastLogin = profile.last_login
      ? new Date(profile.last_login).toLocaleString()
      : "Never";
    const passwordStatus = profile.password_hash
      ? "Hash exists (custom storage)"
      : "Managed by Supabase Auth – not stored here";

    let message = `
User Details
═══════════════════════════════════════
ID:            ${profile.id}
Email:         ${profile.email}
Username:      ${profile.username || "—"}
Full Name:     ${profile.full_name || "—"}
Admin:         ${profile.is_admin ? "Yes" : "No"}
Active:        ${profile.is_active ? "Yes" : "No"}

Balance:       ${Number(profile.wallet_balance || 0).toFixed(8)} BTC
Mining Power:  ${formatHashrate(profile.mining_power || 0)}

Referral Code: ${profile.referral_code || "—"}
Referred By:   ${profile.referred_by || "—"}

Email Verified: ${profile.email_verified ? "Yes" : "No"}
2FA Enabled:    ${profile.two_factor_enabled ? "Yes" : "No"}

Password:      ${passwordStatus}
               (original password cannot be viewed)

Created:       ${created}
Last Login:    ${lastLogin}
Updated:       ${profile.updated_at ? new Date(profile.updated_at).toLocaleString() : "—"}
`;

    // Add auth metadata if available
    if (Object.keys(authInfo).length > 0) {
      message += `\nAuth Info:
Confirmed:     ${authInfo.confirmed_at}
Last Sign-in:  ${authInfo.last_sign_in}
Banned:        ${authInfo.banned}`;
    }

    // Show in alert (simple version)
    alert(message);

    // ────────────────────────────────────────────────
    // If you want a nice modal instead of alert:
    // Uncomment and adapt this part

    /*const modal = document.getElementById('viewUserModal');
        if (modal) {
            document.getElementById('modalUserId').textContent = profile.id;
            document.getElementById('modalUserEmail').textContent = profile.email;
            document.getElementById('modalUserName').textContent = profile.username || '—';
            document.getElementById('modalFullName').textContent = profile.full_name || '—';
            document.getElementById('modalBalance').textContent = Number(profile.wallet_balance || 0).toFixed(8) + ' BTC';
            document.getElementById('modalPasswordStatus').textContent = passwordStatus;
            // ... fill other fields
            modal.style.display = 'block';
        }*/
  } catch (err) {
    console.error("viewUser failed:", err);
    alert("Error loading user details: " + err.message);
  }
}

// Toggle user status
async function toggleUserStatus(userId) {
  try {
    const { data: user, error: fetchError } = await supabaseClient
      .from("users")
      .select("is_active")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabaseClient
      .from("users")
      .update({ is_active: !user.is_active })
      .eq("id", userId);

    if (error) throw error;

    // Reload users table
    loadUsersTable();
  } catch (error) {
    console.error("Toggle user status error:", error);
    alert("Error toggling user status");
  }
}

// Add package
async function handleAddPackage(event) {
  event.preventDefault();

  const packageData = {
    name: document.getElementById("packageName").value,
    description: document.getElementById("packageDescription").value,
    price: parseFloat(document.getElementById("packagePrice").value),
    mining_power: parseFloat(document.getElementById("packagePower").value),
    daily_roi: parseFloat(document.getElementById("packageROI").value),
    duration_days: parseInt(document.getElementById("packageDuration").value),
    min_purchase: parseFloat(document.getElementById("packageMin").value),
    max_purchase: parseFloat(document.getElementById("packageMax").value),
    is_active: true,
  };

  try {
    const { error } = await supabaseClient
      .from("mining_packages")
      .insert([packageData]);

    if (error) throw error;

    alert("Package added successfully");
    closeAdminModal("addPackageModal");

    // Reload packages
    loadPackagesGrid();
  } catch (error) {
    console.error("Add package error:", error);
    alert("Error adding package: " + error.message);
  }
}

// ==================== PAYMENT METHODS ADMIN ====================
async function loadPaymentMethodsGrid() {
  const { data } = await supabaseClient
    .from("payment_methods")
    .select("*")
    .order("name");
  document.getElementById("paymentMethodsGrid").innerHTML = data
    .map(
      (m) => `
    <div class="admin-package-card">
      <div class="admin-package-header"><h3>${m.name}</h3><span class="${m.is_active ? "" : "inactive"}">${m.is_active ? "Active" : "Inactive"}</span></div>
      <div class="admin-package-details"><p><strong>Type:</strong> ${m.type}</p></div>
      <div class="admin-package-actions">
        <button onclick="editPaymentMethod('${m.id}')" class="admin-btn-icon"><i class="fas fa-edit"></i></button>
        <button onclick="togglePaymentMethod('${m.id}')" class="admin-btn-icon"><i class="fas ${m.is_active ? "fa-ban" : "fa-check"}"></i></button>
        <button onclick="deletePaymentMethod('${m.id}')" class="admin-btn-icon delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `,
    )
    .join("");
}

function showAddPaymentMethodModal(id = null) {
  document.getElementById("paymentModalTitle").textContent = id
    ? "Edit Method"
    : "Add Method";
  document.getElementById("editPaymentId").value = id || "";
  document.getElementById("addPaymentMethodModal").style.display = "block";
}

async function handleAddPaymentMethod(e) {
  e.preventDefault();
  const id = document.getElementById("editPaymentId").value;
  const data = {
    name: document.getElementById("methodName").value,
    type: document.getElementById("methodType").value,
    address_or_details: document.getElementById("methodAddress").value,
    qr_code_url: document.getElementById("methodQrUrl").value || null,
    instructions: document.getElementById("methodInstructions").value,
  };
  if (id)
    await supabaseClient.from("payment_methods").update(data).eq("id", id);
  else await supabaseClient.from("payment_methods").insert([data]);
  closeAdminModal("addPaymentMethodModal");
  loadPaymentMethodsGrid();
}

async function editPaymentMethod(id) {
  showAddPaymentMethodModal(id);
}
async function togglePaymentMethod(id) {
  const { data } = await supabaseClient
    .from("payment_methods")
    .select("is_active")
    .eq("id", id)
    .single();
  await supabaseClient
    .from("payment_methods")
    .update({ is_active: !data.is_active })
    .eq("id", id);
  loadPaymentMethodsGrid();
}
async function deletePaymentMethod(id) {
  if (confirm("Delete?")) {
    await supabaseClient.from("payment_methods").delete().eq("id", id);
    loadPaymentMethodsGrid();
  }
}

// ==================== DEPOSIT REQUESTS (PENDING PAYMENTS) ====================

async function loadDepositRequests() {
  try {
    const { data, error } = await supabaseClient
      .from("investments")
      .select(
        `
        id,
        amount,
        created_at,
        status,
        tx_hash,
        user_id,
        package_id,
        users!inner (username, email),
        mining_packages!inner (name)
      `,
      )
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const tbody = document.getElementById("depositRequestsBody");
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="no-data">No pending deposit requests</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map(
        (req) => `
      <tr>
        <td>${req.users?.username || "—"}<br><small>${req.users?.email || "—"}</small></td>
        <td>${req.mining_packages?.name || "—"}</td>
        <td>${req.amount.toFixed(8)} BTC</td>
        <td>${formatDate(req.created_at)}</td>
        <td>${req.tx_hash || "—"}</td>
        <td>
          <button class="admin-btn-success" onclick="approveDeposit('${req.id}', '${req.user_id}')">Approve</button>
          <button class="admin-btn-danger" onclick="rejectDeposit('${req.id}', '${req.user_id}')">Reject</button>
        </td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    console.error("Load deposit requests error:", err);
    document.getElementById("depositRequestsBody").innerHTML =
      '<tr><td colspan="6">Error loading requests</td></tr>';
  }
}

async function approveDeposit(investmentId, userId) {
  if (!confirm("Approve this deposit and activate the package?")) return;

  try {
    // 1. Get investment details
    const { data: inv } = await supabaseClient
      .from("investments")
      .select("amount, package_id")
      .eq("id", investmentId)
      .single();

    if (!inv) throw new Error("Investment not found");

    // 2. Get package mining power & ROI
    const { data: pkg } = await supabaseClient
      .from("mining_packages")
      .select("mining_power, daily_roi")
      .eq("id", inv.package_id)
      .single();

    const dailyProfit = (inv.amount * (pkg.daily_roi / 100)).toFixed(8);

    // 3. Update investment → active + calculate end_date + profits
    const durationDays = 30; // ← change to dynamic if you store duration in package
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    await supabaseClient;
    // Replace the rpc call with direct update
    await supabaseClient
      .from("investments")
      .update({
        status: "active",
        mining_power: pkg.mining_power,
        daily_profit: dailyProfit,
        end_date: endDate.toISOString(),
        last_payout_date: new Date().toISOString(),
      })
      .eq("id", investmentId);

    // 4. Update user wallet_balance & mining_power (optional – depending on your logic)
    await supabaseClient.rpc("increment_user_balance_and_power", {
      p_user_id: userId,
      p_amount: inv.amount, // or 0 if you don't credit to balance
      p_mining_power: pkg.mining_power,
    }); // ← you'll need to create this RPC function (see below)
    /*.from("users")
      .update({
        wallet_balance: supabaseClient.raw("wallet_balance + ?", [inv.amount]),
        mining_power: supabaseClient.raw("mining_power + ?", [
          pkg.mining_power,
        ]),
      })
      .eq("id", userId);*/

    // 5. Create transaction record (completed deposit)
    await supabaseClient.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount: inv.amount,
      status: "completed",
      description: `Approved deposit for ${pkg.name || "package"}`,
    });

    // 6. Notify user
    await createAdminNotification(
      userId,
      "Deposit Approved",
      `Your payment of ${inv.amount} BTC has been approved. Mining package is now active!`,
      "success",
    );

    loadDepositRequests(); // refresh list
    loadAdminDashboard(); // refresh stats if needed
  } catch (err) {
    console.error("Approve error:", err);
    alert("Failed to approve: " + err.message);
  }
}

async function rejectDeposit(investmentId, userId) {
  const reason =
    prompt("Enter rejection reason (will be sent to user):") ||
    "Payment not verified / incorrect amount";
  if (!reason) return;

  try {
    await supabaseClient
      .from("investments")
      .update({ status: "rejected" })
      .eq("id", investmentId);

    await createAdminNotification(
      userId,
      "Deposit Rejected",
      `Your recent deposit request was rejected.\nReason: ${reason}\nPlease contact support if you believe this is an error.`,
      "error",
    );

    await supabaseClient.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount: 0, // or fetch amount if needed
      status: "failed",
      description: `Rejected: ${reason}`,
    });

    loadDepositRequests();
  } catch (err) {
    console.error("Reject error:", err);
    alert("Failed to reject");
  }
}

// Helper: create notification from admin
async function createAdminNotification(userId, title, message, type = "info") {
  await supabaseClient.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    created_at: new Date().toISOString(),
  });
}

// Save general settings
async function saveGeneralSettings(event) {
  event.preventDefault();

  const settings = {
    site_name: document.getElementById("siteName").value,
    site_url: document.getElementById("siteUrl").value,
    maintenance_mode: document.getElementById("maintenanceMode").checked,
  };

  await saveSettings(settings);
  alert("General settings saved");
}

// Save financial settings
async function saveFinancialSettings(event) {
  event.preventDefault();

  const settings = {
    min_deposit: document.getElementById("minDeposit").value,
    max_deposit: document.getElementById("maxDeposit").value,
    min_withdrawal: document.getElementById("minWithdrawal").value,
    max_withdrawal: document.getElementById("maxWithdrawal").value,
    withdrawal_fee: document.getElementById("withdrawalFee").value,
    referral_bonus_percent: document.getElementById("referralBonus").value,
  };

  await saveSettings(settings);
  alert("Financial settings saved");
}

// Save security settings
async function saveSecuritySettings(event) {
  event.preventDefault();

  const settings = {
    session_timeout: document.getElementById("sessionTimeout").value,
    max_login_attempts: document.getElementById("maxLoginAttempts").value,
    require_2fa_admin: document.getElementById("require2FA").checked,
  };

  await saveSettings(settings);
  alert("Security settings saved");
}

// Save settings to database
async function saveSettings(settings) {
  for (const [key, value] of Object.entries(settings)) {
    const { error } = await supabaseClient.from("system_settings").upsert(
      {
        setting_key: key,
        setting_value: value.toString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" },
    );

    if (error) console.error(`Error saving ${key}:`, error);
  }
}

// Load admin notifications
async function loadAdminNotifications() {
  try {
    // Count pending withdrawals
    const { count: pendingWithdrawals } = await supabaseClient
      .from("withdrawal_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Count open tickets
    const { count: openTickets } = await supabaseClient
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");

    const total = (pendingWithdrawals || 0) + (openTickets || 0);

    const badge = document.getElementById("adminNotificationBadge");
    if (badge) {
      badge.textContent = total;
      badge.style.display = total > 0 ? "flex" : "none";
    }
  } catch (error) {
    console.error("Load admin notifications error:", error);
  }
}

// Filter functions
function filterUsers() {
  const filter = document.getElementById("userFilter").value;
  const search = document.getElementById("userSearch").value;
  loadUsersTable(1, filter, search);
}

function searchUsers() {
  filterUsers();
}

function filterInvestments() {
  const filter = document.getElementById("investmentFilter").value;
  const search = document.getElementById("investmentSearch").value;
  loadInvestmentsTable(1, filter, search);
}

function filterWithdrawals() {
  const filter = document.getElementById("withdrawalFilter").value;
  loadWithdrawalsTable(filter);
}

function filterTickets() {
  const filter = document.getElementById("ticketFilter").value;
  const priority = document.getElementById("ticketPriorityFilter").value;
  loadTicketsTable(filter, priority);
}

// Handle search
function handleSearch(event) {
  const searchTerm = event.target.value;
  const activeSection = document.querySelector(".admin-section.active");

  if (activeSection.id === "admin-users-section") {
    searchUsers();
  } else if (activeSection.id === "admin-investments-section") {
    searchInvestments();
  }
}

// Pagination update
function updatePagination(elementId, currentPage, totalPages, callback) {
  const container = document.getElementById(elementId);
  if (!container) return;

  let html = "";
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      html += `<button class="${i === currentPage ? "active" : ""}" onclick="callback(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += "<button disabled>...</button>";
    }
  }
  container.innerHTML = html;
}

// Show admin section
function showAdminSection(section) {
  // Update active nav link
  document.querySelectorAll(".admin-nav a").forEach((link) => {
    link.classList.remove("active");
  });
  event.target.closest("a").classList.add("active");

  // Update active section
  document.querySelectorAll(".admin-section").forEach((section) => {
    section.classList.remove("active");
  });
  document.getElementById(`admin-${section}-section`).classList.add("active");

  // Update page title
  const titles = {
    dashboard: "Dashboard",
    users: "User Management",
    investments: "Investment Management",
    transactions: "Transaction Management",
    withdrawals: "Withdrawal Requests",
    packages: "Mining Packages",
    tickets: "Support Tickets",
    settings: "System Settings",
    reports: "Reports",
  };
  document.getElementById("adminPageTitle").textContent = titles[section];

  // Load section data
  switch (section) {
    case "users":
      loadUsersTable();
      break;
    case "investments":
      loadInvestmentsTable();
      break;
    case "deposit-requests":
      loadDepositRequests();
      break;
    case "withdrawals":
      loadWithdrawalsTable();
      break;
    case "packages":
      loadPackagesGrid();
      break;
    case "payment-methods":
      loadPaymentMethodsGrid();
      break;
    case "live-chats":
      loadConversations();
      startAdminGlobalListener();
      break;
    case "tickets":
      loadTicketsTable();
      break;
  }
}

// Modal functions
function showAddUserModal() {
  document.getElementById("addUserModal").style.display = "block";
}

function showAddPackageModal() {
  document.getElementById("addPackageModal").style.display = "block";
}

function closeAdminModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

// Format functions
function formatAdminHashrate(power) {
  if (power >= 1000000000) return (power / 1000000000).toFixed(2) + " TH/s";
  if (power >= 1000000) return (power / 1000000).toFixed(2) + " GH/s";
  if (power >= 1000) return (power / 1000).toFixed(2) + " MH/s";
  return power + " KH/s";
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

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function formatHashrate(power) {
  if (!power || power === 0) return "0 MH/s";
  if (power >= 1000000) return (power / 1000000).toFixed(2) + " TH/s";
  if (power >= 1000) return (power / 1000).toFixed(2) + " GH/s";
  return power.toFixed(0) + " MH/s";
}

function formatBTC(amount) {
  if (!amount && amount !== 0) return "0.00000000";
  return Number(amount).toFixed(8);
}

function showAdminError(message) {
  // Simple version: alert for now
  alert("Admin Error: " + message);

  // Better version: show in a div (add <div id="adminError" style="color:red; padding:10px;"></div> somewhere in admin.html if you want)
  // const errorDiv = document.getElementById('adminError');
  // if (errorDiv) {
  //   errorDiv.textContent = message;
  //   errorDiv.style.display = 'block';
  //   setTimeout(() => { errorDiv.style.display = 'none'; }, 8000);
  // }
}

// Initialize admin panel
document.addEventListener("DOMContentLoaded", async () => {
  const isAdmin = await checkAdminAuth();
  if (isAdmin) {
    loadAdminDashboard();
  }
});

// Close modals when clicking outside
window.onclick = function (event) {
  const modals = document.getElementsByClassName("admin-modal");
  for (let modal of modals) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
};
