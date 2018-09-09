class Scene {
    // This is a base class, supposed to be extended
    constructor(type) { 
        this.type = type;
        this.buttons = [];
    }
    draw() {
        ctx.fillStyle = "rgb(25,25,25)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    handle(evt) {
    }
    execute(cmd) {
        return;
    }
    addButton(x, y, width, height, text, fontsize, color, callback) {
        this.buttons.push(new Button(x, y, width, height, text, fontsize, color, callback));
    }
}

class MenuScene extends Scene {
    constructor(type) {
        super(type);
    }
    draw() {
        clearCanvas();
        for(var b=0; b<this.buttons.length; b++) { this.buttons[b].draw(); }
    }
    handle() {
        // When a click event is generated, checks if the user has clicked
        // on a button.
        if (click) {
            for(var b=0; b<this.buttons.length; b++){
                var button = this.buttons[b];
                if( button.callback && button.hasPoint(click_at) ) {
                    button.callback();
                }
            }
            click = false;
        }
    }
    update() {
        this.buttons = [];
        this.addButton(canvas.width/2-150, canvas.height/2-50, 300, 100,
                       "NEW GAME", 40, "green", startDungeon);
    }
}

class DungeonScene extends Scene {
    constructor(size) {
        super("dungeon");
        this.dungeon = new DungeonGrid(size);
        this.dungeon.createDungeon();

        TILESIZE = canvas.width / size;

        this.scan = 0;
    }

