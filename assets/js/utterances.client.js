(() => {
  // Determine the preferred color scheme (dark or light)
  const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "github-dark" : "github-light";

  // Get the current URL and check for the 'utterances' parameter in the query string
  const url = new URL(location.href);
  const session = url.searchParams.get("utterances");

  // If 'utterances' parameter is present, store it in local storage, remove it from the URL, and update the browser history
  if (session) {
    localStorage.setItem("utterances-session", session);
    url.searchParams.delete("utterances");
    history.replaceState(undefined, document.title, url.href);
  }

  // Get the current script element or find it by matching the script source URL
  let script = document.currentScript;
  if (script === undefined) {
    script = document.querySelector('script[src^="https://akakadir.github.io/assets/js/utterances.client.js"],script[src^="http://localhost:4000/client.js"]');
  }

  // Gather attributes from the script element
  const attrs = {};
  for (let i = 0; i < script.attributes.length; i++) {
    const attribute = script.attributes.item(i);
    attrs[attribute.name.replace(/^data-/, "")] = attribute.value;
  }

  // If the theme is set to "preferred-color-scheme," update it with the actual preferred theme
  if (attrs.theme === "preferred-color-scheme") {
    attrs.theme = theme;
  }

  // Gather page attributes
  const canonicalLink = document.querySelector("link[rel='canonical']");
  attrs.url = canonicalLink ? canonicalLink.href : url.origin + url.pathname + url.search;
  attrs.origin = url.origin;
  attrs.pathname = url.pathname.length < 2 ? "index" : url.pathname.substr(1).replace(/\.\w+$/, "");
  attrs.title = document.title;
  const descriptionMeta = document.querySelector("meta[name='description']");
  attrs.description = descriptionMeta ? descriptionMeta.content : "";
  const len = encodeURIComponent(attrs.description).length;
  if (len > 1000) {
    attrs.description = attrs.description.substr(0, Math.floor(attrs.description.length * 1000 / len));
  }
  const ogtitleMeta = document.querySelector("meta[property='og:title'],meta[name='og:title']");
  attrs["og:title"] = ogtitleMeta ? ogtitleMeta.content : "";
  attrs.session = session || localStorage.getItem("utterances-session") || "";

  // Insert styles for Utterances comments and iframe container into the <head>
  document.head.insertAdjacentHTML(
    "afterbegin",
    `<style>
      .utterances {
        position: relative;
        box-sizing: border-box;
        width: 100%;
        max-width: 760px;
        margin-left: auto;
        margin-right: auto;
      }
      .utterances-frame {
        color-scheme: light;
        position: absolute;
        left: 0;
        right: 0;
        width: 1px;
        min-width: 100%;
        max-width: 100%;
        height: 100%;
        border: 0;
      }
    </style>`
  );

  // Create the comments iframe and its responsive container
  const frameUrl = `https://utteranc.es/utterances.html`;

  script.insertAdjacentHTML(
    "afterend",
    `<div class="utterances">
      <iframe class="utterances-frame" title="Comments" scrolling="no" src="${frameUrl}?${new URLSearchParams(attrs)}" loading="lazy"></iframe>
    </div>`
  );

  const container = script.nextElementSibling;
  script.parentElement.removeChild(script);

  // Adjust the iframe's height when the height of its content changes
  addEventListener("message", (event) => {
    if (event.origin !== "https://utteranc.es") {
      return;
    }
    const data = event.data;
    if (data && data.type === "resize" && data.height) {
      container.style.height = `${data.height}px`;
    }

    // remove loadingDiv
    utterances_skeleton = document.querySelector('body > main > div > div.utterances_skeleton')
    if (utterances_skeleton) {
      utterances_skeleton.remove();
    }
  });
})();
