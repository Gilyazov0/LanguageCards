
var game



//Игровая карта. Хранит данные карты в виде сырых данных JSON
class Card {
    constructor(card_data,front,back,card_set = null,show_tags = true,container = null) {
        this.card_data = card_data;
        this.front = front;
        this.back = back;
        this.show_tags = show_tags;
        this.card_set = card_set;
        this.container = container;
    }
    get_id() {
        return this.card_data.id; 
    }

    show (is_front_side) {
        if (this.container != null) {
            this.container.innerHTML = this.getHTML(is_front_side);    
        }
    }            

    getHTML(front = true ) {

        let attributes = (front) ? this.front : this.back;
        let show_tags = (front) ? false : this.show_tags;
        let tags = this.card_data.tags;
        
        var header = '';
        if (this.card_set != null) {
                header = (this.card_set.get_card_number(this)+1)+'/'+this.card_set.cards_count()
            }

        var body = '';

        for (let i=0; i< attributes.length;i++) {
            const FA = this.card_data.FAs[attributes[i]]
            if (FA != undefined){
                body +=  `<h5 class="card-title ">${this.card_data.FAs[attributes[i]]}</h5> \n`;
                //<p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>

            }              
        }

        var footer =''
        if (show_tags){
            for (let i=0; i< tags.length;i++) {
                footer +='<' + tags[i] + '>';
            }
        }

        return `
        <div class="card border-success mb-3 game-card">
            <div class="card-header bg-transparent border-success ">${header}</div>
            <div class="card-body text-success ">
            ${body}
            </div>
            <div class="card-footer bg-transparent border-success ">${footer}</div>
        </div>
        `   
    }
}

//Игра. Хранит данные игры (список карты в виде данных JSON)
class Card_set {
    // методы класса
    constructor(cards) {
        this.cards = cards.cards;
        this.order = cards.order;
        this.current_card_number = 0;
        this.front = ['На русском'];
        this.back = ['Транскрипция','На иврите'];
        this.show_tags = true;
    }
    
    cards_count() {
        return this.order.length
    }    

    get_current_card_number() {
        return this.current_card_number    
    }

    get_card_number(card) {
        const id = card.get_id(); 
        return this.order.findIndex(x => x == id)
    }

    get_next_card(container=null){
        if (this.current_card_number >= this.cards.length - 1)
        {
            throw "Card numbers out of range!"
        }        
        this.current_card_number++;
        return this.get_card(this.current_card_number,container)
    }

    get_prev_card(container=null){
        if (this.current_card_number <= 0)
        {
            throw "Card numbers out of range!"
        }
        this.current_card_number--;
        return this.get_card(this.current_card_number,container)
    }

