var canvas = document.getElementById("screen");
var ctx = canvas.getContext('2d');


var control = new SceneControl();


function handleEvents(evt) {
    control.cur_scene.handle(evt);
}

canvas.addEventListener( 'click', handleEvents );
document.addEventListener( 'keyup', handleEvents );


function startGame(){
    control.changeScene(new DungeonScene(canvas, ctx, 40));
    control.cur_scene.draw();
}

control.changeScene(new MenuScene(canvas, ctx));

control.cur_scene.addButton(canvas.width/2-100, canvas.height/2-50, 200, 100,
                            "START", "purple", startGame);

control.cur_scene.draw();