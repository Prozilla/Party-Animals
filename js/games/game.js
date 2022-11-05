import WebFontFile from "../webFontFile.js";
import { Util, colors } from "./util.js";

export const gameConfig = {
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
}

// TO DO: create player class for all players
// export class Player {
	
// }

export class GameScene extends Phaser.Scene {
	constructor(title, currentPlayers, playerId, currentHostId, currentPartyCode, debugMode, worldSize, startingScore) {
		super();

		console.log("Launching game: " + title);

		this.title = title;
		this.worldSize = worldSize;
		this.startingScore = startingScore;
		this.allowEndGame = !debugMode;

		this.speedMultiplier = 1;
		this.constantSpeed = false;

		this.frame = 0;
		this.time = 0;

		this.members = JSON.parse(JSON.stringify(currentPlayers));
		this.players = currentPlayers;
		this.playerGameObjects = {};

		this.playerData = this.players[playerId];
		this.hostId = currentHostId;
		this.partyCode = currentPartyCode;

		
		window.addEventListener("mousemove", (event) => {this.updateMouse(event)});
		window.addEventListener("touchmove", (event) => {this.updateMouse(event)});

		if (debugMode) {
			window.addEventListener("keypress", (event) => {
				switch (event.key) {
					case "e":
						this.addScore(5);
						break;
					case "w":
						this.endGame(this.playerData, true);
						break;
				}
			});
		}
	}

	preload() {
		this.load.addFile(new WebFontFile(this.load, "Fredoka"));

		Object.keys(this.players).forEach((key) => {
			const player = this.players[key];
			this.load.svg(player.id, `media/characters/${player.animal.toLowerCase()}.svg`);
		});
	}

	create() {
		// Draw border
		const graphics = this.add.graphics();

		const color = Phaser.Display.Color.GetColor(40, 40, 40);
		const thickness = 30;

		graphics.lineStyle(thickness, color, 1);
    	graphics.strokeRect(-thickness / 2, -thickness / 2, this.worldSize + thickness, this.worldSize + thickness);

		// Set up data
		this.gameDataRef = firebase.database().ref(`parties/${this.partyCode}/gameData`);
		this.playersRef = this.gameDataRef.child("players");
	
		if (this.hostId == this.playerData.id) {
			for (const key of Object.keys(this.players)) {
				const position = util.randomPosition(0, 0, this.worldSize, this.worldSize);
				const player = this.players[key];
	
				player.x = position.x;
				player.y = position.y;
				player.score = this.startingScore;
				player.isDead = false;
			}
	
			this.gameDataRef.set({
				players: this.players,
			});
		}
	
		this.playersRef.on("value", (snapshot) => {
			if (snapshot.val() == null)
				return;

			this.players = snapshot.val();
			this.playerData = this.players[this.playerData.id];

			let totalPlayers = 0;
			let alivePlayers = 0;
			let lastAlivePlayer;
	
			Object.keys(this.players).forEach((key) => {
				const player = this.players[key];
				const gameObject = this.playerGameObjects[key];
	
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
				this.endGame(lastAlivePlayer);
			}
		});
	
		this.playerRef = this.playersRef.child(this.playerData.id);

		Object.keys(this.players).forEach((key) => {
			const player = this.players[key];

			// Add player
			const playerColor = colors[player.color][0];

			const gameObject = this.add.circle(player.x, player.y, player.score, `0x${playerColor}`);
			gameObject.setDepth(100);

			this.playerGameObjects[player.id] = gameObject;

			// Add player character
			const imageId = util.generateColoredImage(this, player.id, colors[player.color][1]);

			gameObject.character = this.add.image(player.x, player.y, imageId);
			gameObject.character.setDepth(101);
			gameObject.character.setOrigin(0.5, 0.5);

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
		this.cameras.main.startFollow(this.playerGameObjects[this.playerData.id]);
	}

	updateMouse(event) {
		this.mouseX = event.clientX;
		this.mouseY = event.clientY;
	
		// Mobile touch
		if ((this.mouseX == null || this.mouseY == null) && event.targetTouches != null) {
			this.mouseX = event.targetTouches[0].clientX;
			this.mouseY = event.targetTouches[0].clientY;
		}
	}

	update(time, delta) {
		this.frame++;
		this.time = time;

		// Move player based on mouse position
		if (this.mouseX != null && this.mouseY != null && !this.gameOver) {
			const worldMouseX = parseInt(this.mouseX + this.cameras.main.scrollX);
			const worldMouseY = parseInt(this.mouseY + this.cameras.main.scrollY);

			const distance = util.calculateDistance(this.playerData, {x: worldMouseX, y: worldMouseY});
			let factor = util.clampValue(screen.width > screen.height ? distance / (screen.height / 4) : distance / (screen.width / 4), 0, 1);

			let speed;

			if (!this.constantSpeed) {
				const a = 250;
				const b = a / 3 + 40;
				const speed =  a / (this.playerData.score - this.startingScore + b) * this.speedMultiplier * delta;
			} else {
				speed = this.speedMultiplier;
			}

			const newPosition = util.moveTowards(this.playerData.x, this.playerData.y, worldMouseX, worldMouseY, factor * speed);

			// Move player
			let x = newPosition.x;
			let y = newPosition.y;

			// Clamp position
			x = util.clampValue(x, 0 + this.playerData.score / 2, this.worldSize - this.playerData.score / 2);
			y = util.clampValue(y, 0 + this.playerData.score / 2, this.worldSize - this.playerData.score / 2);

			if (parseInt(x) && parseInt(y) && !this.gameOver)
				this.playerRef.update({x, y});
		}
	}

	endGame(winner, force) {
		if (this.allowEndGame || force) {
			this.gameOver = true;

			console.log("game over");

			// Remove event listeners
			this.playersRef.off("value");
	
			// Give a point to the winner
			const winnerRef = firebase.database().ref(`parties/${this.partyCode}/members/${winner.id}`);
			winnerRef.update({
				score: this.members[winner.id].score + 1
			});
	
			// Delete game data
			this.gameDataRef.remove();
	
			if (this.sys.game)
				this.sys.game.destroy(true);
		}
	}

	addScore(amount) {
		if (!parseInt(amount))
			return;

		this.playerRef.update({
			score: this.playerData.score + amount
		});
	}
	
	killPlayer(player) {
		const playerRef = firebase.database().ref(`parties/${this.partyCode}/gameData/players/${player.id}`);
		playerRef.update({
			isDead: true
		});
	}	

}

const util = new Util();