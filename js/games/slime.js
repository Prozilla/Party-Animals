import WebFontFile from "../webFontFile.js";

export const name = "slime";

const worldSize = 2000;

const colors = {
	"Red": ["e74c3c", "c0392b"],
	"Orange": ["e67e22", "d35400"],
	"Yellow": ["f1c40f", "f39c12"],
	"Green": ["2ecc71", "27ae60"],
	"Blue": ["3498db", "2980b9"],
	"Purple": ["9b59b6", "8e44ad"],
	"Pink": ["e78ae7", "b65fb6"],
}

// Debug
let allowEndGame = true;

// Orbs
let orbs;
const orbSpawnDelay = 500;
const orbRadius = 20;
const maxOrbs = 50;
let lastOrbSpawn;

// Players
let players;
let playerRef;
let playerData;
let playerGameObjects;

const startingScore = 30;
const scoreIncrease = 1;
const startingSpeed = 1.5;
const speedIncrease = 0.004;

// Party
let members;
let hostId;
let partyCode;

// Input
let mouseX, mouseY;
const screenMargin = 50;

function clampValue(value, min, max) {
	return value < min ? min : value > max ? max : value;
}

function randomRange(min, max) {
	min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPosition() {
	return {
		x: randomRange(0, worldSize),
		y: randomRange(0, worldSize)
	}
}

function calculateDistance(position1, position2) {
	const horizontalDistance = position1.x - position2.x;
	const verticalDistance = position1.y - position2.y;

	return Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
}

function moveTowards(x, y, targetX, targetY, factor) {
	const vector = {x: targetX - x, y: targetY - y};

	const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
	const direction = {x: vector.x / magnitude, y: vector.y / magnitude};

	return {x: x + direction.x * factor, y: y + direction.y * factor};
}

function generateId(size) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersCount = characters.length;

	for ( var i = 0; i < size; i++ ) {
		result += characters.charAt(Math.floor(Math.random() * charactersCount));
	}

   return result;
}

function endGame(scene, winner, gameDataRef, playersRef, orbsRef) {
	if (allowEndGame) {
		// Remove event listeners
		playersRef.off("value");
		orbsRef.off("child_added");
		orbsRef.off("child_removed");

		// Give a point to the winner
		const winnerRef = firebase.database().ref(`parties/${partyCode}/members/${winner.id}`);
		winnerRef.update({
			score: members[winner.id].score + 1
		});

		// Delete game data
		gameDataRef.remove();

		scene.sys.game.destroy(true);
	}
}

function initGame(scene) {
	const gameDataRef = firebase.database().ref(`parties/${partyCode}/gameData`);
	const orbsRef = gameDataRef.child("orbs");
	const playersRef = gameDataRef.child("players");

	if (hostId == playerData.id) {
		for (const key of Object.keys(players)) {
			const position = randomPosition();
			const player = players[key];

			player.x = position.x;
			player.y = position.y;
			player.score = startingScore;
			player.isDead = false;
		}

		gameDataRef.set({
			name: name,
			players: players,
		});

		gameDataRef.onDisconnect().remove();
	}

	playersRef.on("value", (snapshot) => {
		players = snapshot.val();
		playerData = players[playerData.id];

		let totalPlayers = 0;
		let alivePlayers = 0;
		let lastAlivePlayer;

		Object.keys(players).forEach((key) => {
			const player = players[key];
			const gameObject = playerGameObjects[key];

			if (gameObject != null) {
				// Update position
				gameObject.x = player.x;
				gameObject.y = player.y;
				gameObject.character.x = player.x;
				gameObject.character.y = player.y;

				// Update score
				gameObject.score = player.score;
				gameObject.radius = player.score;
				gameObject.character.displayWidth = player.score * 4;
				gameObject.character.displayHeight = player.score * 4;

				// Set depth based on score
				gameObject.setDepth(player.score + 100);
				gameObject.character.setDepth(player.score + 101);
				gameObject.nametag.setDepth(player.score + 102);

				// Update nametag position
				gameObject.nametag.x = player.x;
				gameObject.nametag.y = player.y - player.score - 20;

				totalPlayers++;

				// Hide dead players
				if (player.isDead) {
					gameObject.visible = false;
					gameObject.character.visible = false;
					gameObject.nametag.visible = false;
				} else {
					alivePlayers++;
					lastAlivePlayer = player;
				}
			}
		});

		if (alivePlayers < 2 && totalPlayers > 0) {
			endGame(scene, lastAlivePlayer, gameDataRef, playersRef, orbsRef);
		}
	});

	playerRef = playersRef.child(playerData.id);

	orbsRef.on("value", (snapshot) => {
		const updatedOrbs = snapshot.val();

		if (updatedOrbs != null)
			Object.keys(updatedOrbs).forEach((key) => {
				const updatedOrb = updatedOrbs[key];
				const orb = orbs[key];

				if (orb != null) {
					orb.x = updatedOrb.x;
					orb.y = updatedOrb.y;

					orb.gameObject.x = orb.x;
					orb.gameObject.y = orb.y;
				}
			});
	});

	orbsRef.on("child_added", (snapshot) => {
		const orb = snapshot.val();
		const key = snapshot.key;

		orbs[key] = orb;
		orbs[key].gameObject = scene.add.circle(orb.x, orb.y, orbRadius, `0x${orb.color}`);
		scene.orbsGroup.add(orbs[key].gameObject);
	});

	orbsRef.on("child_removed", (snapshot) => {
		const key = snapshot.key;
		orbs[key].gameObject.destroy();
		delete orbs[key];
	});
}

