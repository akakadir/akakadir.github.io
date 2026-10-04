document.addEventListener("DOMContentLoaded", () => {
  const bubble = document.getElementById("bio-bubble");
  const text = document.getElementById("bio-text");

  let requestRunning = false;

  const requestBio = async () => {
    if (requestRunning) {
      return;
    }

    requestRunning = true;

    try {
      const response = await fetch(
        "https://api.akakadir.art/api/scraper?username=kadirsakgz",
        {
          cache: "no-store"
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
    } catch (error) {
      console.error("kendi yazdığım api arazi oldu galiba", error);
    } finally {
      requestRunning = false;
    }
  };

  requestBio();
});
