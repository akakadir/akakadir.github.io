document.addEventListener("DOMContentLoaded", async () => {
  const bubble = document.getElementById("bio-bubble");
  const text = document.getElementById("bio-text");

  try {
    const response = await fetch(
      "https://igscraper-icr8.onrender.com/api/scraper?username=kadirsakgz",
      { cache: "no-store" }
    );

    if (!response.ok) throw new Error(`API ${response.status}`);

    const data = await response.json();
    const bio = data?.users?.[0]?.bio;

    if (!bio) return;

    text.textContent = bio;
    bubble.style.display = "inline-block";
  } catch (error) {
    console.error("Bio API:", error);
  }
});