
class DungeonGrid {
    constructor(size) {
        this.size = size;
        this.grid = [];
        this.rooms = [];
        this.locked_rooms = [];
        this.halls = [];
        this.entities = [];
        this.player = null;
        this.player_at = null;
        this.player_start = null;

        for (var y=0; y<size; y++) {
            this.grid[y] = [];
            for (var x=0; x<size; x++) {
                this.grid[y][x] = {"isWall": true, "isHall": false, "entity": null, "trap": null, "item": null, "fow": -1};
            }
        }
    }

    getTile(x_or_vec, y=null) {
        if (y != null) {
            // Coordinates are not in the grid
            if(y < 0 || y >= this.size || x_or_vec < 0 || x_or_vec >= this.size) { return null; }
            return this.grid[y][x_or_vec];
        } else {
            return this.getTile(x_or_vec.x, x_or_vec.y);
        }
    } 

    createDungeon(maxLeafSize=10) {
        // Uses the BSP module to generate a dungeon and set it on the grid array.
        var root = new Leaf(0, 0, this.size, this.size);
        var all_leaves = [root];
    
        var splitted = true;
        // Loop until no more Leafs can be split
        while (splitted) {
            for (i=0; i < all_leaves.length; i++) {
                var cur_leaf = all_leaves[i];
                if(!cur_leaf.lChild && !cur_leaf.rChild) {
                    var a = [cur_leaf.width > maxLeafSize,cur_leaf.height > maxLeafSize];
                    // Leaf has not been split
                    if(cur_leaf.width > maxLeafSize || cur_leaf.height > maxLeafSize || Math.random() > 0.25) {
                        // If the leaf is greater than the max size... or a 75% chance
                        if(cur_leaf.split()) {
                            // Successful split
                            all_leaves.push(cur_leaf.lChild);
                            all_leaves.push(cur_leaf.rChild);
                            splitted = true;
                        }
                    }
                }
            }
            splitted = false;
        }

        root.createRooms(this.halls, this.rooms);

        // Set the grid elements as walls or not walls.
        for(var i=0; i<all_leaves.length; i++) {
            if(all_leaves[i].room) {
                var points = all_leaves[i].room.asPointArray();
                for(var p=0; p<points.length; p++) {
                    var point = points[p];
                    this.getTile(point)["isWall"] = false;
                }
            }
        }
        
        for(var i=0; i<this.halls.length; i++) {
            var points = this.halls[i].asPointArray();
            for(var p=0; p<points.length; p++) {
                var tile = this.getTile(points[p]);
                if (tile["isWall"]) {
                    tile["isWall"] = false;
                    tile["isHall"] = true;
                }
            }
        }

        var keys_to_spawn = 0;
        for (var r=0; r<this.rooms.length; r++) { // For each room
            var room = this.rooms[r],
                exits = [];
            // Transpose the walls that encloses the room
            for (var y=room.y-1; y<room.bottom+1; y++) {
                for (var x=room.x-1; x<room.right+1; x++) {
                    if (x == room.x-1 || x == room.right || y==room.y-1 || y==room.bottom) {
                        tile = this.getTile(x, y);
                        if (tile["isHall"]) {
                            exits.push(new Vector(x, y));
                        }
                    }
                }
            }

            if (exits.length == 1 && Math.random() < 0.33) {
                this.addEntity(new Entity(this, exits[0], "firewall"), exits[0]);
                this.locked_rooms.push(room);

                // Add something to the room
                // 70% chance of spawning a program, 30% of script
                if (Math.random() < 0.7) { var item = PROGRAM_LIST[randint(0, PROGRAM_LIST.length)];
                } else { var item = SCRIPT_LIST[randint(0, SCRIPT_LIST.length)]; }

                this.addItem(item, room.randomPoint());

                keys_to_spawn++;
            } else if (keys_to_spawn) {
                // Put the key into a room with more than 1 exit.
                this.getTile(room.randomPoint())["item"] = "password";
                keys_to_spawn--;
            }
        }

        this.populateDungeon();
    }

