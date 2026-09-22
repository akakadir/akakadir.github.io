document.addEventListener("DOMContentLoaded", () => {
  const bubble = document.getElementById("bio-bubble");
  const text = document.getElementById("bio-text");

  const container = document.createElement("div");

  container.style.display = "none";
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

  const loadTurnstile = () => {
    if (window.turnstile) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

      script.async = true;
      script.defer = true;
      script.dataset.cfasync = "false";

      script.onload = resolve;
      script.onerror = reject;

      document.head.appendChild(script);
    });
  };

  loadTurnstile()
    .then(() => {
      widget = turnstile.render(container, {
        sitekey: "0x4AAAAAAE9z0uzVT7AZC0k3",
        execution: "execute",
        retry: "never",

        callback: (token) => {
          requestBio(token);
        },

        "error-callback": () => {},

        "expired-callback": () => {
          lastToken = "";
          turnstile.reset(widget);
          turnstile.execute(widget);
        }
      });

      turnstile.execute(widget);
    })
    .catch(() => {});
});
