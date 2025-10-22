class Tetris {
    constructor() {
        this.canvas = document.getElementById('tetris');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Configuration initiale
        this.initCanvasSize();
        window.addEventListener('resize', () => this.initCanvasSize());
        
        // Configuration du jeu
        this.reset();
        
        // Event listeners
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());

        // Initialisation du modal
        this.gameOverModal = new bootstrap.Modal(document.getElementById('gameOverModal'));
    }

    initCanvasSize() {
        // Calcul de la taille optimale en fonction de la fenêtre
        const maxWidth = Math.min(window.innerWidth - 40, 300);
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * 2;
        this.blockSize = maxWidth / 10;

        // Ajustement du canvas pour la prochaine pièce
        this.nextCanvas.width = Math.min(100, maxWidth / 3);
        this.nextCanvas.height = Math.min(100, maxWidth / 3);
        
        // Redessiner le jeu si en cours
        if (this.currentPiece) {
            this.draw();
        }
    }

    reset() {
        this.grid = Array(20).fill().map(() => Array(10).fill(0));
        this.score = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.gameLoop = null;
        
        // Pièces Tetris
        this.pieces = [
            [[1,1,1,1]], // I
            [[1,1],[1,1]], // O
            [[1,1,1],[0,1,0]], // T
            [[1,1,1],[1,0,0]], // L
            [[1,1,1],[0,0,1]], // J
            [[1,1,0],[0,1,1]], // S
            [[0,1,1],[1,1,0]]  // Z
        ];
        
        // Couleurs des pièces
        this.colors = [
            '#FF0D72', '#0DC2FF', '#0DFF72',
            '#F538FF', '#FF8E0D', '#FFE138',
            '#3877FF'
        ];

        this.currentPiece = null;
        this.nextPiece = this.generatePiece();
        
        this.updateScore();
        this.updateLevel();
    }

    start() {
        if (this.gameLoop) {
            return; // Le jeu est déjà en cours
        }
        
        this.reset();
        this.spawnPiece();
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
        document.getElementById('startBtn').textContent = 'Redémarrer';
    }

    generatePiece() {
        const pieceType = Math.floor(Math.random() * this.pieces.length);
        const matrix = JSON.parse(JSON.stringify(this.pieces[pieceType])); // Copie profonde
        return {
            matrix,
            pos: {x: 3, y: 0},
            color: this.colors[pieceType]
        };
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.generatePiece();
        this.drawNextPiece();
        
        if (this.collision()) {
            this.gameOver = true;
            this.showGameOver();
        }
    }

    drawNextPiece() {
        this.nextCtx.fillStyle = '#1a1a1a';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const blockSize = Math.floor(this.nextCanvas.width / 4);
        const offset = {
            x: (this.nextCanvas.width - this.nextPiece.matrix[0].length * blockSize) / 2,
            y: (this.nextCanvas.height - this.nextPiece.matrix.length * blockSize) / 2
        };

        this.nextPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(
                        offset.x + x * blockSize,
                        offset.y + y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            });
        });
    }

    collision() {
        const matrix = this.currentPiece.matrix;
        const pos = this.currentPiece.pos;
        
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] && 
                    (this.grid[y + pos.y] === undefined ||
                     this.grid[y + pos.y][x + pos.x] === undefined ||
                     this.grid[y + pos.y][x + pos.x])) {
                    return true;
                }
            }
        }
        return false;
    }

    merge() {
        this.currentPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.grid[y + this.currentPiece.pos.y][x + this.currentPiece.pos.x] = {
                        value: value,
                        color: this.currentPiece.color
                    };
                }
            });
        });
        
        this.checkLines();
    }

    rotate() {
        const matrix = this.currentPiece.matrix;
        const newMatrix = matrix[0].map((val, index) => 
            matrix.map(row => row[index]).reverse()
        );
        
        const pos = this.currentPiece.pos;
        const originalMatrix = this.currentPiece.matrix;
        this.currentPiece.matrix = newMatrix;
        
        if (this.collision()) {
            this.currentPiece.matrix = originalMatrix;
        }
    }

    checkLines() {
        let linesCleared = 0;
        
        for (let y = this.grid.length - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== 0)) {
                const row = this.grid.splice(y, 1)[0];
                this.grid.unshift(Array(10).fill(0));
                y++;
                linesCleared++;
            }
        }
        
        if (linesCleared > 0) {
            this.updateScore(linesCleared);
            this.checkLevelUp();
        }
    }

    updateScore(linesCleared = 0) {
        const points = [0, 100, 300, 500, 800]; // Points pour 0,1,2,3,4 lignes
        this.score += points[linesCleared] * this.level;
        document.getElementById('score').textContent = this.score;
        
        if (linesCleared > 0) {
            const scoreElement = document.getElementById('score');
            scoreElement.classList.add('score-update');
            setTimeout(() => scoreElement.classList.remove('score-update'), 300);
        }
    }

    checkLevelUp() {
        const newLevel = Math.floor(this.score / 1000) + 1;
        if (newLevel !== this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.updateLevel();
        }
    }

    updateLevel() {
        document.getElementById('level').textContent = this.level;
    }

    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        this.gameOverModal.show();
        cancelAnimationFrame(this.gameLoop);
        this.gameLoop = null;
    }

    togglePause() {
        if (this.gameOver || !this.gameLoop) return;
        
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = this.isPaused ? 'Reprendre' : 'Pause';
        pauseBtn.classList.toggle('btn-warning');
        pauseBtn.classList.toggle('btn-info');
        
        if (!this.isPaused) {
            this.lastTime = performance.now();
            this.gameLoop = requestAnimationFrame((time) => this.update(time));
        }
    }

    restart() {
        this.gameOverModal.hide();
        this.start();
    }

    update(time) {
        if (this.gameOver || this.isPaused) {
            return;
        }

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        
        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }
        
        this.draw();
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
    }

    drop() {
        this.currentPiece.pos.y++;
        if (this.collision()) {
            this.currentPiece.pos.y--;
            this.merge();
            this.spawnPiece();
        }
        this.dropCounter = 0;
    }

    handleKeyPress(event) {
        if (this.gameOver || this.isPaused || !this.gameLoop) return;

        switch(event.keyCode) {
            case 37: // Gauche
                this.currentPiece.pos.x--;
                if (this.collision()) {
                    this.currentPiece.pos.x++;
                }
                break;
            case 39: // Droite
                this.currentPiece.pos.x++;
                if (this.collision()) {
                    this.currentPiece.pos.x--;
                }
                break;
            case 40: // Bas
                this.drop();
                break;
            case 38: // Haut (Rotation)
                this.rotate();
                break;
            case 32: // Espace (Hard Drop)
                while (!this.collision()) {
                    this.currentPiece.pos.y++;
                }
                this.currentPiece.pos.y--;
                this.merge();
                this.spawnPiece();
                break;
        }
    }

    draw() {
        // Effacer le canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dessiner la grille
        this.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    this.ctx.fillStyle = cell.color;
                    this.ctx.fillRect(
                        x * this.blockSize,
                        y * this.blockSize,
                        this.blockSize - 1,
                        this.blockSize - 1
                    );
                }
            });
        });
        
        // Dessiner la pièce courante
        if (this.currentPiece) {
            this.currentPiece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        this.ctx.fillStyle = this.currentPiece.color;
                        this.ctx.fillRect(
                            (x + this.currentPiece.pos.x) * this.blockSize,
                            (y + this.currentPiece.pos.y) * this.blockSize,
                            this.blockSize - 1,
                            this.blockSize - 1
                        );
                    }
                });
            });
        }
    }
}

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    const game = new Tetris();
});