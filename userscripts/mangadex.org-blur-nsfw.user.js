// ==UserScript==
// @name         Blur NSFW
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Applies a blur filter to manga covers tagged as NSFW on MangaDex, with hover to unblur effect.
// @author       whoswhip
// @match        https://mangadex.org/titles*
// @match        https://mangadex.org/list/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mangadex.org
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/whoswhip/usertweaks/refs/heads/main/userscripts/mangadex.org-blur-nsfw.user.js
// @updateURL    https://raw.githubusercontent.com/whoswhip/usertweaks/refs/heads/main/userscripts/mangadex.org-blur-nsfw.user.js
// ==/UserScript==

(function () {
  "use strict";

  const nsfwTags = {
    Erotica: {
      emoji: "💦",
      blurLevel: "15px",
      unblurLength: 1000,
    },
    Mature: {
      emoji: "🔞",
      blurLevel: "20px",
      unblurLength: 2000,
    },
  };

  function isNsfwTag(tagText) {
    return nsfwTags.hasOwnProperty(tagText);
  }

  function addHoverEffect(mangaCard, img, blurLevel, unblurLength) {
    if (mangaCard._hasListeners) return;

    mangaCard._blurLevel = blurLevel;
    mangaCard._unblurLength = unblurLength;
    mangaCard._isUnblurred = false;

    let cover = mangaCard.getElementsByClassName("manga-card-cover")[0];
    cover.style.position = "relative";

    mangaCard.addEventListener("mouseenter", function () {
      if (!this._isUnblurred) {
        img.style.transition = `filter ${this._unblurLength}ms ease`;
        img.style.filter = "none";
        this._isUnblurred = true;
      }
    });

    mangaCard.addEventListener("mouseleave", function () {
      if (this._isUnblurred) {
        img.style.transition = "";
        img.style.filter = `blur(${this._blurLevel})`;
        this._isUnblurred = false;
      }
    });

    mangaCard._hasListeners = true;
  }

  function createOverlay(parent, emoji) {
    let overlay = document.createElement("span");
    overlay.textContent = emoji;
    overlay.style.position = "absolute";
    overlay.style.top = "5px";
    overlay.style.left = "10px";
    overlay.style.fontSize = "24px";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "1";
    overlay.style.userSelect = "none";
    overlay.style.textShadow = "0 0 5px rgba(0, 0, 0, 0.7)";
    parent.appendChild(overlay);
  }

  function processMangaCard(mangaCard) {
    let tags = mangaCard.getElementsByClassName("tags")[0];
    if (!tags) return;

    let tagElements = tags.getElementsByTagName("span");
    for (let tagElement of tagElements) {
      let tagText = tagElement.textContent.trim();
      if (isNsfwTag(tagText)) {
        let cover = mangaCard.getElementsByClassName("manga-card-cover")[0];
        if (!cover) return;

        let img = cover
          .getElementsByTagName("a")[0]
          .getElementsByTagName("img")[0];
        let { blurLevel, unblurLength, emoji } = nsfwTags[tagText];

        img.style.filter = `blur(${blurLevel})`;

        addHoverEffect(mangaCard, img, blurLevel, unblurLength);
        createOverlay(cover, emoji);

        break;
      }
    }
  }

  let debounceTimeout;
  const processedCards = new WeakSet();

  function findCards() {
    const currentURL = window.location.href;
    if (/[&?]content=.*(erotica|pornographic)/.test(currentURL)) {
      return;
    }

    let mangaCards = document.getElementsByClassName("manga-card");
    for (let mangaCard of mangaCards) {
      if (!processedCards.has(mangaCard)) {
        processMangaCard(mangaCard);
        processedCards.add(mangaCard);
      }
    }
  }

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      findCards();
    }, 10);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  findCards();
})();