    get_card(number,container=null) {
       
       return new Card( this.cards[this.order[number]] ,this.front,this.back,this,this.show_tags,container)
        
    }
  }

  function ___show_next_card___(obj) {

    obj.show_next_card();


  }

   //assumming that "game" is global variable, need to find a way to avoid this (see start()).
   class Game {
    // методы класса
    constructor(container,globalname) {

        this.container = container
        this.card_set = undefined
        this.is_front_side = true
        this.tags = undefined
        this.selected_tags =  undefined

        fetch('../get_tags', {
            method: 'POST',
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(result => {
                console.log(result)
                this.tags = result.tags;   
                this.new_game()             
            })

    }

    new_game(){
        var tags_list_body = "";
        for (let i=0; i< this.tags.length;i++) {
            const tag_name = this.tags[i].name;
            tags_list_body+=` 
            <li class="tristate tristate-switcher list-group-item">
                <input type="radio" id="item1-state-off" class="tag-picker" tag_name=${tag_name} name="item${i}" value="-1">
                <input type="radio" id="item1-state-null" class="tag-picker" tag_name=${tag_name} name="item${i}" value="0" checked>
                <input type="radio" id="item1-state-on" class="tag-picker" tag_name=${tag_name} name="item${i}" value="1">
                <i></i>
                <span>${tag_name}</span>
            </li>`
        }
        this.container.innerHTML = `
                                    <div><span style="text-align: center"><h3>Select tags</h3> </span>
                                    <ul class="list-group">
                                    ${tags_list_body}
                                    </ul>
                                    <div style="text-align: center; padding:10px" > <button class="btn btn-primary game-control" id = 'start-game-btn'><h1> start game </h1></button> </div>
                                    </div>`
        document.querySelector('#start-game-btn').onclick = function(){game.start()};
    }
    get_selected_tags() {

        const tags = document.querySelectorAll(".tag-picker");
        let tags_include = [];
        let tags_exclude = [];
        
        for( let i = 0; i < tags.length; i++){
            if (tags[i].checked)
            {
                switch (tags[i].getAttribute('value'))
                {
                    case '-1':tags_exclude.push(tags[i].getAttribute('tag_name'));
                    case  '1':tags_include.push(tags[i].getAttribute('tag_name'));    

                }
            }
        }
        console.log(tags_include);
        console.log(tags_exclude);

        return {"tags_include":tags_include,"tags_exclude":tags_exclude}
    }


    start() {

        this.selected_tags = this.get_selected_tags();
        
        this.container.innerHTML = `
        <div id = 'current_card'></div>
        <div class = "game-control-bar">    
        <button class="btn btn-primary game-control" id="show-prev-card-btn" ><h1><i class="bi bi-arrow-left"></i> </h1></button>
        <button class="btn btn-primary game-control " id="reverse-card-btn" ><h1><i class="bi bi-arrow-repeat"></i> </h1></button>
        <button class="btn btn-primary game-control" id="show-next-card-btn"  ><h1><i class="bi bi-arrow-right"></i></h1></button>
        </div>`;
        
        //assumming that "game" is global variable, need to find a way to avoid this.
        document.querySelector('#show-prev-card-btn').onclick = function(){game.show_prev_card()};
        document.querySelector('#show-next-card-btn').onclick = function(){game.show_next_card()};
        document.querySelector('#reverse-card-btn').onclick = function(){game.reverse_card()};

        fetch('../get_cards', {
            method: 'POST',
            body: JSON.stringify({
                filter: this.selected_tags
            })
        }
        )
            .then(response => response.json())
            .then(result => {
                console.log(result)
                this.card_set = new Card_set(result.cards);
                this.update_game()
            })

    }  
    show_prev_card(){
        this.is_front_side = true;
        this.card_set.get_prev_card();   
        this.update_game();
    }
    
    show_next_card(){
        this.is_front_side = true;
        this.card_set.get_next_card();   
        this.update_game();
    }
    
    reverse_card(){
        this.is_front_side = !this.is_front_side;   
        this.update_game();
    }      

    update_game(){
        const card_set = this.card_set; 
        if (card_set.cards_count() == 0 ){
            
            this.container.innerHTML=`<div class="alert alert-danger" role="alert">
                                           <h1>Card set is empty</h1>
                                     </div>

                                     <form action="/Cards/game/">   
                                        <div style="text-align: center; padding:10px"> 
                                             <input type="submit" class="btn btn-primary game-control" value = "Start new game"></input>
                                        </div>
                                     </form>
                                     `
        }
        else{
            document.querySelector('#show-prev-card-btn').disabled = (card_set.get_current_card_number() <= 0);
            document.querySelector('#show-next-card-btn').disabled = (card_set.get_current_card_number() >= card_set.cards_count() - 1);
            const container = document.querySelector('#current_card');
            const card = card_set.get_card(card_set.get_current_card_number(),container);
            card.show(this.is_front_side);
        }

    }
  }




document.addEventListener('DOMContentLoaded', function() {
    game = new Game(document.querySelector('#game_container'));
})


window.addEventListener("resize", InitApp); //При растягивании окна приложение будет инициализироваться заново

function InitApp() //Растягиваем холст на весь экран
{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

var canvas
var ctx
var msgBox
var touchStart
var touchStart
var sensitivity

document.addEventListener('DOMContentLoaded', function() {

//Получение холста и его контекста
canvas = document.getElementById("canvas");
ctx = canvas.getContext("2d");

//Чувствительность — количество пикселей, после которого жест будет считаться свайпом
sensitivity = 20;

//Получение поля, в котором будут выводиться сообщения
msgBox = document.getElementById("msg-box");

touchStart = null; //Точка начала касания
touchStart = null; //Текущая позиция

//Перехватываем события
canvas.addEventListener("touchstart", function (e) { TouchStart(e); }); //Начало касания
canvas.addEventListener("touchmove", function (e) { TouchMove(e); }); //Движение пальцем по экрану
//Пользователь отпустил экран
canvas.addEventListener("touchend", function (e) { TouchEnd(e, "green"); });
//Отмена касания
canvas.addEventListener("touchcancel", function (e) { TouchEnd(e, "red"); });



InitApp(); //Инициализировать приложение
})

function Draw(x, y, weight, color = "#000") //Функция рисования точки
{
    ctx.fillStyle = color;

    let weightHalf = weight / 2;

    ctx.fillRect(x - weightHalf, y - weightHalf, weight, weight);
}

function DrawLine() //Функция рисования линии
{
    ctx.strokeStyle = "#ccc";

    ctx.beginPath();

    ctx.moveTo(touchStart.x, touchStart.y);
    ctx.lineTo(touchPosition.x, touchPosition.y);

    ctx.stroke();
}

function TouchStart(e)
{
    //Получаем текущую позицию касания
    touchStart = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    touchPosition = { x: touchStart.x, y: touchStart.y };

    Draw(touchPosition.x, touchPosition.y, 6, "blue"); //Рисуем точку начала касания
}

function TouchMove(e)
{
    //Получаем новую позицию
    touchPosition = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    Draw(touchPosition.x, touchPosition.y, 2); //Рисуем точку текущей позиции
}

function TouchEnd(e, color)
{
    DrawLine(); //Рисуем линию между стартовой и конечной точками
    Draw(touchPosition.x, touchPosition.y, 6, color); //Рисуем конечную точку

    CheckAction(); //Определяем, какой жест совершил пользователь

    //Очищаем позиции
    touchStart = null;
    touchPosition = null;
}

function CheckAction()
{
    var d = //Получаем расстояния от начальной до конечной точек по обеим осям
    {
   	 x: touchStart.x - touchPosition.x,
   	 y: touchStart.y - touchPosition.y
    };

    var msg = ""; //Сообщение

    if(Math.abs(d.x) > Math.abs(d.y)) //Проверяем, движение по какой оси было длиннее
    {
   	 if(Math.abs(d.x) > sensitivity) //Проверяем, было ли движение достаточно длинным
   	 {
   		 if(d.x > 0) //Если значение больше нуля, значит пользователь двигал пальцем справа налево
   		 {
   			 msg = "Swipe Left";
   		 }
   		 else //Иначе он двигал им слева направо
   		 {
   			 msg = "Swipe Right";
   		 }
   	 }
    }
    else //Аналогичные проверки для вертикальной оси
    {
   	 if(Math.abs(d.y) > sensitivity)
   	 {
   		 if(d.y > 0) //Свайп вверх
   		 {
   			 msg = "Swipe up";
   		 }
   		 else //Свайп вниз
   		 {
   			 msg = "Swipe down";
   		 }
   	 }
    }

    msgBox.innerText = msg; //Выводим сообщение
}