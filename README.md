![GitHub top language](https://img.shields.io/github/languages/top/Prozilla/Party-Animals?color=brightgreen) ![GitHub repo size](https://img.shields.io/github/repo-size/Prozilla/Party-Animals?color=blueviolet)

<h1><img src="https://partyanimals.netlify.app/media/icons/Logo128x128.png" width="48" height="48"> Party Animals</h1>

[Party Animals](https://partyanimals.netlify.app/) is a platform for multiplayer party games where you can invite your friends and play games quickly and easily. This was made by Prozilla by using a realtime database provided by Firebase and the game engine Phaser.

**NOTE**: This project is still in the very early stages of development which means there are still a lot of features that need to be implemented, bugs that need to be fixed and unclean code that needs to be rewritten.

## How does it work

One player creates a party of which they then become the party host. Other players can then join using a party link or code or by joining a random public party*. Players in the party must then vote for a game that they would like to play*. Some games require teams to be made at the start of the game*. The winner(s) of a game gain 1 point at the end of each game and the player with the most score becomes the party king*.

\* - These features are planned or being worked on and haven't been released yet.

Screenshot of Party Animals' home page:<br>
<img src="https://user-images.githubusercontent.com/63581117/181969750-d759ec2c-0d26-4f68-a532-13f02c331b5a.png" width="400">

## Features (note: most features are not implemented yet)
- A party: a group of players that play games together, can either be private or public.
- Party host: leader of the party, is required to run a party and play games, when they leave a new player will become the party host and if the party is currently playing a game said game will end. The party host can kick and promote players.
- Party king: best performing player of the party.
- Teams: some games require teams, teams are made when a game that requires teams starts and end as soon as the game ends. Every player in the winning team gains a point at the end of a game.
- Chat: players can chat with each other via the chat system.
- Player settings: a player can choose their animal, color and name. Names can either be auto-generated (adjective + player's animal) or custom.
- Party guide: a list of tutorials to explain how Party Animals functions.

## To do
- [ ] Random player picker
- [ ] Synchronisation (wait for all players before starting game
- [ ] Countdown before starting game
- [ ] Party king (player with most points)
- [ ] Invite links
- [x] Start screen
- [ ] Spectator mode
- [ ] Chat filter (remove all links except party animals links)
- [ ] Loading screen
- [x] Tabs (buttons on the left side of the screen, bottom on mobile) to switch between menus like games, party, player customisation, help and start menu
- [ ] Force all game canvases to be the same size and prevent browser zoom
