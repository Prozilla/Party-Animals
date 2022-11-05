import { GameScene, gameConfig } from "./game.js";
import { Util, colors } from "./util.js";

export const name = "slime";

// World
const worldSize = 2000;
const backgroundColor = "#ffffff";

// Players
const startingScore = 30;
const speed = 2.5;

const trailSegmentsCount = 20;
const trailSegmentSize = 25;
const trailLength = 250;
let trailSegments = [];

let perviousPlayerPositions = [];

const util = new Util();

let scene;

class BodySegment {
	constructor(x, y, scene) {
		this.x = x;
		this.y = y;

		this.gameObject = scene.add.circle(this.x, this.y, trailSegmentSize, `0x${colors[scene.playerData.color][0]}`);
	}

	update(x, y) {
		this.x = x;
		this.y = y;

		this.gameObject.x = this.x;
		this.gameObject.y = this.y;
	}
}

class Tron extends GameScene {
	constructor(currentPlayers, playerId, currentHostId, currentPartyCode, debugMode) {
		super("Tron", currentPlayers, playerId, currentHostId, currentPartyCode, debugMode, worldSize, startingScore);

		this.speedMultiplier = speed;
		this.constantSpeed = true;
	}

	create() {
		super.create();

		for (let i = 0; i < trailSegmentsCount; i++) {
			const bodySegment = new BodySegment(this.playerData.x, this.playerData.y, this);
			trailSegments.push(bodySegment);
		}
	}

	update(time, delta) {
		super.update(time, delta);

		perviousPlayerPositions.push({x: this.playerData.x, y: this.playerData.y});

		if (perviousPlayerPositions.length > trailLength)
			perviousPlayerPositions = perviousPlayerPositions.slice(perviousPlayerPositions.length - trailLength, trailLength + 1);

		if (perviousPlayerPositions.length > trailSegmentsCount)
			for (let i = 0; i < trailSegments.length; i++) {
				const bodySegment = trailSegments[i];

				const index = Math.round((perviousPlayerPositions.length / trailSegmentsCount) * i);

				const newPosition = perviousPlayerPositions[index];
				bodySegment.update(newPosition.x, newPosition.y);
			}
	}

}

export function start(currentPlayers, playerId, currentHostId, currentPartyCode, debugMode) {
	scene = new Tron(currentPlayers, playerId, currentHostId, currentPartyCode, debugMode);

	const config = gameConfig;
	config.backgroundColor = backgroundColor;
	config.scene = scene;

	new Phaser.Game(config);
}