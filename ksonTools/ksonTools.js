const list = document.querySelector("#tool-list");
const count = document.querySelector("#tool-count");
const status = document.querySelector("#tool-list-status");

const excludedDirectories = new Set(["utilities"]);
const knownToolDirectories = [new URL("./dynamic_effect/", window.location.href)];

const fetchDocument = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} の読み込みに失敗しました。`);
  }

  const source = await response.text();
  return new DOMParser().parseFromString(source, "text/html");
};

const findToolDirectories = async () => {
  const root = new URL("./", window.location.href);
  let discoveredDirectories = [];

  try {
    const directory = await fetchDocument("./");
    discoveredDirectories = [...directory.querySelectorAll("a[href]")]
      .map((anchor) => new URL(anchor.getAttribute("href"), root))
      .filter((url) => url.origin === root.origin && url.pathname.startsWith(root.pathname))
      .filter((url) => url.pathname.endsWith("/") && url.pathname !== root.pathname)
      .filter((url) => {
        const relativePath = decodeURIComponent(url.pathname.slice(root.pathname.length));
        const segments = relativePath.split("/").filter(Boolean);
        return segments.length === 1 && !excludedDirectories.has(segments[0]);
      });
  } catch (error) {
    console.warn("ディレクトリ一覧を取得できなかったため、既知のツールのみ表示します。", error);
  }

  return [...knownToolDirectories, ...discoveredDirectories]
    .filter((url, index, urls) => urls.findIndex((candidate) => candidate.href === url.href) === index);
};

const readTool = async (directoryUrl) => {
  const pageUrl = new URL("index.html", directoryUrl);
  const document = await fetchDocument(pageUrl);
  const title = document.querySelector('meta[name="tool-title"]')?.content.trim()
    || document.querySelector("h1")?.textContent.trim()
    || document.title.replace(/\s*\|\s*ksonTools\s*$/i, "").trim();
  const description = document.querySelector('meta[name="description"]')?.content.trim();

  if (!title || !description) {
    throw new Error(`${pageUrl.href} にタイトルまたは説明がありません。`);
  }

  return { title, description, href: pageUrl.href };
};

const createCard = (tool) => {
  const article = document.createElement("article");
  article.className = "tool-card";

  const link = document.createElement("a");
  link.href = tool.href;

  const heading = document.createElement("h3");
  heading.textContent = tool.title;

  const description = document.createElement("p");
  description.textContent = tool.description;

  link.append(heading, description);
  article.append(link);
  return article;
};

const loadTools = async () => {
  try {
    const directories = await findToolDirectories();
    const results = await Promise.allSettled(directories.map(readTool));
    const tools = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .sort((a, b) => a.title.localeCompare(b.title, "ja"));

    list.replaceChildren(...tools.map(createCard));
    list.setAttribute("aria-busy", "false");
    count.textContent = `${tools.length}件`;

    if (tools.length === 0) {
      status.textContent = "利用可能なツールが見つかりませんでした。";
      status.hidden = false;
    }

    const failedCount = results.length - tools.length;
    if (failedCount > 0) {
      status.textContent = `${failedCount}件のページは情報を取得できなかったため表示していません。`;
      status.hidden = false;
      console.warn("一部のツールページを読み込めませんでした。", results);
    }
  } catch (error) {
    list.replaceChildren();
    list.setAttribute("aria-busy", "false");
    count.textContent = "";
    status.textContent = "ツール一覧を取得できませんでした。ローカルホスト経由で開き直してください。";
    status.hidden = false;
    console.error(error);
  }
};

loadTools();
