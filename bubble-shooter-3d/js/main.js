import Game from './game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

document.getElementById('restartBtn').addEventListener('click', () => {
    game.restart();
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    game.pause(!game.paused);
    document.getElementById('pauseBtn').textContent = game.paused ? 'Resume' : 'Pause';
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

game.render();
