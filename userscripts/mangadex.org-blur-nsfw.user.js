// ==UserScript==
// @name         Blur NSFW
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Applies a blur filter to manga covers tagged as NSFW on MangaDex, with hover to unblur effect.
// @author       whoswhip
// @match        https://mangadex.org/
// @match        https://mangadex.org/titles
// @match        https://mangadex.org/titles/*
// @match        https://mangadex.org/list/*
// @match        https://mangadex.org/author/*
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

  function addHoverEffect(
    parent,
    img,
    blurLevel,
    unblurLength,
    positionElement,
  ) {
    if (parent._hasListeners) return;

    parent._blurLevel = blurLevel;
    parent._unblurLength = unblurLength;
    parent._isUnblurred = false;

    let cover =
      positionElement || parent.getElementsByClassName("manga-card-cover")[0];
    if (cover) cover.style.position = "relative";

    parent.addEventListener("mouseenter", function () {
      if (!this._isUnblurred) {
        img.style.transition = `filter ${this._unblurLength}ms ease`;
        img.style.filter = "none";
        this._isUnblurred = true;
      }
    });

    parent.addEventListener("mouseleave", function () {
      if (this._isUnblurred) {
        img.style.transition = "";
        img.style.filter = `blur(${this._blurLevel})`;
        this._isUnblurred = false;
      }
    });

    parent._hasListeners = true;
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

  function processMangaSwiperSlide(mangaSwiperSlide) {
    let link = mangaSwiperSlide.getElementsByTagName("a")[0];
    if (!link) return;

    let banner = link.getElementsByTagName("img")[0];
    if (!banner) return;

    let gridDiv = mangaSwiperSlide.querySelector("div[class*='grid']");
    if (!gridDiv) return;

    let div = gridDiv.getElementsByTagName("div")[0];
    if (!div) return;

    let coverLink = div.getElementsByTagName("a")[0];
    if (!coverLink) return;

    let coverImg = coverLink.getElementsByTagName("img")[0];
    if (!coverImg) return;

    let tagsDiv = div.querySelector(
      "div[class*='flex'][class*='flex-wrap'][class*='gap-1']",
    );
    if (!tagsDiv) return;

    let tagElements = tagsDiv.getElementsByTagName("span");
    for (let tagElement of tagElements) {
      let tagText = tagElement.textContent.trim();
      if (isNsfwTag(tagText)) {
        let { blurLevel, unblurLength, emoji } = nsfwTags[tagText];

        let wrapper = document.createElement("div");
        wrapper.style.overflow = "hidden";
        wrapper.style.width = "100%";
        wrapper.style.height = "100%";
        wrapper.style.borderRadius = ".25rem";
        coverImg.parentNode.insertBefore(wrapper, coverImg);
        wrapper.appendChild(coverImg);

        coverImg.style.filter = `blur(${blurLevel})`;
        banner.style.filter = `blur(${blurLevel})`;

        addHoverEffect(coverLink, coverImg, blurLevel, unblurLength, coverLink);
        createOverlay(coverLink, emoji);

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

    if (window.location.pathname === "/") {
      let mangaSwiperSlides = document.getElementsByClassName("swiper-slide");
      for (let mangaSwiperSlide of mangaSwiperSlides) {
        if (!processedCards.has(mangaSwiperSlide)) {
          processMangaSwiperSlide(mangaSwiperSlide);
          processedCards.add(mangaSwiperSlide);
        }
      }
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
