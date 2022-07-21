const animals = [
	"Pig",
	"Cat",
	"Dog",
	"Bear",
	"Fish",
	"Lion",
	"Wolf",
	"Chicken",
	"Horse"
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

(function init() {

	// Player
	let playerId;
	let playerRef;

	// Party
	let players = {};
	let playerElements = {};
	const playerList = document.querySelector("#player-list #players");

	// Player options
	const playerNameInput = document.querySelector("#player-name");
	const playerAnimalButton = document.querySelector("#player-animal");
	const playerColorButton = document.querySelector("#player-color");

	function initParty() {
		const playersRef = firebase.database().ref("players");

		// Fires whenever the data of any player changes
		playersRef.on("value", (snapshot) => {
			players = snapshot.val() || {};
			Object.keys(players).forEach((key) => {
				const playerState = players[key];
				const element = playerElements[key];

				element.querySelector(".name").innerText = playerState.name;
				element.querySelector(".score").innerText = `Score: ${playerState.score}`;

				const character = element.querySelector(".character");

				// Update color
				if (!character.classList.contains(playerState.color)) {
					// Remove previous color
					colors.forEach(color => {
						color = color.toLowerCase();
						if (character.classList.contains(color))
							character.classList.remove(color);
					});

					// Add new color
					character.classList.add(playerState.color.toLowerCase());
				}
			});
		});

		// Fires whenever a new player joins
		playersRef.on("child_added", (snapshot) => {
			const newPlayer = snapshot.val();
			console.log(newPlayer);
			const newPlayerElement = document.createElement("div");
			newPlayerElement.classList.add("player");
			newPlayerElement.innerHTML = `
				<div class="character ${newPlayer.color.toLowerCase()}"></div>
				<span>
					<p class="name">${newPlayer.name}</p>
					<p class="score">Score: ${newPlayer.score}</p>
				</span>`;

			playerElements[newPlayer.id] = newPlayerElement;
			playerList.appendChild(newPlayerElement);
		});

		// Fires whenever a player leaves
		playersRef.on("child_removed", (snapshot) => {
			const removedKey = snapshot.val().id;
			playerList.removeChild(playerElements[removedKey]);
			delete playerElements[removedKey];
		});

		playerNameInput.addEventListener("change", (event) => {
			const newName = event.target.value || createName(players[playerId].animal);
			playerNameInput.value = newName;

			playerRef.update({
				name: newName
			});
		});

		playerColorButton.addEventListener("click", () => {
			const currentColorIndex = colors.indexOf(players[playerId].color);
			const nextColor = colors[currentColorIndex + 1] || colors[0];

			playerRef.update({
				color: nextColor
			});
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

			playerRef.update({
				animal: nextAnimal,
				name: newName
			});

			playerNameInput.value = newName;
		});
	}

	firebase.auth().onAuthStateChanged((user) => {
		console.log(user);

		if (user) {
			// User logged in
			playerId = user.uid;
			playerRef = firebase.database().ref(`players/${playerId}`);

			const animal = randomFromArray(animals);
			const name = createName(animal);
			const color = randomFromArray(colors);

			playerNameInput.value = name;

			playerRef.set({
				id: playerId,
				name: name,
				animal: animal,
				color: color,
				score: 0,
			});

			playerRef.onDisconnect().remove();

			initParty();
		} else {
			// User logged out
		}
	});

	// Login event
	firebase.auth().signInAnonymously().catch((error) => {
		console.log(error.code, error.message);
	});

})();