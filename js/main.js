const gameNames = ["slime"];
const games = {};

for (let i = 0; i < gameNames.length; i++) {
	const gameName = gameNames[i];

	import(`./games/${gameName}.js`).then(game => {
		games[gameName] = game;
	});
}

let debugMode = true; // Set to true for debugging
const localHosting = window.location.pathname.startsWith("/party-animals/");

if (!localHosting) {
	debugMode = false;
} else if (debugMode) {
	console.log("Debug mode enabled");
}

const minPlayers = 2;

const animals = [
	"Pig",
	"Cat",
	"Dog",
	"Bear",
	"Spider",
	// "Fish",
	// "Lion",
	// "Wolf",
	// "Chicken",
	// "Horse",
	"Sheep",
];

const colors = [
	"Red",
	"Orange",
	"Yellow",
	"Green",
	"Blue",
	"Purple",
	"Pink"
];

class Modal {
	constructor(title, body) {
		this.title = title;
		this.body = body;
	}
}

const modals = {
	"JOIN_PARTY": new Modal("Join a party", `
		<span id="party-code-input">
			<label for="party-code">Enter a party code</label>
			<input id="party-code" maxlength="6" type="text">
		</span>`),
	"INVITE_PLAYERS": new Modal("Invite players", `
		<p><strong id="party-code">[PARTY_CODE]</strong></p>
		<div id="invite-buttons">
			<button class="text-button" id="copy-invite-code">Copy invite code</button>
			<button class="text-button" id="copy-invite-link">Copy invite link</button>
		</div>`),
	"EMPTY_PARTY": new Modal("You can't leave yourself", `<p>You are already in an empty party!</p>`),
	"NEED_MORE_PLAYERS": new Modal("You need more players", `<p>You can't launch a game by yourself. Invite more players to start playing.</p>`),
	"NOT_HOST": new Modal("You are not the party host", `<p>Only the party host can launch a game.</p>`),
};

function randomFromArray(array) {
	return array[Math.floor(Math.random() * array.length)];
}

