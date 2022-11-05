// GAMES
const gameNames = ["slime"];
const games = {};

for (let i = 0; i < gameNames.length; i++) {
	const gameName = gameNames[i];

	import(`./games/${gameName}.js`).then(game => {
		games[gameName.toLowerCase()] = game;
	});
}

// DEBUGGING
let debugMode = false; // Set to true for debugging
const DISABLE_START_DELAY = true;
const DISABLE_MIN_PLAYERS = true;

const localHosting = window.location.pathname.startsWith("/party-animals/");

if (!localHosting) {
	debugMode = false;
} else if (debugMode) {
	console.log("Debug mode enabled");
}

const MIN_PLAYERS = 2;

// TIMING
const GAME_START_DELAY = 5;
const GAME_END_DURATION = 5;
const TOOLTIP_DURATION = 1;

const ANIMALS = [
	"Pig",
	"Cat",
	"Dog",
	"Bear",
	"Spider",
	"Sheep",
	// "Fish",
	// "Lion",
	// "Wolf",
	// "Chicken",
	// "Horse",
];

const COLORS = [
	"Red",
	"Orange",
	"Yellow",
	"Green",
	"Blue",
	"Purple",
	"Pink",
];

class Modal {
	constructor(title, body) {
		this.title = title;
		this.body = body;
	}

	replaceText(key, replacement) {
		this.title = this.title.replaceAll(`[${key}]`, replacement);
		this.body = this.body.replaceAll(`[${key}]`, replacement);
	}
}

const modals = {
	"JOIN_PARTY": new Modal("Join a party", `
		<span id="party-code-input">
			<label for="party-code">Enter a party code</label>
			<span class="has-tooltip">
				<input id="party-code" maxlength="6" type="text" autocomplete="off">
				<button class="text-button" id="submit-party-code">Join</button>
				<p class="tooltip top" style="--offset: 30px;">Invalid party code</p>
			</span>
		</span>`),
	"INVITE_PLAYERS": new Modal("Invite players", `
		<span class="has-tooltip">
			<strong id="party-code">[PARTY_CODE]</strong>
			<p class="tooltip top">Copied!</p>
		</span>
		<div id="invite-buttons">
			<button class="text-button" id="copy-invite-code">Copy invite code</button>
			<button class="text-button has-tooltip" id="copy-invite-link">
				Copy invite link
				<p class="tooltip top">Copied!</p>
			</button>
		</div>`),
	"EMPTY_PARTY": new Modal("You can't leave yourself", `<p>You are already in an empty party!</p>`),
	"NEED_MORE_PLAYERS": new Modal("You need more players", `<p>You can't launch a game by yourself. Invite more players to start playing.</p>`),
	"NOT_HOST": new Modal("You are not the party host", `<p>Only the party host can launch a game.</p>`),
	"GAME_INFO": new Modal("[GAME_DISPLAY_TITLE]", `
		<p><strong>[GAME_DISPLAY_TITLE]</strong> is [GAME_DESCRIPTION]</p>
		<button class="text-button" id="launch-game" data-game-name="[GAME_TITLE]">Launch</button>`),
};

const gameData = {
	"slime": {
		displayTitle: "Candy Rush",
		description: "a game where you have to eat candy as fast as you can to outgrow other players and consume them.",
		icon: "candy.svg",
	},
	"tron": {
		displayTitle: "Tron",
		description: "coming soon.",
	},
	"tanks": {
		displayTitle: "Tanks",
		description: "coming soon.",
	},
	"dogfight": {
		displayTitle: "Dogfight",
		description: "coming soon.",
	},
	"draw-battle": {
		displayTitle: "Draw Battle",
		description: "coming soon.",
	},
}

function randomFromArray(array) {
	return array[Math.floor(Math.random() * array.length)];
}

function createName(animal) {
	const prefix = randomFromArray([
		// Alphabetical order
		"Big",
		"Buff",
		"Cool",
		"Dark",
		"Eternal",
		"Evil",
		"Floaty",
		"Friendly",
		"Long",
		"Radioactive",
		"Rich",
		"Silky",
		"Small",
		"Smart",
		"Smug",
		"Soft",
		"Super",
		"Ultra",
	]);

	return `${prefix} ${animal}`;
}

