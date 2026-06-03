(function () {
  var BGM_BASE_URL = "https://api.bgm.tv/v0/subjects/";

  var INFO_KEYS = ["话数", "放送开始", "Copyright"];

  function formatInfoboxValue(value) {
    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          if (item && typeof item === "object") {
            return item.v || item.value || "";
          }
          return item || "";
        })
        .filter(Boolean)
        .join(", ");
    }
    if (value && typeof value === "object") {
      return value.v || value.value || "";
    }
    return value || "";
  }

  function pickInfobox(infobox, key) {
    if (!Array.isArray(infobox)) return "";
    var item = infobox.find(function (entry) {
      return entry && entry.key === key;
    });
    if (!item) return "";
    return formatInfoboxValue(item.value);
  }

  function renderBgmCard(data, id) {
    var card = document.createElement("div");
    card.className = "bgm-card";
    card.setAttribute("data-bgm-id", id);

    var name = (data && (data.name_cn || data.name)) || "Bangumi";
    var rating = data && data.rating && typeof data.rating.score === "number" ? data.rating.score : null;
    var tags = data && Array.isArray(data.tags) ? data.tags.slice(0, 5) : [];

    // Cover
    var coverUrl = data && data.images && data.images.common ? data.images.common : "";
    var coverDiv = document.createElement("div");
    coverDiv.className = "bgm-cover";
    var showNoCover = function () {
      if (coverDiv.querySelector(".bgm-cover-placeholder")) return;
      coverDiv.innerHTML = '<div class="bgm-cover-placeholder">No Cover</div>';
    };
    if (coverUrl) {
      var link = document.createElement("a");
      link.className = "bgm-cover-link";
      link.href = "https://bangumi.tv/subject/" + id;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = "在 Bangumi 查看";
      var img = document.createElement("img");
      img.alt = name;
      img.onerror = showNoCover;
      var coverTimeout = setTimeout(showNoCover, 8000);
      img.onload = function () { clearTimeout(coverTimeout); };
      img.src = coverUrl;
      link.appendChild(img);
      coverDiv.appendChild(link);
    } else {
      showNoCover();
    }
    card.appendChild(coverDiv);

    // Content
    var contentDiv = document.createElement("div");
    contentDiv.className = "bgm-content";

    var titleDiv = document.createElement("div");
    titleDiv.className = "bgm-title";
    titleDiv.textContent = name;
    contentDiv.appendChild(titleDiv);

    // Meta
    var metaDiv = document.createElement("div");
    metaDiv.className = "bgm-meta";
    if (rating !== null) {
      var scoreSpan = document.createElement("span");
      scoreSpan.className = "bgm-score";
      scoreSpan.textContent = "bangumi评分: " + rating.toFixed(1);
      metaDiv.appendChild(scoreSpan);
    }
    contentDiv.appendChild(metaDiv);

    // Info
    var infoItems = [];
    for (var i = 0; i < INFO_KEYS.length; i++) {
      var value = pickInfobox(data && data.infobox, INFO_KEYS[i]);
      if (value) infoItems.push({ key: INFO_KEYS[i], value: value });
    }
    if (infoItems.length > 0) {
      var infoList = document.createElement("ul");
      infoList.className = "bgm-info";
      for (var j = 0; j < infoItems.length; j++) {
        var li = document.createElement("li");
        li.className = "bgm-info-item";
        var keySpan = document.createElement("span");
        keySpan.className = "bgm-info-key";
        keySpan.textContent = infoItems[j].key;
        var valueSpan = document.createElement("span");
        valueSpan.className = "bgm-info-value";
        valueSpan.textContent = infoItems[j].value;
        li.appendChild(keySpan);
        li.appendChild(valueSpan);
        infoList.appendChild(li);
      }
      contentDiv.appendChild(infoList);
    }

    // Tags
    if (tags.length > 0) {
      var tagsDiv = document.createElement("div");
      tagsDiv.className = "bgm-tags";
      for (var k = 0; k < tags.length; k++) {
        var tagSpan = document.createElement("span");
        tagSpan.className = "bgm-tag";
        tagSpan.textContent = tags[k].name;
        tagsDiv.appendChild(tagSpan);
      }
      contentDiv.appendChild(tagsDiv);
    }

    card.appendChild(contentDiv);
    return card;
  }

  function renderError(id, message) {
    var card = document.createElement("div");
    card.className = "bgm-card bgm-card-error";
    card.textContent = "Failed to load anime " + id + (message ? ": " + message : "");
    return card;
  }

  function fetchBgm(id) {
    return fetch(BGM_BASE_URL + id, {
      headers: {
        Accept: "application/json",
      },
    }).then(function (res) {
      if (res.ok) {
        return res.json();
      }
      return res.text().then(function (text) {
        var detail = text;
        try {
          detail = JSON.stringify(JSON.parse(text));
        } catch (e) {}
        throw new Error("BGM API " + res.status + ": " + detail);
      });
    });
  }

  function initBgmCards() {
    var cards = document.querySelectorAll(".bgm-card[data-bgm-id]");
    if (!cards.length) return;

    var entries = [];
    for (var i = 0; i < cards.length; i++) {
      entries.push({
        el: cards[i],
        id: cards[i].getAttribute("data-bgm-id"),
      });
    }

    var promises = entries.map(function (entry) {
      return fetchBgm(entry.id)
        .then(function (data) {
          var newCard = renderBgmCard(data, entry.id);
          entry.el.parentNode.replaceChild(newCard, entry.el);
        })
        .catch(function (err) {
          console.warn("[bgm-card] Failed to load " + entry.id + " (" + BGM_BASE_URL + entry.id + "): " + (err.message || err));
          var errCard = renderError(entry.id, err.message);
          entry.el.parentNode.replaceChild(errCard, entry.el);
        });
    });

    Promise.allSettled(promises);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBgmCards);
  } else {
    initBgmCards();
  }

  document.addEventListener("pjax:success", function () {
    setTimeout(initBgmCards, 0);
  });
})();