function spawnOrb() {
	const position = randomPosition();

	const colorNames = Object.keys(colors);
  	const color = colors[colorNames[Math.floor(colorNames.length * Math.random())]][0];
	const id = generateId(10);

	const orbsRef = firebase.database().ref(`parties/${partyCode}/gameData/orbs/${id}`);

	orbsRef.set({
		id: id,
		x: position.x,
		y: position.y,
		color: color
	});
}

function collectOrb(orb) {
	firebase.database().ref(`parties/${partyCode}/gameData/orbs/${orb.id}`).remove();
	addScore(scoreIncrease);
}

function addScore(amount) {
	playerRef.update({
		score: playerData.score + amount
	});
}

function mouseMove(event) {
	mouseX = event.clientX;
	mouseY = event.clientY;

	// Mobile touch
	if ((mouseX == null || mouseY == null) && event.targetTouches != null) {
		mouseX = event.targetTouches[0].clientX;
		mouseY = event.targetTouches[0].clientY;
	}
}

function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

function changeImageColor(context, image, color) {
	const pixels = context.getImageData(0, 0, image.width, image.height);
	color = hexToRgb(color);

    for (let i = 0; i < pixels.data.length / 4; i++)
    {
        changePixelColor(pixels.data, i * 4, color);
    }

    context.putImageData(pixels, 0, 0);
}

function changePixelColor(data, index, color)
{
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
}

