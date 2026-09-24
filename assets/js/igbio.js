document.addEventListener("DOMContentLoaded", () => {
  const bubble = document.getElementById("bio-bubble");
  const text = document.getElementById("bio-text");
  const container = document.createElement("div");

  document.body.appendChild(container);

  let widget = null;
  let requestRunning = false;
  let lastToken = "";

  const requestBio = async (token) => {
    if (!token || requestRunning || token === lastToken) {
      return;
    }

    requestRunning = true;
    lastToken = token;

    try {
      const response = await fetch(
        "https://igscraper.k4dir-semih.workers.dev/api/scraper?username=kadirsakgz",
        {
          cache: "no-store",
          headers: {
            "X-Turnstile-Token": token
          }
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const bio = data?.users?.[0]?.bio;

      if (!bio) {
        return;
      }

      text.textContent = bio;
      bubble.style.display = "inline-block";
    } catch {
      return;
    } finally {
      requestRunning = false;
    }
  };

  const init = () => {
    widget = turnstile.render(container, {
      sitekey: "0x4AAAAAAE9z0uzVT7AZC0k3",
      execution: "execute",
      appearance: "interaction-only",
      theme: "auto",
      retry: "never",
      refreshExpired: "manual",

      callback: (token) => {
        requestBio(token);
      },

      "expired-callback": () => {
        lastToken = "";
        turnstile.reset(widget);
        turnstile.execute(widget);
      },

      "error-callback": () => {},
      "timeout-callback": () => {}
    });

    turnstile.execute(widget);
  };

  if (window.turnstile) {
    init();
    return;
  }

  window.addEventListener("load", init, {
    once: true
  });
});