    populateDungeon() {
        var enemies_to_spawn = randint(this.size * 0.1, this.size * 0.3) + DATA["level"],
            traps_to_spawn = randint(1, this.size * 0.1) + DATA["level"],
            items_to_spawn = randint(1, this.size * 0.05 + 1),
            player_spawned = false,
            goal_spawned = false,
            goal_start = null;

        while(enemies_to_spawn + traps_to_spawn + items_to_spawn > 0) {
            // A random point in a random room prevent elements of spawning on walls and corridors
            var rand_point = this.randomRoom().randomPoint(),
                tile = this.getTile(rand_point),
                locked=false;

            if (player_spawned && this.player_start == rand_point) { continue; }
            if (goal_spawned && goal_start == rand_point) { continue; }
            // Preventing the player to spawn in a locked room
            for (var r=0; r<this.locked_rooms.length; r++) {
                if ( rand_point.isInside(this.locked_rooms[r].asPointArray()) ) { locked=true; }
            }

            if (!player_spawned && !locked) {
                this.player_at = rand_point;
                this.player_start = rand_point;
                this.player = new Player(this, rand_point);
                this.addEntity(this.player, rand_point);
                this.getTile(rand_point)["trap"] = "exit";
                player_spawned = true;

            } else if (!goal_spawned ) {
                var neighbors = this.getNeighbors(rand_point),
                    inHall = false;
                
                // Prevents the goal from blocking the exit of a room
                for (var n=0; n<neighbors.length; n++) {
                    if (this.getTile(neighbors[n])["isHall"]) {
                        inHall = true;
                    }
                }
                if (inHall) { continue; }

                var goal = new Entity(this, rand_point);
                goal.type = "goal";
                this.addEntity(goal, rand_point);
                goal_spawned = true;
                goal_start = rand_point;

            } else if (traps_to_spawn && tile['trap'] == null && tile["entity"] == null) {
                var trap = TRAP_LIST[randint(0, TRAP_LIST.length)];
                this.addTrap(trap, rand_point);
                traps_to_spawn--;
            } else if (items_to_spawn && tile['item'] == null && tile["entity"] == null) {

                // 30% chance of program, 70% of script
                if (Math.random() < 0.3) {
                    var item = PROGRAM_LIST[randint(0, PROGRAM_LIST.length)];
                } else {
                    var item = SCRIPT_LIST[randint(0, SCRIPT_LIST.length)];
                }
                this.addItem(item, rand_point);
                items_to_spawn--;
            } else if (enemies_to_spawn && tile['entity'] === null) {
                var roll, _class;
                roll = Math.random();
                if (DATA['level'] % 10 == 1) {
                    if (roll < 0.9) { _class="common";
                    } else { _class="tough"; }
                } else if (DATA['level'] % 10 == 2) {
                    if (roll < 0.5) {  _class="common";
                    } else { _class="tough"; }
                } else if (DATA['level'] % 10 == 3) {
                    if (roll < 0.4) { _class="common";
                    } else if (roll < 0.7) { _class="tough";
                    } else { _class="glass"; }
                } else if (DATA['level'] % 10 == 4) {
                    if (roll < 0.3) { _class="common";
                    } else if (roll < 0.6) { _class="tough";
                    } else if (roll < 0.9) { _class="glass";
                    } else { _class="poison"; }
                } else if (DATA['level'] % 10 == 5) {
                    if (roll < 0.1) { _class="common";
                    } else if (roll < 0.4) { _class="tough";
                    } else if (roll < 0.7) { _class="glass";
                    } else { _class="poison"; }
                } else if (DATA['level'] % 10 == 6) {
                    if (roll < 0.3) { _class="tough";
                    } else if (roll < 0.4) { _class="glass";
                    } else if (roll < 0.7) { _class="poison";
                    } else { _class="explosive"; }
                } else if (DATA['level'] % 10 == 7) {
                    _class="explosive";
                } else if (DATA['level'] % 10 == 8) {
                    if (roll < 0.1) { _class="tough";
                    } else if (roll < 0.2) { _class="glass";
                    } else if (roll < 0.5) { _class="poison";
                    } else if (roll < 0.6) { _class="vampire";
                    } else { _class="explosive"; }
                } else if (DATA['level'] % 10 == 9) {
                    if (roll < 0.5) { _class="vampire";
                    } else  { _class="poison"; }
                } else if (DATA['level'] % 10 == 0) {
                    if (roll < 0.3) { _class="vampire";
                    } else if (roll < 0.6) { _class="tough";
                    } else if (roll < 0.8) { _class="poison";
                    } else { _class="explosive"; }
                }

                this.addEntity(new Enemy(this, rand_point, _class), rand_point);
                enemies_to_spawn--;
            }
        }
    }

