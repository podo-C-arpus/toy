const list = document.querySelector("#tool-list");
const count = document.querySelector("#tool-count");
const status = document.querySelector("#tool-list-status");

const toolDirectories = [
  new URL("./dynamic_effect/", window.location.href),
  new URL("./curve2polyline/", window.location.href),
];

const fetchDocument = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} の読み込みに失敗しました。`);
  }

  const source = await response.text();
  return new DOMParser().parseFromString(source, "text/html");
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
    const results = await Promise.allSettled(toolDirectories.map(readTool));
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
