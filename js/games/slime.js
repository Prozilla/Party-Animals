import { GameScene, gameConfig } from "./game.js";
import { Util, colors } from "./util.js";

export const name = "slime";

// World
const worldSize = 2000;
const backgroundColor = "#ffffff";

// Orbs
let orbs;
const orbSpawnDelay = 500;
const orbSize = 50;
const maxOrbs = 50;
let lastOrbSpawn;

const orbImage = "media/games/slime/candy";

// Player
const startingScore = 30;
const scoreIncrease = 1;
const startingSpeed = 1.5; // Unused
const speedIncrease = 0.004; // Unused
const speedMultiplier = 1 / 7;
const pickupRadius = orbSize / 2;

const util = new Util();

let scene;

function spawnOrb() {
	const position = util.randomPosition(0, 0, scene.worldSize, scene.worldSize);

	const colorNames = Object.keys(colors);
  	const color = colors[colorNames[Math.floor(colorNames.length * Math.random())]][0];
	const id = util.generateId(10);

	const orbRef = firebase.database().ref(`parties/${scene.partyCode}/gameData/orbs/${id}`);

	orbRef.set({
		id: id,
		x: position.x,
		y: position.y,
		color: color
	});
}

function collectOrb(orb) {
	firebase.database().ref(`parties/${scene.partyCode}/gameData/orbs/${orb.id}`).remove();
	scene.addScore(scoreIncrease);
}

class Slime extends GameScene {
	constructor(currentPlayers, playerId, currentHostId, currentPartyCode, debugMode) {
		super("Slime", currentPlayers, playerId, currentHostId, currentPartyCode, debugMode, worldSize, startingScore, speedMultiplier);

		orbs = {};

		if (debugMode) {
			window.addEventListener("keypress", (event) => {
				if (event.key == "e")
					this.addScore(5);
			});
		}
	}

	preload() {
		super.preload();

		this.load.svg(orbImage, `${orbImage}.svg`);
	}

	create() {
		super.create();

		this.orbsGroup = this.add.group();

		// Draw border
		const graphics = this.add.graphics();

		const color = Phaser.Display.Color.GetColor(40, 40, 40);
		const thickness = 30;

		graphics.lineStyle(thickness, color, 1);
    	graphics.strokeRect(-thickness / 2, -thickness / 2, worldSize + thickness, worldSize + thickness);

		this.orbsRef = this.gameDataRef.child("orbs");

		this.orbsRef.on("value", (snapshot) => {
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
	
		this.orbsRef.on("child_added", (snapshot) => {
			const orb = snapshot.val();
			const key = snapshot.key;

			const imageId = util.generateColoredImage(this, orbImage, orb.color);

			orbs[key] = orb;
			const newOrb = orbs[key];

			newOrb.gameObject = this.add.image(orb.x, orb.y, imageId);
			newOrb.gameObject.displayWidth = orbSize;
			newOrb.gameObject.displayHeight = orbSize;
			newOrb.gameObject.rotation = util.randomRange(-180, 180);

			this.orbsGroup.add(orbs[key].gameObject);
		});
	
		this.orbsRef.on("child_removed", (snapshot) => {
			const key = snapshot.key;
			orbs[key].gameObject.destroy();
			delete orbs[key];
		});

		console.log(this.orbsRef);
	}

	update(time, delta) {
		// Handle orb spawning
		if (this.hostId == this.playerData.id) {
			if (lastOrbSpawn == null) {
				lastOrbSpawn = time;
			}

			if (time - lastOrbSpawn > orbSpawnDelay) {
				lastOrbSpawn = time;

				if (Object.keys(orbs).length < maxOrbs)
					spawnOrb();
			}
		}

		super.update(time, delta);

		// Collect orbs
		if (!this.playerData.isDead) {
			Object.keys(orbs).forEach((key) => {
				if (key != null) {
					const orb = orbs[key];
					const distance = util.calculateDistance(this.playerData, orb) - pickupRadius;

					if (distance < this.playerData.score * 1.5) {
						if (distance < this.playerData.score - orbSize / 2) {
							collectOrb(orb);
						} else {
							// Pull orb towards player
							const pullForce = Math.pow(1 - distance / 10000, 3);
							const speed = pullForce < 0 ? 0 : pullForce;

							const offsetX = this.playerData.x - orb.x;
							const offsetY = this.playerData.y - orb.y;

							const x = orb.x + offsetX / 1000 * speed;
							const y = orb.y + offsetY / 1000 * speed;

							const orbRef = firebase.database().ref(`parties/${this.partyCode}/gameData/orbs/${orb.id}`);

							orbRef.update({
								x: x,
								y: y,
							});
						}
					}
				}
			});

			// Kill players
			Object.keys(this.players).forEach((key) => {
				if (key != this.playerData.id) {
					const player = this.players[key];

					if (this.playerData.score > player.score && !player.isDead) {
						const distance = util.calculateDistance(this.playerData, player);

						// Check if players intersect
						if (distance < this.playerData.score - player.score) {
							this.killPlayer(player);
							this.addScore(player.score / 2);
						}
					}
				}
			});
		}
	}

	endGame(winner) {
		if (this.allowEndGame) {
			this.orbsRef.off("child_added");
			this.orbsRef.off("child_removed");

			super.endGame(winner);
		}
	}
}

export function start(currentPlayers, playerId, currentHostId, currentPartyCode, debugMode) {
	scene = new Slime(currentPlayers, playerId, currentHostId, currentPartyCode, debugMode);

	const config = gameConfig;
	config.backgroundColor = backgroundColor;
	config.scene = scene;

	new Phaser.Game(config);
}