const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsDiv = document.getElementById("results");
const errorBox = document.getElementById("errorBox");
const loadingBox = document.getElementById("loadingBox");
const rawOutput = document.getElementById("rawOutput");
const terminalText = document.getElementById("terminalText");

async function apiCall(path, method = "GET", body = null) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "API Request Failed");
  }
  return data;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

function showOutput(text) {
  terminalText.textContent = text;
  rawOutput.classList.remove("hidden");
}

async function doSearch() {
  const query = searchInput.value.trim();
  hideError();
  rawOutput.classList.add("hidden");
  resultsDiv.innerHTML = "";
  loadingBox.classList.remove("hidden");
  searchBtn.disabled = true;

  try {
    const res = await apiCall(`/api/clawhub/search?q=${encodeURIComponent(query)}`);

    // The CLI output is in res.output. Let's show it.
    if (res.output) {
      showOutput(res.output);
    }

    // If we can parse skills from the response, render cards
    if (res.skills && res.skills.length > 0) {
      renderSkills(res.skills);
    } else {
      // Create a fallback card to install directly if they know the name
      if (query) {
         renderSkills([{ name: query, description: "Install by exact slug." }]);
      }
    }

  } catch (err) {
    showError(err.message);
  } finally {
    loadingBox.classList.add("hidden");
    searchBtn.disabled = false;
  }
}

function renderSkills(skills) {
  resultsDiv.innerHTML = "";
  skills.forEach(skill => {
    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = skill.name;
    header.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "card-desc";
    desc.textContent = skill.description || "No description";

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const installBtn = document.createElement("button");
    installBtn.className = "btn primary";
    installBtn.textContent = "Add";
    installBtn.onclick = () => doInstall(skill.name, installBtn);

    actions.appendChild(installBtn);

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(actions);

    resultsDiv.appendChild(card);
  });
}

async function doInstall(name, btn) {
  hideError();
  rawOutput.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Installing...";

  try {
    const res = await apiCall(`/api/clawhub/install`, "POST", { name });
    btn.textContent = "Installed";
    btn.classList.remove("primary");

    let combinedOutput = (res.output || "") + "\n" + (res.errorOutput || "");
    showOutput(combinedOutput);

    if (combinedOutput.toLowerCase().includes("missing env") || combinedOutput.toLowerCase().includes("config needed") || combinedOutput.toLowerCase().includes("warning")) {
      const warnMsg = document.createElement("div");
      warnMsg.style.color = "var(--danger)";
      warnMsg.style.marginTop = "8px";
      warnMsg.style.fontSize = "14px";
      warnMsg.textContent = "⚠️ Skill needs configuration. Please check the Skills settings tab.";
      btn.parentElement.parentElement.appendChild(warnMsg);
    }

  } catch (err) {
    showError("Install failed: " + err.message);
    btn.disabled = false;
    btn.textContent = "Add";
  }
}

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

// Initial load
doSearch();
