const outView = document.getElementById("generated_path");
const applyButton = document.getElementById("apply");

const inputTemplate = document.getElementById("input_template");
const templateButton = document.getElementById("change_template");

const DEFAULT_TEMPLATE = `$authors「$title」($journal, $year 年, $volume 巻 $issue 号, $page)`;

const TEMPLATE_KEY = "TEMPLATE_KEY";

chrome.storage.local.get([TEMPLATE_KEY], (value) => {
  if (value.hasOwnProperty(TEMPLATE_KEY)) {
    inputTemplate.value = value[TEMPLATE_KEY];
  } else {
    inputTemplate.value = DEFAULT_TEMPLATE;
  }
});

templateButton.addEventListener("click", () => {
  chrome.storage.local.set({
    [TEMPLATE_KEY]: inputTemplate.value,
  });
  window.close();
});

class RefTextGenerator {
  constructor(doc) {
    this.paperTitle =
      doc.getElementsByClassName("global-article-title")[0]?.innerHTML ?? "no";
    this.paperAuthors =
      Array.from(
        doc
          .getElementsByClassName("global-authors-name-tags")[0]
          ?.getElementsByTagName("a")
      ).map((x) => x.innerText) ?? [];
    this.journalName =
      doc.getElementsByClassName("journal-name")[0]?.innerHTML ?? "no";
    const para = doc.getElementsByClassName("global-para")[1]?.innerHTML;
    const ySplitted = para.split("年");
    this.year = ySplitted[0].trim();
    const vSplitted = ySplitted[1].split("巻");
    this.volume = vSplitted[0].trim();
    const iSplitted = vSplitted[1].split("号");
    this.issue = iSplitted[0].trim();
    this.page = iSplitted[1].trim();
  }

  generate(template = DEFAULT_TEMPLATE, authorSeparator = ",") {
    const refText = template
      .replace("$title", this.paperTitle)
      .replace("$authors", this.paperAuthors.join(authorSeparator))
      .replace("$journal", this.journalName)
      .replace("$year", this.year)
      .replace("$volume", this.volume)
      .replace("$issue", this.issue)
      .replace("$page", this.page);
    return refText;
  }
}

chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
  let url = tabs[0].url;
  const parsed = new URL(url);
  const origin = parsed.origin;
  const pathname = parsed.pathname;
  const paths = pathname
    .split("-")[0]
    .split("/")
    .filter((x) => x.length > 0);
  paths.pop();
  const newPath = origin + "/" + paths.join("/") + "/_article/-char/ja";
  //outView.innerText = newPath;
  await fetch(newPath, {
    method: "GET",
  })
    .then(function (response) {
      return response.text();
    })
    .then(function (data) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, "text/html");
      const refTextGenerator = new RefTextGenerator(doc);
      chrome.storage.local.get([TEMPLATE_KEY], (value) => {
        if (value.hasOwnProperty(TEMPLATE_KEY)) {
          outView.innerText = refTextGenerator.generate(value[TEMPLATE_KEY]);
        } else {
          outView.innerText = refTextGenerator.generate(DEFAULT_TEMPLATE);
        }
      });
    });
});

applyButton.addEventListener("click", async () => {
  navigator.clipboard.writeText(outView.innerText);
});