function convertToPossessive(name) {
	const lastCharacter = name.slice(-1).toLowerCase();
	return lastCharacter == "s" ? `${name}'` : `${name}'s`;
}

function getURLParameters() {
	let parameters = window.location.search != "" ? {} : null;

	if (parameters)
		window.location.search.substring(1).split("&").forEach(query => 
			parameters[query.split("=")[0]] = query.split("=")[1]
		);

	return parameters;
}

function moveElementToElement(element, target) {
	if (!element || !target)
		return;

	const rect = target.getBoundingClientRect();

	element.style.left = `${(rect.left + rect.right) / 2}px`;
	element.style.top = `${(rect.top + rect.bottom) / 2}px`;
}

function toggleClass(element, active, className) {
	if (active) {
		if (!element.classList.contains(className))
			element.classList.add(className);
	} else if (element.classList.contains(className)) {
		element.classList.remove(className);
	}
}

function getFutureDate(seconds) {
	const time = new Date();
	time.setSeconds(time.getSeconds() + seconds);
	return time;
}

(function init() {

	// Player
	let playerId;
	let playerRef;

	// Party
	let party = {};
	let players = {};
	let playerElements = {};
	const playerList = document.querySelector("#player-list #players");
	let partyRef;
	let partyCode;
	let partyMembersRef;
	let lastLeftParty;

	// Player options
	const playerNameInput = document.querySelector("#player-name");
	const randomizeNameButton = document.querySelector("#randomize-name");
	const playerAnimalButton = document.querySelector("#player-animal");
	const playerColorButton = document.querySelector("#player-color");
	const characterPreview = document.querySelector("#character-preview");

	// Party options
	const partyName = document.querySelector("#party-name");
	const invitePlayersButton = document.querySelector("#invite-players");
	const joinPartyButton = document.querySelector("#join-party");
	const leavePartyButton = document.querySelector("#leave-party");

	// Modal
	const modal = document.querySelector("#modal");
	const modalTitle = modal.querySelector("#modal-title").childNodes[0];
	const modalBody = modal.querySelector("#modal-body");
	let allowClickingModalAway = true;

	// Chat
	const chat = document.querySelector("#chat");
	const chatInput = document.querySelector("#chat-input");
	const chatSendButton = document.querySelector("#chat-send");
	const chatToggle = document.querySelector("#chat-header");
	const chatMessagesList = document.querySelector("#chat-messages");
	let chatMessagesRef;

	// Games
	const gamesGrid = document.querySelector("#games-grid");

	// Menu buttons
	const menuButtonsParent = document.querySelector("#menu-buttons-inner");
	const menuButtonsIndicator = document.querySelector("#menu-buttons-indicator");
	const menusParent = document.querySelector("#menus");
	const title = document.querySelector("#title");

	// Home
	const joinPartyHomeButton = document.querySelector("#home-join-party");
	const createPartyHomeButton = document.querySelector("#home-create-party");
	const browseGamesHomeButton = document.querySelector("#home-browse-games");
	let activeMenuId;

	// Loading screen
	const loadingScreen = document.querySelector("#loading-screen");

	// Lost connection screen
	const lostConnectionScreen = document.querySelector("#lost-connection-screen");
	const reconnectButton = document.querySelector("#reconnect");

	// Game transitions
	const gameStartScreen = document.querySelector("#game-start-screen");
	const gameEndScreen = document.querySelector("#game-end-screen");

	function moveMenuButtonsIndicator() {
		const menuButton = menuButtonsParent.querySelector(`button[data-menu="${activeMenuId}"]`);
		moveElementToElement(menuButtonsIndicator, menuButton);
	}

	function showMenu(id) {
		activeMenuId = id;
		localStorage.setItem("activeMenuId", id);

		// Hide title when home menu is activated
		toggleClass(title, id == "home-menu", "hidden");

		switch (id) {
			case "games-menu":
				title.textContent = party.host == playerId ? "Choose a game to play" : "Games"
				break;
			case "party-menu":
				title.textContent = "Party"
					break;
			case "customization-menu":
				title.textContent = "Player customization"
				break;
		}

		// Show the right menu and hide the others
		let menuIndex;
		for (let i = 0; i < menusParent.children.length; i++) {
            const menu = menusParent.children[i];
			toggleClass(menu, menu.id == id, "active");

			if (menu.id == id)
				menuIndex = i;
        }

		// Add position classes
		for (let i = 0; i < menusParent.children.length; i++) {
			const menu = menusParent.children[i];
			if (i < menuIndex) {
				menu.classList.remove("below");
				menu.classList.add("above");
			} else if (i > menuIndex) {
				menu.classList.remove("above");
				menu.classList.add("below");
			}
		}

		moveMenuButtonsIndicator();
	}

	function sendChatMessage(text) {
		if (text.trim().length == 0)
			return;

		// Remove links from message
		const matches = text.match(/(?:(?:https?|ftp):\/\/)[\w\/\-?=%.]+\.[\w\/\-&?=%.]+/g);

		if (matches) {
			matches.forEach((match) => {
				let domain = new URL(match).hostname.replace("www.", "");

				if (domain != window.location.hostname)
					text = text.replaceAll(match, "[Link removed]");
			});
		}

		chatInput.value = "";

		const time = Date.now();
		const chatMessageRef = chatMessagesRef.child(time);

		chatMessageRef.set({
			senderId: playerId,
			text: text
		});
	}

	function showChatMessage(senderName, color, text, includeColon) {
		const newMessageElement = document.createElement("span");
		newMessageElement.classList.add("chat-message", color.toLowerCase());

		newMessageElement.innerHTML = `
			<p class="name">${includeColon ? senderName + ":" : senderName}</p>
			<p class="text">${text}</p>`;

		chatMessagesList.appendChild(newMessageElement);

		chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
	}

	function clearChat() {
		chatMessagesList.innerHTML = "";
	}

	function storePlayerData() {
		const player = players[playerId];

		const playerData = {
			name: player.name,
			animal: player.animal,
			color: player.color,
		}

		localStorage.setItem("playerData", JSON.stringify(playerData));
	}

	function loadPlayerData() {
		const playerData = JSON.parse(localStorage.getItem("playerData"));

		if (playerData != null) {
			setPlayerColor(playerData.color);
			setPlayerAnimal(playerData.animal);
			setPlayerName(playerData.name);
		} else {
			storePlayerData();
		}
	}

	function createPlayerElement(player) {
		const element = document.createElement("div");
		element.classList.add("player");
		element.innerHTML = `
			<div class="character ${player.color.toLowerCase()} ${player.animal.toLowerCase()}"><div class="character-detail"></div></div>
			<span>
				<p class="name">${player.name}</p>
				<p class="score">Score: ${player.score}</p>
			</span>`;

		if (player.id == playerId) {
			element.classList.add("self");
		} else if (player.id == party.host) {
			element.classList.add("host");
		}

		return element;
	}

	function setPlayerName(name) {
		playerNameInput.value = name;

		playerRef.update({name});

		storePlayerData();
	}

	function setPlayerColor(color) {
		playerRef.update({color});

		storePlayerData();
	}

	function setPlayerAnimal(animal) {
		playerRef.update({animal});

		storePlayerData();
	}

	function launchGame(name) {
		name = name.toLowerCase();

		if (!Object.keys(games).includes(name))
			return;

		const gameDataRef = firebase.database().ref(`parties/${partyCode}/gameData`);

		const time = getFutureDate(!debugMode ? GAME_START_DELAY : 0).toUTCString();

		console.log(time);

		gameDataRef.set({
			name,
			start: time
		});

		gameDataRef.onDisconnect().remove();

		closeModal();
	}

	function startGame(name) {
		try {
			games[name].start(players, playerId, party.host, partyCode, debugMode && DISABLE_MIN_PLAYERS);
		} catch (error) {
			console.log("Failed to launch game: " + name);
			console.error(error);
		}
	}

	function getPartyInviteLink() {
		return `${window.location.href}?invite=${partyCode}`;
	}

	function setClipboard(text) {
		navigator.clipboard.writeText(text);
	}

	function showTooltip(element) {
		const tooltip = element.querySelector(".tooltip");
		tooltip.classList.add("active");

		setTimeout(() => {
			tooltip.classList.remove("active");
		}, TOOLTIP_DURATION * 1000);
	}

	function copyInviteCode() {
		setClipboard(partyCode);
		showTooltip(modal.querySelector("#party-code").parentElement);
	}

	function copyInviteLink() {
		setClipboard(getPartyInviteLink());
		showTooltip(modal.querySelector("#copy-invite-link"));
	}

	function handleModalClick(event) {
		const element = event.target;

		switch (element.id) {
			case "party-code":
			case "copy-invite-code":
				copyInviteCode();
				break;
			case "copy-invite-link":
				copyInviteLink();
				break;
		}
	}

	function showModal(modalContent, replacements) {
		let modalKey;
		for (const [key, value] of Object.entries(modals)) {
			if (value == modalContent) {
				modalKey = key
			}
		}

		modal.setAttribute("data-modal-key", modalKey);

		if (debugMode)
			console.log(`Showing "${modalKey}" modal`);

		const newModal = new Modal(modalContent.title, modalContent.body);
		newModal.replaceText("PARTY_CODE", partyCode);
		newModal.replaceText("PARTY_LINK", getPartyInviteLink());

		if (replacements != null)
			for (const [key, value] of Object.entries(replacements)) {
				newModal.replaceText(key, value);
			}

		modalTitle.textContent = newModal.title;
		modalBody.innerHTML = newModal.body;

		if (modalKey == "JOIN_PARTY") {
			const partyCodeInput = modal.querySelector("#party-code");
			const partyCodeButton = modal.querySelector("#submit-party-code");

			// Remove spaces from party code input field
			partyCodeInput.addEventListener("input", () => {
				partyCodeInput.value = partyCodeInput.value.split(" ").join("");
			});

			function submitPartyCode() {
				if (partyCodeInput.value.length == 6 && partyCodeInput.value.toUpperCase() != partyCode) {
					firebase.database().ref(`parties/${partyCode}/code`).once("value", snapshot => {
						if (snapshot.exists()) {
							closeModal();
							partyCodeInput.removeEventListener("keypress", processPartyCodeKeyPress);

							const code = partyCodeInput.value.toUpperCase();
							joinParty(code);
							showMenu("party-menu");
						}
					});
				} else {
					showTooltip(partyCodeInput.parentElement);
				}
			}

			function processPartyCodeKeyPress(event) {
				// TO DO: Should show modal to user when they try to join their own party
				if (event.key == "Enter")
					submitPartyCode()
			}

			partyCodeInput.addEventListener("keypress", processPartyCodeKeyPress);
			partyCodeButton.addEventListener("click", submitPartyCode);
		} else if (modalKey == "INVITE_PLAYERS") {
			modalBody.addEventListener("click", handleModalClick);
		} else if (modalKey == "GAME_INFO") {
			const launchButton = modalBody.querySelector("#launch-game");

			if (!gameNames.includes(launchButton.getAttribute("data-game-name"))) {
				launchButton.remove();
			} else if (party.host != playerId) {
				launchButton.classList.add("disabled");
			} else {
				const title = launchButton.getAttribute("data-game-name");

				launchButton.addEventListener("click", () => {
					if (Object.keys(players).length >= MIN_PLAYERS || debugMode) {
						launchGame(title);
					} else {
						showModal(modals.NEED_MORE_PLAYERS);
					}
				});
			}
		}

		modal.classList.add("active");

		// This delay is required because without it, any button click that opens the modal will also immediately close it 
		// because it thinks the user clicked outside the modal to close it because it was already open
		allowClickingModalAway = false;
		setTimeout(() => {
			allowClickingModalAway = true;
		}, 50);
	}

	function closeModal() {
		modal.classList.remove("active");

		modalBody.removeEventListener("click", handleModalClick);
	}

	function setPartyReferences(code) {
		partyRef = firebase.database().ref(`parties/${code}`);
		partyMembersRef = partyRef.child("members");
		chatMessagesRef = partyRef.child("chat");
	}

	function createParty() {
		const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		let code = "";
		
		// Generate code
		for (let i = 0; i < 6; i++) {
			code += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		
		partyCode = code;
		setPartyReferences(partyCode);

		if (debugMode)
			console.log("Created party with code: " + partyCode);

		// Populate party
		party.host = playerId;

		partyRef.set({
			code: partyCode,
			isPublic: true,
			members: players,
			host: playerId,
		});

		clearChat();
		initParty();
		partyRef.onDisconnect().remove();
	}

	function joinParty(code) {
		firebase.database().ref(`parties/${code}/code`).once("value", snapshot => {
			if (snapshot.exists()) {
				const code = snapshot.val();
				const player = players[playerId];

				if (debugMode)
					console.log("Joined party with code: " + code);

				if (partyMembersRef) {
					// Leave old party
					lastLeftParty = partyCode;
					partyMembersRef.child(playerId).remove();

					if (party.host == playerId)
						partyMembersRef.parent.remove(); // TO DO: This deletes the party, which should be changed to only happen when the party is empty and otherwise assign a new host
				}

				// Update party variables
				partyCode = code;
				party.host = null;
				setPartyReferences(partyCode);

				// Join new party
				partyMembersRef.child(playerId).set(player);
				partyMembersRef.child(playerId).onDisconnect().remove();

				// Show new party
				initParty();

				// Update chat
				clearChat();
				showChatMessage(player.name, player.color, "has joined the party.", false);
			} else {
				createParty();
			}
		});
	}
	
	function createUser() {
		const animal = randomFromArray(ANIMALS);
		const name = createName(animal);
		const color = randomFromArray(COLORS);

		playerNameInput.value = name;

		players[playerId] = {
			id: playerId,
			name: name,
			animal: animal,
			color: color,
			score: 0,
		}

		initUser();
	}

	function initUser() {
		if (partyRef) {
			playerRef = partyMembersRef.child(playerId);
			playerRef.onDisconnect().remove();

			loadPlayerData();
			initInterface();
		} else {
			setTimeout(initUser, 50);
		}
	}

	function updatePartyName() {
		if (!party.host)
			return;

		const hostId = party.host;
		const hostRef = partyMembersRef.child(hostId);

		hostRef.on("value", (snapshot) => {
			const host = snapshot.val();

			if (host != null) {
				partyName.innerText = host.id != playerId ? convertToPossessive(host.name) + " party" : "Your party";
			}
		});
	}


	function initParty() {
		playerRef = partyMembersRef.child(playerId);

		partyRef.on("value", (snapshot) => {
			const newParty = snapshot.val();
			if (newParty != null) {
				party = newParty;
				updatePartyName();
			}
		});

		// Fires when a game starts
		partyRef.on("child_added", (snapshot) => {
			if (snapshot.key == "gameData") {
				const startingGame = snapshot.val();

				const game = gameData[startingGame.name];

				gameStartScreen.querySelector("#game-title").textContent = game.displayTitle;
				gameStartScreen.querySelector("#game-icon").src = `media/games/${startingGame.name}/${game.icon}`;

				const timer = gameStartScreen.querySelector("#game-start-timer");

				const start = new Date(Date.parse(startingGame.start));
				let time = start.getTime() - new Date().getTime();

				timer.textContent = `Starting in ${Math.round(time / 1000) + 1}...`;

				const timerInterval = setInterval(() => {
					time = start.getTime() - new Date().getTime();

					if (time <= 0) {
						gameStartScreen.classList.remove("active");
						clearInterval(timerInterval);

						startGame(startingGame.name);
					} else {
						timer.textContent = `Starting in ${Math.round(time / 1000) + 1}...`;
					}
				}, 100);

				gameStartScreen.classList.add("active");
			}
		});

		// Fires when game ends
		partyRef.on("child_removed", (snapshot) => {
			if (snapshot.key == "gameData") {
				const players = snapshot.val().players;

				let winner;

				for (const [key, value] of Object.entries(players)) {
					if (!winner || value.score > winner.score)
						winner = players[key];
				}

				const character = gameEndScreen.querySelector(".character");

				character.classList.add(winner.color.toLowerCase());
				character.classList.add(winner.animal.toLowerCase());

				gameEndScreen.querySelector("#player-name").textContent = winner.name;
				gameEndScreen.classList.add("active");

				startConfetti();

				setTimeout(() => {
					gameEndScreen.classList.remove("active");
					stopConfetti();
				}, GAME_END_DURATION * 1000);
			}
		});

		// Fires whenever the data of any player changes
		partyMembersRef.on("value", (snapshot) => {
			players = snapshot.val() || {};

			Object.keys(players).forEach((key) => {
				const playerState = players[key];
				const element = playerElements[key];

				if (element) {
					const newElement = createPlayerElement(playerState);
					element.innerHTML = newElement.innerHTML;
					element.classList = newElement.classList;

					if (key == playerId)
						characterPreview.classList = element.querySelector(".character").classList;
				}
			});
		});

		// Fires whenever a new player joins
		partyMembersRef.on("child_added", (snapshot) => {
			const newPlayer = snapshot.val();

			if (!newPlayer.id)
				return;

			if (debugMode)
				console.log("Player joined: " + newPlayer.id);

			const newPlayerElement = createPlayerElement(newPlayer);

			if (newPlayer.id == playerId)
				characterPreview.classList.add(newPlayer.color.toLowerCase(), newPlayer.animal.toLowerCase());

			playerElements[newPlayer.id] = newPlayerElement;
			playerList.appendChild(newPlayerElement);

			if (party.host != null && party.host != newPlayer.id)
				showChatMessage(newPlayer.name, newPlayer.color, "has joined the party.", false);
		});

		// Fires whenever a player leaves
		partyMembersRef.on("child_removed", (snapshot) => {
			const removedPlayer = snapshot.val();
			const removedKey = removedPlayer.id;

			if (debugMode)
				console.log("Player left: " + removedKey);

			if (removedKey == playerId && lastLeftParty != partyCode) {
				console.log("Lost connection to party with code: " + partyCode);
				lostConnectionScreen.classList.add("active");
			}

			const oldPlayerElement = playerElements[removedKey];
			if (oldPlayerElement) {
				playerList.removeChild(oldPlayerElement);
				delete playerElements[removedKey];
			}

			showChatMessage(removedPlayer.name, removedPlayer.color, "has left the party.", false);
		});

		chatMessagesRef.on("child_added", (snapshot) => {
			const newMessage = snapshot.val();
			const sender = players[newMessage.senderId];

			showChatMessage(sender.name, sender.color, newMessage.text, true);
		});
	}

	function initInterface() {
		loadingScreen.classList.remove("active");

		// Player options
		playerNameInput.addEventListener("change", (event) => {
			const newName = event.target.value || createName(players[playerId].animal);
			setPlayerName(newName);
		});

		randomizeNameButton.addEventListener("click", () => {
			const newName = createName(players[playerId].animal);
			setPlayerName(newName);
		});

		playerColorButton.addEventListener("click", () => {
			const currentColorIndex = COLORS.indexOf(players[playerId].color);
			const nextColor = COLORS[currentColorIndex + 1] || COLORS[0];

			setPlayerColor(nextColor);
		});

		playerAnimalButton.addEventListener("click", () => {
			const currentAnimal = players[playerId].animal
			const currentAnimalIndex = ANIMALS.indexOf(currentAnimal);
			const nextAnimal = ANIMALS[currentAnimalIndex + 1] || ANIMALS[0];

			// Update name
			const splitName = players[playerId].name.split(" ");
			splitName.forEach((part) => {
				if (part.toLowerCase() == currentAnimal.toLowerCase(""))
					splitName[splitName.indexOf(part)] = nextAnimal;
			});

			const newName = splitName.join(" ");

			setPlayerAnimal(nextAnimal);
			setPlayerName(newName);
		});

		// Party options
		joinPartyButton.addEventListener("click", () => {
			showModal(modals.JOIN_PARTY);
		});

		leavePartyButton.addEventListener("click", () => {
			const player = players[playerId];

			const partyMemberCount = Object.keys(party.members).length;
			if (partyMemberCount < 2)
				return showModal(modals.EMPTY_PARTY);

			// Leave old party
			lastLeftParty = partyCode;
			partyMembersRef.child(playerId).remove();

			// Remove old party
			for (const playerElement of Object.values(playerElements)) {
				playerElement.remove();
			}

			// Create new party
			createParty();

			const partyMembers = {};
			partyMembers[playerId.toString()] = {
				id: player.id,
				name: player.name,
				animal: player.animal,
				color: player.color,
				score: 0,
			}

			// Populate party
			partyRef.update({
				members: partyMembers,
				host: playerId,
			});

			playerRef = firebase.database().ref(`parties/${partyCode}/members/${playerId}`);
			playerRef.onDisconnect().remove();
		});

		invitePlayersButton.addEventListener("click", () => {
			showModal(modals.INVITE_PLAYERS);
		});

		// Modal
		modal.querySelector("#close-modal").addEventListener("click", () => {
			closeModal();
		});

		document.body.addEventListener("click", (event) => {
			const target = event.target;

			const clickedInsideModal = modal.firstElementChild.contains(target);

			if (!clickedInsideModal && modal.classList.contains("active") && allowClickingModalAway) {
				closeModal();
			}
		});

		// Games
		gamesGrid.addEventListener("click", (event) => {
			const target = event.target;
			const gameElement = target.closest(".game");

			if (gameElement == null)
				return;

			const name = gameElement.getAttribute("data-game-title");
			const game = gameData[name];

			showModal(modals.GAME_INFO, {"GAME_DISPLAY_TITLE": game.displayTitle, "GAME_TITLE": name, "GAME_DESCRIPTION": game.description});
		});

		// Chat
		chatInput.addEventListener("keypress", (event) => {
			if (event.key == "Enter") {
				sendChatMessage(chatInput.value);
			}
		});

		chatSendButton.addEventListener("click", () => {
			sendChatMessage(chatInput.value);
		});

		chatToggle.addEventListener("click", () => {
			if (chat.classList.contains("active")) {
				chat.classList.remove("active");
			} else {
				chat.classList.add("active");
				chatInput.focus();
			}
		});

		// Menu buttons
		const menuId = localStorage.getItem("activeMenuId");

		if (menuId != null) {
			showMenu(menuId);
		} else {
			showMenu("home-menu");
		}

		menuButtonsParent.addEventListener("click", (event) => {
			let element = event.target;

			if (element.tagName == "I")
				element = element.parentElement;

			if (element.classList.contains("icon-button")) {
				showMenu(element.getAttribute("data-menu"));
			}
		});

		// Home
		joinPartyHomeButton.addEventListener("click", () => {
			showModal(modals.JOIN_PARTY);
		});
		createPartyHomeButton.addEventListener("click", () => {
			showMenu("party-menu");
		});
		browseGamesHomeButton.addEventListener("click", () => {
			showMenu("games-menu");
		});

		window.addEventListener("resize", () => {
			moveMenuButtonsIndicator();
		});

		// Lost connection screen
		reconnectButton.addEventListener("click", () => {
			location.reload();
		});
		
	}

	firebase.auth().onAuthStateChanged((user) => {
		if (user) {
			playerId = user.uid;

			// User logged in
			if (debugMode)
				console.log(`Logged in with user id: ${playerId}`);

			const parameters = getURLParameters();
			partyCode = parameters ? parameters["invite"] : null;

			createUser(playerId);
	
			if (partyCode) {
				joinParty(partyCode);
			} else {
				createParty();
			}
		} else {
			// User logged out
			if (debugMode)
				console.log("User logged out");
		}
	});

	function logIn() {
		if (debugMode)
			console.log("Logging in...");

		firebase.auth().signInAnonymously().catch((error) => {
			console.log(error.code, error.message);
		});
	}

	logIn();

})();