const Slime = new Phaser.Class({Extends: Phaser.Scene,
	preload: function() {
		this.load.addFile(new WebFontFile(this.load, "Fredoka"));

		Object.keys(players).forEach((key) => {
			const player = players[key];
			this.load.svg(player.id, `media/characters/${player.animal.toLowerCase()}.svg`);
		});
	},

    create: function() {
		initGame(this);

		this.orbsGroup = this.add.group();

		Object.keys(players).forEach((key) => {
			const player = players[key];

			// Add player
			const playerColor = colors[player.color][0];

			const gameObject = this.add.circle(player.x, player.y, player.score, `0x${playerColor}`);
			gameObject.setDepth(100);

			playerGameObjects[player.id] = gameObject;

			// Add player character (https://phaser.io/examples/v3/view/textures/edit-texture-silhouette)
			const originalTexture = this.textures.get(player.id).getSourceImage();
			const newTexture = this.textures.createCanvas(player.id + "_new", originalTexture.width, originalTexture.height); // Using player id because texture keys must be unique

			const context = newTexture.getSourceImage().getContext("2d");
			context.drawImage(originalTexture, 0, 0);
			changeImageColor(context, originalTexture, colors[player.color][1]);

			gameObject.character = this.add.image(player.x, player.y, player.id + "_new");
			gameObject.character.setDepth(101);
			gameObject.character.setOrigin(0.5, 0.5);

			gameObject.character.image = originalTexture;
			gameObject.character.context = context;

			gameObject.character.displayWidth = player.score * 4;
			gameObject.character.displayHeight = player.score * 4;

			// Add player name
			gameObject.nametag = this.add.text(player.x, player.y, player.name, {
				fontFamily: '"Fredoka"',
				fontSize: "32px",
				fill: "#000"
			});

			gameObject.nametag.setOrigin(0.5, 1);
			gameObject.nametag.setDepth(102);
		});

		// Set up camera
		this.cameras.main.startFollow(playerGameObjects[playerData.id]);

		// Draw border
		const graphics = this.add.graphics();

		const color = Phaser.Display.Color.GetColor(40, 40, 40);
		const thickness = 30;

		graphics.lineStyle(thickness, color, 1);
    	graphics.strokeRect(-thickness / 2, -thickness / 2, worldSize + thickness, worldSize + thickness);
    },

	update: function(time, delta) {
		// Handle orb spawning
		if (hostId == playerData.id) {
			if (lastOrbSpawn == null) {
				lastOrbSpawn = time;
			}

			if (time - lastOrbSpawn > orbSpawnDelay) {
				lastOrbSpawn = time;

				if (Object.keys(orbs).length < maxOrbs)
					spawnOrb();
			}
		}

		// Move player based on mouse position
		if (mouseX != null && mouseY != null) {
			const worldMouseX = parseInt(mouseX + this.cameras.main.scrollX);
			const worldMouseY = parseInt(mouseY + this.cameras.main.scrollY);

			const distance = calculateDistance(playerData, {x: worldMouseX, y: worldMouseY});
			let factor = clampValue(screen.width > screen.height ? distance / (screen.height / 4) : distance / (screen.width / 4), 0, 1);

			const speed = (playerData.score - startingScore) * speedIncrease + startingSpeed;

			const newPosition = moveTowards(playerData.x, playerData.y, worldMouseX, worldMouseY, factor * speed);

			// Move player
			let x = newPosition.x;
			let y = newPosition.y;

			// Clamp position
			x = clampValue(x, 0 + playerData.score / 2, worldSize - playerData.score / 2);
			y = clampValue(y, 0 + playerData.score / 2, worldSize - playerData.score / 2);

			playerRef.update({
				x: x,
				y: y,
			});
		}

		// Collect orbs
		Object.keys(orbs).forEach((key) => {
			if (key != null) {
				const orb = orbs[key];
				const distance = calculateDistance(playerData, orb);

				if (distance < playerData.score * 1.5) {
					if (distance < playerData.score - orbRadius) {
						collectOrb(orb);
					} else {
						// Pull orb towards player
						const pullForce = Math.pow(1 - distance / 10000, 3);
						const speed = pullForce < 0 ? 0 : pullForce;

						const offsetX = playerData.x - orb.x;
						const offsetY = playerData.y - orb.y;

						const x = orb.x + offsetX / 1000 * speed;
						const y = orb.y + offsetY / 1000 * speed;

						const orbsRef = firebase.database().ref(`parties/${partyCode}/gameData/orbs/${orb.id}`);

						orbsRef.update({
							x: x,
							y: y,
						});
					}
				}
			}
		});

		// Kill players
		Object.keys(players).forEach((key) => {
			if (key != playerData.id) {
				const player = players[key];

				if (playerData.score > player.score) {
					const distance = calculateDistance(playerData, player);

					// Check if players intersect
					if (distance < playerData.score - player.score) {
						const playerRef = firebase.database().ref(`parties/${partyCode}/gameData/players/${player.id}`);
						playerRef.update({
							isDead: true
						});
					}
				}
			}
		});
	},

});

export function start(currentPlayers, playerId, currentHostId, currentPartyCode) {
	console.log("Starting slime");

	members = JSON.parse(JSON.stringify(currentPlayers));
	players = currentPlayers;
	playerGameObjects = {};
	orbs = {};

	console.log(members);

	playerData = players[playerId];
	hostId = currentHostId;
	partyCode = currentPartyCode;

	const config = {
		type: Phaser.CANVAS,
		scale: {
			mode: Phaser.Scale.RESIZE,
			width: screen.width,
			height: screen.height
		},
		physics: {
			default: "arcade",
			arcade: {
				gravity: { y: 300 },
				debug: false
			}
		},
		dom: {
			createContainer: true
		},
		scene: [Slime],
		backgroundColor: "#fff",
	};
	
	const game = new Phaser.Game(config);

	window.addEventListener("mousemove", mouseMove);
	window.addEventListener("touchmove", mouseMove);
}