function createName(animal) {
	const prefix = randomFromArray([
		"Cool",
		"Super",
		"Ultra",
		"Smart",
		"Big",
		"Radioactive",
		"Smug",
		"Eternal",
		"Floaty",
		"Silky",
		"Rich",
		"Dark",
		"Long",
		"Soft",
		"Buff",
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

	// Player options
	const playerNameInput = document.querySelector("#player-name");
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

	function moveMenuButtonsIndicator() {
		const menuButton = menuButtonsParent.querySelector(`button[data-menu="${activeMenuId}"]`);
		moveElementToElement(menuButtonsIndicator, menuButton);
	}

	function showMenu(id) {
		activeMenuId = id;
		localStorage.setItem("activeMenuId", id);

		// Hide title when home menu is activated
		toggleClass(title, id == "home-menu", "hidden");

		// Show the right menu and hide the others
		for(let i = 0; i < menusParent.children.length; i++){
            const menu = menusParent.children[i];
			toggleClass(menu, menu.id == id, "active");
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

	function setPlayerName(name) {
		playerNameInput.value = name;

		playerRef.update({name});

		if (party.host == playerId)
			partyName.innerText = convertToPossessive(players[playerId].name) + " party";

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
		games[name].start(players, playerId, party.host, partyCode, debugMode);
	}

	function getPartyInviteLink() {
		return `${window.location.href}?invite=${partyCode}`;
	}

	function setClipboard(text) {
		navigator.clipboard.writeText(text);
	}

	function handleModalClick(event) {
		const element = event.target;

		switch (element.id) {
			case "party-code":
			case "copy-invite-code":
				setClipboard(partyCode);
				break;
			case "copy-invite-link":
				setClipboard(getPartyInviteLink());
				break;
		}
	}

	function showModal(modalContent) {
		const html = modalContent.body.replace("[PARTY_CODE]", partyCode).replace("[PARTY_LINK]", getPartyInviteLink());

		let modalKey;
		for (const [key, value] of Object.entries(modals)) {
			if (value == modalContent) {
				modalKey = key
			}
		}

		modal.setAttribute("data-modal-key", modalKey);

		if (debugMode)
			console.log(`Showing "${modalKey}" modal`);

		modalTitle.textContent = modalContent.title;
		modalBody.innerHTML = html;

		if (modalKey == "JOIN_PARTY") {
			const partyCodeInput = modal.querySelector("#party-code");

			// Remove spaces from party code input field
			partyCodeInput.addEventListener("input", () => {
				partyCodeInput.value = partyCodeInput.value.split(" ").join("");
			});

			function processPartyCodeKeyPress(event) {
				// TO DO: Should show modal to user when they try to join their own party
				if (event.key == "Enter" && partyCodeInput.value.length == 6 && partyCodeInput.value.toUpperCase() != partyCode) {
					firebase.database().ref(`parties/${partyCode}/code`).once("value", snapshot => {
						if (snapshot.exists()) {
							closeModal();
							partyCodeInput.removeEventListener("keypress", processPartyCodeKeyPress);

							const code = partyCodeInput.value.toUpperCase();
							joinParty(code);
						}
					});
				}
			}

			// Listen for enter key press
			partyCodeInput.addEventListener("keypress", processPartyCodeKeyPress);
		} else if (modalKey == "INVITE_PLAYERS") {
			modalBody.addEventListener("click", handleModalClick);
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
		firebase.database().ref(`parties/${partyCode}/code`).once("value", snapshot => {
			if (snapshot.exists()) {
				const code = snapshot.val();
				const player = players[playerId];

				if (debugMode)
					console.log("Joined party with code: " + code);

				if (partyMembersRef) {
					// Leave old party
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
		const animal = randomFromArray(animals);
		const name = createName(animal);
		const color = randomFromArray(colors);

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
		const hostId = party.host;
		const hostRef = partyMembersRef.child(hostId);

		hostRef.on("value", (snapshot) => {
			const host = snapshot.val();
			if (host != null)
				partyName.innerText = convertToPossessive(host.name) + " party";
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

		partyRef.on("child_added", (snapshot) => {
			if (snapshot.key == "gameData" && party.host != playerId) {
				launchGame(snapshot.val().name);
			}
		});

		// Fires whenever the data of any player changes
		partyMembersRef.on("value", (snapshot) => {
			players = snapshot.val() || {};

			Object.keys(players).forEach((key) => {
				const playerState = players[key];
				const element = playerElements[key];

				if (element) {
					element.querySelector(".name").innerText = playerState.name;
					element.querySelector(".score").innerText = `Score: ${playerState.score}`;

					const character = element.querySelector(".character");

					// Update color
					if (!character.classList.contains(playerState.color.toLowerCase())) {
						// Remove previous color
						colors.forEach(color => {
							color = color.toLowerCase();
							if (character.classList.contains(color)) {
								character.classList.remove(color);

								if (playerState.id == playerId)
									characterPreview.classList.remove(color);
							}
						});

						// Add new color
						character.classList.add(playerState.color.toLowerCase());
						if (playerState.id == playerId)
							characterPreview.classList.add(playerState.color.toLowerCase());
					}

					// Update animal
					if (!character.classList.contains(playerState.animal.toLowerCase())) {
						// Remove previous animal
						animals.forEach(animal => {
							animal = animal.toLowerCase();
							if (character.classList.contains(animal)) {
								character.classList.remove(animal);

								if (playerState.id == playerId)
									characterPreview.classList.remove(animal);
							}
						});

						// Add new animal
						character.classList.add(playerState.animal.toLowerCase());
						if (playerState.id == playerId)
							characterPreview.classList.add(playerState.animal.toLowerCase());
					}
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

			const newPlayerElement = document.createElement("div");
			newPlayerElement.classList.add("player");
			newPlayerElement.innerHTML = `
				<div class="character ${newPlayer.color.toLowerCase()} ${newPlayer.animal.toLowerCase()}"><div class="character-detail"></div></div>
				<span>
					<p class="name">${newPlayer.name}</p>
					<p class="score">Score: ${newPlayer.score}</p>
				</span>`;

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

			playerList.removeChild(playerElements[removedKey]);
			delete playerElements[removedKey];

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

		playerColorButton.addEventListener("click", () => {
			const currentColorIndex = colors.indexOf(players[playerId].color);
			const nextColor = colors[currentColorIndex + 1] || colors[0];

			setPlayerColor(nextColor);
		});

		playerAnimalButton.addEventListener("click", () => {
			const currentAnimal = players[playerId].animal
			const currentAnimalIndex = animals.indexOf(currentAnimal);
			const nextAnimal = animals[currentAnimalIndex + 1] || animals[0];

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
			if (!modal.firstElementChild.contains(target) && modal.classList.contains("active") && allowClickingModalAway) {
				closeModal();
				console.log(target);
			}
		})

		// Games
		gamesGrid.firstElementChild.addEventListener("click", () => {
			if (party.host == playerId) {
				if (Object.keys(players).length >= minPlayers || debugMode) {
					launchGame("slime");
				} else {
					showModal(modals.NEED_MORE_PLAYERS);
				}
			} else {
				showModal(modals.NOT_HOST);
			}
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
			}
		});

		// Menu buttons
		const menuId = localStorage.getItem("activeMenuId");

		if (menuId != null) {
			showMenu(menuId);
		} else {
			showMenu("home-menu");
		}

		// Menu buttons indicator should move on window resize and when menu is changed via other means (home buttons)

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
		}
	});

	// Login event
	firebase.auth().signInAnonymously().catch((error) => {
		console.log(error.code, error.message);
	});

})();