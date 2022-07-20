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
	let playerElements = {};
	const playerList = document.querySelector("#player-list #players");

	function initParty() {
		const playersRef = firebase.database().ref("players");

		// Fires whenever the data of any player changes
		playersRef.on("value", (snapshot) => {
			const players = snapshot.val() || {};
			Object.keys(players).forEach((key) => {
				const playerState = players[key];
				const element = playerElements[key];

				element.querySelector(".name").innerText = playerState.name;
				element.querySelector(".score").innerText = `Score: ${playerState.score}`;

				// Update color
				if (!element.classList.contains(playerState.color)) {
					element.classList.remove(colors);
					element.classList.add(playerState.color.toLowerCase());
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