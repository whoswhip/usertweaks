// ==UserScript==
// @name         Suwayomi Linker
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Adds a link to a Suwayomi search for the current title
// @author       whoswhip
// @match        http://mangadex.org/*
// @match        https://mangadex.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mangadex.org
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @downloadURL  https://raw.githubusercontent.com/whoswhip/usertweaks/refs/heads/main/userscripts/mangadex.org-suwayomi.user.js
// @updateURL    https://raw.githubusercontent.com/whoswhip/usertweaks/refs/heads/main/userscripts/mangadex.org-suwayomi.user.js
// ==/UserScript==

(function () {
	'use strict';

	const DEFAULT_SUWAYOMI_URL = 'http://localhost:4567';

	function getSuwayomiBaseUrl() {
		return GM_getValue('suwayomiBaseUrl', DEFAULT_SUWAYOMI_URL);
	}

	GM_registerMenuCommand('Set Suwayomi base URL', () => {
		const current = getSuwayomiBaseUrl();
		const input = prompt('Enter your Suwayomi base URL:', current);

		if (input !== null && input.trim() !== '') {
			GM_setValue('suwayomiBaseUrl', input.trim().replace(/\/$/, ''));
			alert('Suwayomi URL saved!');
		}
	});
	GM_registerMenuCommand('Reset Suwayomi URL', () => {
		GM_setValue('suwayomiBaseUrl', DEFAULT_SUWAYOMI_URL);
		alert('Suwayomi URL reset to default');
	});

	function findMangaTitle() {
		const titleParent = document.querySelector('div.title');
		if (!titleParent) return null;

		const mainTitleElem = titleParent.querySelector('p');
		if (!mainTitleElem) return null;

		const secondaryTitleElem = titleParent.querySelector('div.font-normal.line-clamp-2');

		let titleText = mainTitleElem.textContent.trim();
		let secondaryText = secondaryTitleElem ? secondaryTitleElem.textContent.trim() : null;

		return { title: titleText, secondary: secondaryText };
	}

	function waitForElements() {
		return new Promise((resolve) => {
			const checkElements = () => {
				const titleParent = document.querySelector('div.title');
				const readOrBuyElements = document.querySelectorAll(
					'[id^="read-or-buy_"], [id^="mobile_read-or-buy_"]'
				);

				if (titleParent && readOrBuyElements.length > 0) {
					resolve();
					return true;
				}
				return false;
			};

			if (checkElements()) return;

			const observer = new MutationObserver(() => {
				if (checkElements()) {
					observer.disconnect();
				}
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		});
	}

	function createSuwayomiButton(title, isSecondary, flexContainer, flexContainerMobile) {
		const suwayomiUrl = getSuwayomiBaseUrl();
		const searchUrl = `${suwayomiUrl}/sources/all/search?query=${encodeURIComponent(title)}&type=manga`;

		const createButton = (isMobile) => {
			const button = document.createElement('a');
			button.href = searchUrl;
			button.target = '_blank';
			button.rel = 'noopener noreferrer';
			button.textContent = `Suwayomi${isSecondary ? ' (Alt)' : ''}`;
			button.style.backgroundColor = 'rgb(var(--md-accent))';
			button.style.alignItems = 'center';
			button.style.borderRadius = '.25rem';
			button.style.display = 'inline-flex';
			button.style.fontSize = '.75rem';
			button.style.minHeight = '1.75rem';
			button.style.padding = '.3125rem .5rem';
			button.style.transition = 'all .1s ease-out';
			button.id = `${isMobile ? 'mobile_' : ''}read-or-buy-suwayomi-${isSecondary ? 'secondary' : 'main'}`;

			button.addEventListener('mouseover', () => {
				button.style.backgroundColor = 'rgb(var(--md-primary))';
			});
			button.addEventListener('mouseout', () => {
				button.style.backgroundColor = 'rgb(var(--md-accent))';
			});

			return button;
		};

		if (flexContainer) {
			flexContainer.appendChild(createButton(false));
		}
		if (flexContainerMobile) {
			flexContainerMobile.appendChild(createButton(true));
		}
	}

	function addButtons() {
		const titles = findMangaTitle();
		if (!titles) return;

		const readOrBuyElements = document.querySelectorAll('[id^="read-or-buy_"]');
		const readOrBuyElementsMobile = document.querySelectorAll('[id^="mobile_read-or-buy_"]');

		const flexContainer = readOrBuyElements.length > 0 ? readOrBuyElements[0].parentElement : null;
		const flexContainerMobile =
			readOrBuyElementsMobile.length > 0 ? readOrBuyElementsMobile[0].parentElement : null;

		document.querySelectorAll('a[id^="read-or-buy-suwayomi-"]').forEach((btn) => btn.remove());

		createSuwayomiButton(titles.title, false, flexContainer, flexContainerMobile);
		if (titles.secondary) {
			createSuwayomiButton(titles.secondary, true, flexContainer, flexContainerMobile);
		}
	}

	async function init() {
		await waitForElements();
		addButtons();

		let debounceTimer;
		const observer = new MutationObserver(() => {
			if (!window.location.pathname.startsWith('/title/')) {
				return;
			}
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				const readOrBuyElements = document.querySelectorAll('[id^="read-or-buy_"]');
				const suwayomiButtons = document.querySelectorAll('a[id^="read-or-buy-suwayomi-"]');

				if (readOrBuyElements.length > 0 && suwayomiButtons.length === 0) {
					addButtons();
				}
			}, 100);
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	init();
})();
