document.addEventListener("DOMContentLoaded", async () => {
  const bubble = document.getElementById("bio-bubble");
  const text = document.getElementById("bio-text");

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
      script.onload = resolve;
      script.onerror = reject;

      document.head.appendChild(script);
    });
  };

  try {
    await loadTurnstile();

    const container = document.createElement("div");

    container.style.display = "none";
    document.body.appendChild(container);

    const widget = turnstile.render(container, {
      sitekey: "0x4AAAAAAE9z0uzVT7AZC0k3",
      execution: "render",

      callback: async (token) => {
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
            throw new Error(`API ${response.status}`);
          }

          const data = await response.json();
          const bio = data?.users?.[0]?.bio;

          if (!bio) return;

          text.textContent = bio;
          bubble.style.display = "inline-block";
        } catch (error) {
          console.error("Bio API:", error);
        } finally {
          turnstile.reset(widget);
        }
      },

      "error-callback": () => {
        console.error("Turnstile doğrulaması başarısız.");
      },

      "expired-callback": () => {
        turnstile.reset(widget);
      }
    });
  } catch (error) {
    console.error("Turnstile:", error);
  }
});
