// Main JavaScript file for landing page

// Mobile menu toggle
function toggleMobileMenu() {
  const navLinks = document.getElementById("navLinks");
  navLinks.classList.toggle("active");
}

// Close mobile menu when clicking outside
document.addEventListener("click", function (event) {
  const navLinks = document.getElementById("navLinks");
  const mobileBtn = document.querySelector(".mobile-menu-btn");

  if (!navLinks.contains(event.target) && !mobileBtn.contains(event.target)) {
    navLinks.classList.remove("active");
  }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // Close mobile menu after clicking
      document.getElementById("navLinks").classList.remove("active");
    }
  });
});

// Load mining packages
async function loadPackages() {
  try {
    const { data, error } = await supabaseClient
      .from("mining_packages")
      .select("*")
      .eq("is_active", true)
      .order("price");

    if (error) throw error;

    const container = document.getElementById("packages-container");
    if (!container) return;

    container.innerHTML = data
      .map(
        (pkg, index) => `
            <div class="package-card ${index === 2 ? "popular" : ""}">
                ${index === 2 ? '<div class="popular-badge">Most Popular</div>' : ""}
                <div class="package-header">
                    <h3>${pkg.name}</h3>
                    <div class="price">${pkg.price} <span>BTC</span></div>
                </div>
                <div class="package-features">
                    <p><i class="fas fa-bolt"></i> ${pkg.mining_power} MH/s</p>
                    <p><i class="fas fa-percent"></i> ${pkg.daily_roi}% Daily ROI</p>
                    <p><i class="fas fa-clock"></i> ${pkg.duration_days} Days</p>
                    <p><i class="fas fa-coins"></i> Min: ${pkg.min_purchase} BTC</p>
                    <p><i class="fas fa-coins"></i> Max: ${pkg.max_purchase} BTC</p>
                </div>
                <a href="signup.html" class="btn-primary">Get Started</a>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Load packages error:", error);
  }
}

// Handle contact form submission
document
  .getElementById("contactForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    try {
      // Here you would typically send the form data to your backend
      // For now, we'll just show a success message
      alert("Thank you for your message! We will get back to you soon.");
      this.reset();
    } catch (error) {
      alert("An error occurred. Please try again later.");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

// Handle newsletter subscription
document
  .querySelector(".newsletter-form")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = this.querySelector('input[type="email"]').value;
    const submitBtn = this.querySelector("button");

    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    submitBtn.disabled = true;

    try {
      // Here you would typically subscribe the email to your newsletter
      alert("Thank you for subscribing to our newsletter!");
      this.reset();
    } catch (error) {
      alert("An error occurred. Please try again later.");
    } finally {
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
      submitBtn.disabled = false;
    }
  });

// Animate statistics on scroll
function animateStats() {
  const stats = document.querySelectorAll(".stat-box h3");

  stats.forEach((stat) => {
    const value = stat.textContent;
    if (value.includes("+")) {
      const num = parseInt(value.replace("+", ""));
      animateValue(stat, 0, num, 2000);
    }
  });
}

// Animate value
function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 10);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= end) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current) + "+";
  }, 10);
}

// Check if element is in viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Trigger animation when stats come into view
let statsAnimated = false;
window.addEventListener("scroll", () => {
  const statsSection = document.querySelector(".statistics");
  if (statsSection && isInViewport(statsSection) && !statsAnimated) {
    animateStats();
    statsAnimated = true;
  }
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Load packages if on landing page
  if (document.getElementById("packages-container")) {
    await loadPackages();
  }

  // Check if user is logged in and update nav
  const user = await supabaseClient.auth.getUser();
  if (user.data.user) {
    updateNavForLoggedInUser();
  }
});

// Update navigation for logged in users
function updateNavForLoggedInUser() {
  const navLinks = document.getElementById("navLinks");
  if (navLinks) {
    const loginBtn = navLinks.querySelector('a[href="login.html"]');
    const signupBtn = navLinks.querySelector('a[href="signup.html"]');

    if (loginBtn) {
      loginBtn.textContent = "Dashboard";
      loginBtn.href = "dashboard.html";
    }

    if (signupBtn) {
      signupBtn.textContent = "Profile";
      signupBtn.href = "profile.html";
    }
  }
}