    executeTurn() {
        // Player computation
        var player_tile = this.getTile(this.player_at);
        if (player_tile["trap"] && player_tile["trap"] != "exit") {
            TRAPS[player_tile["trap"]](this.player);
            player_tile["trap"] = null;
        }
        if (player_tile["item"]) {
            var item = player_tile["item"];
            print_message("<< Obtained " + player_tile["item"] + " item!");
            if (PROGRAM_LIST.indexOf(item) > -1) {
                if (DATA["programs"].indexOf(item) > -1 || DATA["installed"].indexOf(item) > -1) {
                    print_message("!! Program already obtained, using its data to the version update.");
                    DATA["bits"]++;
                } else { DATA["programs"].push(item); }
            } else if (SCRIPT_LIST.indexOf(item)> -1) { DATA["scripts"].push(item);
            } else if (item == "password") { DATA["passwords"]++; }
            
            player_tile["item"] = null;
        }

        if (DATA["latency"] > 400 && !this.player.destroy) {
            this.player.destroy = true;
            playFloatText(this.player_at.x, this.player_at.y, "OFFLINE", 'red', 16);
        } // Player dies
        if (DATA["bits"] > 9) { // Level up
            DATA["bits"] = 0;
            DATA["version"]++;
            print_message("<< Version Update! Stats increased.")
            playFloatText(this.player_at.x, this.player_at.y, "UPDATE", 'blue');
        }

        // Enemy turn
        var to_destroy = [];

        for (var e=0; e<this.entities.length; e++) {
            var entity = this.entities[e];
            if (GAME_OVER) { break; } // Fix a bug where enemies would attack after GAME OVER
            if (entity) {
                if (entity.type == "enemy") {
                    entity.turn(this);
                };
                
                if (entity.destroy) {
                    if (entity.type == "player") {
                        var proxy = DATA["installed"].indexOf("Backup");
                        if (proxy < 0) {
                            // Player dies
                            print_message("!! Connection lost... Systems shutting down... You're now offline...");
                            print_message("GAME OVER");
                            GAME_OVER = true;
                            to_destroy.push(e);
                            this.grid[entity.pos.y][entity.pos.x]["entity"] = null;
                        } else {
                            playAnimation(0, 0, canvas.width, [32, 249, 181]);
                            print_message("!! Main connection lost, backup connection estabilished.");
                            this.moveEntity(this.player_at, this.player_start);
                            DATA["latency"] = 80;
                            this.player.destroy = false;
                            DATA["installed"].splice(proxy, 1);
                            DATA["programs"].splice(proxy, 1);
                            playFloatText(this.player_at.x, this.player_at.y, "CONNECTED", 'blue', 16);
                        }
                    } else {
                        to_destroy.push(e);
                        this.grid[entity.pos.y][entity.pos.x]["entity"] = null;
                    }
                }
            }
        }

        for (var d=0; d<to_destroy.length; d++) {
            if(to_destroy[d].type == "goal") {
                DATA["level"]++;
                startDungeon();
            }
            this.entities.splice(to_destroy[d], 1);
        }
    }

    addEntity(ent, point) {
        this.getTile(point)["entity"] = ent;
        this.entities.push(ent);
    }

    addTrap(trap, point) {
        this.getTile(point)["trap"] = trap;
    }

    addItem(item, point) {
        this.getTile(point)["item"] = item;
    }

    randomRoom() { // Changed from randomPointInRoom
        return this.rooms[ randint(0, this.rooms.length) ];
    }

    getNeighbors(center) {
        var neighbors = [];
        if (center.x > 0) { neighbors.push(new Vector(center.x -1, center.y)); }
        if (center.x < this.size -1) { neighbors.push(new Vector(center.x +1, center.y)); }
        if (center.y > 0) { neighbors.push(new Vector(center.x, center.y-1)); }
        if (center.y < this.size -1) { neighbors.push(new Vector(center.x, center.y+1)); }
        return neighbors;
    }

    walkTowards(from, to) {
        // NOTE: Its fine, but the entities do not go around corners.
        // Maybe adding diagonal movement will fix this.
        // Maybe computing the diagonal tiles distance and script a two movement path when the entity reaches a corner
        var neighbors = this.getNeighbors(from),
            closest = neighbors[0],
            closest_distance = new Vector(to);
        closest_distance.subtract(from);

        for (var n=0; n < neighbors.length; n++) {
            var n_distance = new Vector(to);
                n_distance.subtract(neighbors[n]);
            if (n_distance.length < closest_distance.length) {
                closest = neighbors[n];
            }
        }

        return closest
    }

    movePlayer(to) {    
        if (this.player.status['poison'] > 0) {
            this.player.status['poison']--;
            var dmg = randint(1, 10);
            DATA['latency'] += dmg;
            playFloatText(this.player_at.x, this.player_at.y, dmg, 'green');
            playBullet(this.player_at.x, this.player_at.y, 3, [70,130,42]);
        }
        if (this.player.status['stun'] > 0) {
            playFloatText(this.player_at.x, this.player_at.y, "X", 'yellow');
            playBullet(this.player_at.x, this.player_at.y, 3, [234,208,60]);
            this.player.status['stun']--;
        } else {
            this.moveEntity(this.player_at, to);
        }

        this.executeTurn();
    }

    moveEntity(from, to) {
        var from_tile = this.getTile(from),
            to_tile = this.getTile(to),
            entity = from_tile["entity"];

        // No entity to move in the origin tile
        if (!entity) { return; }
        // Trying to move into a wall
        if (to_tile["isWall"]) { return; }

        if (to_tile["entity"]) {
            // Going to a tile occupied by another entity
            from_tile["entity"].interactWith(to_tile["entity"]);
        } else {
            from_tile["entity"] = null;
            to_tile["entity"] = entity;
            entity.pos = to;

            // If the player is moving, update the tracker
            if (entity.type == "player") {
                this.player_at = to;
                if (DATA["installed"].indexOf("Scavenger") > -1 && Math.random() < 0.0005) {
                    print_message("!! Scavenger found an item. " + PROGRAM_LIST[randint(0, PROGRAM_LIST.length)] + " found!");
                    playFloatText(this.player_at.x, this.player_at.y, "!!", 'blue');
                }
            }
        }
    }
}