const gameNames = ["slime"];
const games = {};

for (let i = 0; i < gameNames.length; i++) {
	const gameName = gameNames[i];

	import(`./games/${gameName}.js`).then(game => {
		games[gameName] = game;
	});
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
]

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

(function init() {

	// Player
	let playerId;
	let playerRef;

	// Party
	let party;
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
	let allowClickingModalAway = true;

	// Games
	const gamesGrid = document.querySelector("#games-grid");

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
		games[name].start(players, playerId, party.host, partyCode);
	}

	function showModal(title, body) {
		console.log(`Showing "${title}" modal`);
		modal.querySelector("#modal-title").childNodes[0].textContent = title;
		modal.querySelector("#modal-body").innerHTML = body;
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
	}

	function createParty() {
		const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		let code = "";
		
		// Generate code
		for (let i = 0; i < 6; i++) {
			code += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		
		partyCode = code;
		partyRef = firebase.database().ref(`parties/${partyCode}`);
		console.log("Party code: " + partyCode);

		partyRef.set({
			code: partyCode,
			isPublic: true,
		});

		partyMembersRef = firebase.database().ref(`parties/${partyCode}/members`);
		initParty();
	
		partyRef.onDisconnect().remove();
	}
	
	function createUser(id) {
		playerId = id;

		createParty();

		const animal = randomFromArray(animals);
		const name = createName(animal);
		const color = randomFromArray(colors);

		playerNameInput.value = name;

		const partyMembers = {};
		partyMembers[playerId.toString()] = {
			id: playerId,
			name: name,
			animal: animal,
			color: color,
			score: 0,
		}

		// Populate party
		const partyHost = playerId;

		partyRef.update({
			members: partyMembers,
			host: partyHost,
		});

		playerRef = firebase.database().ref(`parties/${partyCode}/members/${playerId}`);
		playerRef.onDisconnect().remove();

		loadPlayerData();
		initInterface();
	}

	function updatePartyName() {
		const hostId = party.host;
		const hostRef = firebase.database().ref(`parties/${partyCode}/members/${hostId}`);

		hostRef.on("value", (snapshot) => {
			const host = snapshot.val();
			if (host != null)
				partyName.innerText = convertToPossessive(host.name) + " party";
		});
	}


	function initParty() {
		partyRef = firebase.database().ref(`parties/${partyCode}`);
		playerRef = partyRef.child("members").child(playerId);

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
			});
		});

		// Fires whenever a new player joins
		partyMembersRef.on("child_added", (snapshot) => {
			const newPlayer = snapshot.val();

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
		});

		// Fires whenever a player leaves
		partyMembersRef.on("child_removed", (snapshot) => {
			const removedKey = snapshot.val().id;
			playerList.removeChild(playerElements[removedKey]);
			delete playerElements[removedKey];
		});
	}

	function initInterface(params) {
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

			console.log(nextAnimal);

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

		joinPartyButton.addEventListener("click", () => {
			const html = `
				<span id=\"party-code-input\">
					<label for=\"party-code\">Enter a party code</label>
					<input id=\"party-code\" maxlength=\"6\" type=\"text\">
				</span>`;

			showModal("Join a party", html);

			const partyCodeInput = modal.querySelector("#party-code");

			// Remove spaces from party code input field
			partyCodeInput.addEventListener("input", () => {
				partyCodeInput.value = partyCodeInput.value.split(" ").join("");
			});

			// Listen for enter key press
			partyCodeInput.addEventListener("keypress", (event) => {
				// TO DO: Should show modal to user when they try to join their own party
				if (event.key == "Enter" && partyCodeInput.value.length == 6 && partyCodeInput.value.toUpperCase() != partyCode) {
					closeModal();

					partyCodeInput.removeEventListener("keypress", this);

					const code = partyCodeInput.value.toUpperCase();
					const newPartyMembersRef = firebase.database().ref(`parties/${code}/members`);
					const player = players[playerId];
		
					// Leave old party
					partyMembersRef.child(playerId).remove();
					partyMembersRef.parent.remove(); // TO DO: This deletes the party, which should be changed to only happen when the party is empty and otherwise assign a new host
		
					// Update party variables
					partyCode = code;
					partyMembersRef = newPartyMembersRef;
		
					// Join new party
					partyMembersRef.child(playerId).set(player);
					partyMembersRef.child(playerId).onDisconnect().remove();
		
					// Show new party
					initParty();
				}
			});
		});

		leavePartyButton.addEventListener("click", () => {
			const player = players[playerId];

			const partyMemberCount = Object.keys(party.members).length;
			if (partyMemberCount < 2)
				return showModal("You can't leave yourself", "<p>You are already in an empty party!</p>");

			// Remove old party
			for (const playerElement of Object.values(playerElements)) {
				playerElement.remove();
			}

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
			partyHost = playerId;
			partyRef.update({
				members: partyMembers,
				host: partyHost,
			});

			playerRef = firebase.database().ref(`parties/${partyCode}/members/${playerId}`);
			playerRef.onDisconnect().remove();
		});

		invitePlayersButton.addEventListener("click", () => {
			const html = `<p>Your party code: <strong>${partyCode}</strong></p>`;
			showModal("Invite players", html);
		});

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

		gamesGrid.firstElementChild.addEventListener("click", () => {
			if (party.host == playerId) {
				if (Object.keys(players).length >= minPlayers) {
					launchGame("slime");
				} else {
					showModal("You need more players", "<p>You can't launch a game by yourself. Invite more players to start playing.</p>");
				}
			} else {
				showModal("You are not the party host", "<p>Only the party host can launch a game.</p>");
			}
		});
	}

	firebase.auth().onAuthStateChanged((user) => {
		if (user) {
			// User logged in
			createUser(user.uid);
		} else {
			// User logged out
		}
	});

	// Login event
	firebase.auth().signInAnonymously().catch((error) => {
		console.log(error.code, error.message);
	});

})();