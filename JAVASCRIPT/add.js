document.getElementById("open-support-chat")?.addEventListener("click", () => {
  // Hide all other sections
  document.querySelectorAll(".content-sections").forEach((el) => {
    el.classList.remove("active");
  });

  // Show chat section
  const supportSection = document.getElementById("live-support-section");
  if (supportSection) {
    supportSection.classList.add("active");

    // Update page title & description (optional but nice)
    // document.getElementById("page-title").textContent = "Support Chat";
    // document.getElementById("page-description").textContent =
    //  "We're here to help you 24/7";

    // Load messages & subscribe (your existing functions
    loadLiveChatMessages();
    startLiveChatSubscription();
  }
});

document.getElementById("close-support-chat")?.addEventListener("click", () => {
  document.getElementById("live-support-section").classList.remove("active");

  // Optional: go back to dashboard or last section
  document.getElementById("dashboard-section").classList.add("active");
  document.getElementById("page-title").textContent = "Crypto Portfolio";
  document.getElementById("page-description").textContent =
    "Professional cryptocurrency investment platform";
});