    draw() {
        clearCanvas();
    
        for(var y=0; y < this.dungeon.size; y++) {
            for(var x=0; x < this.dungeon.size; x++) {
                var tile = this.dungeon.getTile(x, y)
                if (Math.abs(this.dungeon.player_at.x - x) < PLAYER_VISION &&
                    Math.abs(this.dungeon.player_at.y - y) < PLAYER_VISION) {
                    // Tile in player's vision range
                    tile["fow"] = 1;
                } else if(tile["fow"] == 1) {
                    // Tile has been explored but not in player's range
                    tile["fow"] = 0;
                }

                if (tile["fow"] == 0) {
                    // Explored map
                    if ( tile["isWall"] ) {
                        if (DATA["level"] % 40 <= 10) { ctx.fillStyle = "#14412b";
                        } else if (DATA["level"] % 40 <= 20) { ctx.fillStyle = "#043363";
                        } else if (DATA["level"] % 40 <= 30) { ctx.fillStyle = "#7d3232";
                        } else if (DATA["level"] % 40 <= 40) { ctx.fillStyle = "#404040"; }
                    } else if (tile["isHall"]) {
                        if (DATA["level"] % 40 <= 10) { ctx.fillStyle = "#71c96e";
                        } else if (DATA["level"] % 40 <= 20) { ctx.fillStyle = "#4f6ac4";
                        } else if (DATA["level"] % 40 <= 30) { ctx.fillStyle = "#b96868";
                        } else if (DATA["level"] % 40 <= 40) { ctx.fillStyle = "#b1b1b1"; }
                    } else {
                        ctx.fillStyle = '#262626';
                    }
                    ctx.fillRect(x * TILESIZE, y * TILESIZE, TILESIZE, TILESIZE);

                    if (tile["entity"]) {
                        if (tile["entity"].type === "goal") {
                            ctx.drawImage(sprites, 112,0,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        }
                    }
                }
                if (tile["fow"] == 1) {
                    // Visible map
                    if ( tile["isWall"] ) {
                        if (DATA["level"] % 40 <= 10) { ctx.fillStyle = "#1f774d";
                        } else if (DATA["level"] % 40 <= 20) { ctx.fillStyle = "#075db6";
                        } else if (DATA["level"] % 40 <= 30) { ctx.fillStyle = "#af4646";
                        } else if (DATA["level"] % 40 <= 40) { ctx.fillStyle = "#5c5c5c"; }
                    } else if (tile["isHall"]) {
                        if (DATA["level"] % 40 <= 10) { ctx.fillStyle = "#b1e1b0";
                        } else if (DATA["level"] % 40 <= 20) { ctx.fillStyle = "#a0afdf";
                        } else if (DATA["level"] % 40 <= 30) { ctx.fillStyle = "#d9aeae";
                        } else if (DATA["level"] % 40 <= 40) { ctx.fillStyle = "#d5d5d5"; }
                    } else {
                        ctx.fillStyle = '#1a1a1a';
                    }
                    ctx.fillRect(x * TILESIZE, y * TILESIZE, TILESIZE, TILESIZE);
                    
                    if (tile["trap"]) {
                        ctx.fillStyle = 'rgb(200,200,200)';
                        if (tile["trap"] == "exit") {
                            ctx.drawImage(sprites, 96,0,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        } else {
                            ctx.drawImage(sprites, 32,0,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        }
                    }
                    
                    if (tile["item"]) {
                        if (tile['item'] == "password") {
                            ctx.drawImage(sprites, 0,0,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        } else if (PROGRAM_LIST.indexOf(tile['item']) > -1) {
                            ctx.drawImage(sprites, 64,0,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        } else {
                            ctx.drawImage(sprites, 48,0,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        }
                    }
                    
                    if (tile["entity"]) {
                        if (tile["entity"].type === "player") {
                            ctx.drawImage(sprites, 0,16,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        }
                        if (tile["entity"].type === "enemy") {
                            if (tile["entity"]._class == "common") {
                                ctx.drawImage(sprites, 16,16,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                            } else if (tile["entity"]._class == "tough") {
                                ctx.drawImage(sprites, 32,16,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                            } else if (tile["entity"]._class == "glass") {
                                ctx.drawImage(sprites, 48,16,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                            } else if (tile["entity"]._class == "vamp") {
                                ctx.drawImage(sprites, 64,16,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                            } else if (tile["entity"]._class == "explosive") {
                                ctx.drawImage(sprites, 80,16,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                            } else if (tile["entity"]._class == "poison") {
                                ctx.drawImage(sprites, 96,16,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                            }
                        }
                        if (tile["entity"].type === "goal") {
                            ctx.drawImage(sprites, 80,0,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        }
                        if (tile["entity"].type === "firewall") {
                            ctx.drawImage(sprites, 16,0,16,16,x * TILESIZE +1, y * TILESIZE +1, TILESIZE-1, TILESIZE-1);
                        }
                    }
                } 
            }
        }


        for(var b=0; b<this.buttons.length; b++) { this.buttons[b].draw(); }
    }

    handle() {
        if (!this.dungeon.player_at) { return; }

        var noMovement = false,
            to = new Vector(this.dungeon.player_at);

        if (keys['left']) { to.add(-1, 0);
        } else if (keys['up']) { to.add(0, -1);
        } else if (keys['right']) { to.add(1, 0);
        } else if (keys['down']) { to.add(0, 1);
        } else { noMovement = true; }
        if (!noMovement) { this.dungeon.movePlayer(to); }
    }

    update() {
        var latency_text = "Latency: " + DATA["latency"] + "ms";

        if (DATA["latency"] < 81) { var latency_level = "#0dc600"; }
        else if (DATA["latency"] < 171) { var latency_level = "#e0e000"; }
        else if (DATA["latency"] < 301) { var latency_level = "#c66600"; }
        else { var latency_level = "#ff0000"; }
        
        this.buttons = [];

        this.addButton(canvas.width-200, canvas.height-20, 200, 20, latency_text, 20, latency_level);
        this.addButton(0, canvas.height-20, 200, 20, "Version: " + DATA["version"] + "." + DATA["bits"] , 20, "#0dc600");
        this.addButton(canvas.width/2-100, canvas.height-20, 200, 20, "Level: " + DATA["level"], 20, "#0dc600");
        this.addButton(0, canvas.height-40, 200, 20, "Pass: " + DATA["passwords"], 20, "#0dc600");
        this.addButton(canvas.width-200, canvas.height-40, 200, 20, "Mem: " + DATA["installed"].length + "/3" , 20, "#0dc600");
        if (GAME_OVER) {
            var alpha = GO_timer / 3000;
            this.addButton(canvas.width/2-150, canvas.height/2-50, 300, 50, "GAME OVER", 40, 'rgba(255,0,0,' + alpha + ")");
            if (GO_timer > 3000) {
                this.addButton(canvas.width/2-150, canvas.height/2, 300, 50, "Press any key to start again.", 16, 'rgba(255,0,0,' + alpha/2 + ")");
            }
        }
    }
}

class SceneControl {
    constructor() {
        this.cur_scene = new MenuScene("main");
        this.ani = [];
    }
    changeScene(to_scene) {
        this.cur_scene = to_scene;
    }

    update() { this.cur_scene.update() }
    draw() {
        this.cur_scene.draw();
        for(var a=0; a<this.ani.length; a++) { this.ani[a].draw(); if(this.ani[a].destroy) { this.ani.splice(a, 1); } }
    }
}