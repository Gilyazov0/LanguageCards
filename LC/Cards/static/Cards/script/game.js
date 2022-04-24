import {Card_set,Card, Tag_selector } from './card_set.js'

var game

//assumming that "game" is global variable, need to find a way to avoid this (see start()).
class Game {
    // методы класса
    constructor(container ) {

        this.container = container; // DOM элемент содержащий игру
        this.card_set = undefined;
        this.tags = undefined; //[{'name':name,'id': id},{}...]
        this.user_tags = undefined;//[{'name':name,'id': id},{}...]
        this.selected_tags = undefined;
        this.active_card_obj = undefined;
        this.touchStart = null; //Точка начала касания
        this.touchStart = null; //Текущая позиция
        this.active_card_container = undefined; //DOM элемент содержащий текущую карту
        this.tag_selectors = []; // [{'include': Tag_selector, 'exclude': Tag_selector}, {same} ....]
       

        fetch('../get_tags', {
            method: 'POST',
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(result => {
                console.log(result)
                this.tags = result.tags;
                this.user_tags = result.user_tags;
                this.new_game()
            })
    }
    
 
    get_tags_html(tags, type, column_name){
        let tags_list_body = `<div> ${column_name}</div>`;
        for (let i = 0; i < tags.length; i++) {
            const tag_id = tags[i].id;
            const tag_name = tags[i].name;
            tags_list_body += ` 
            <li class="tristate tristate-switcher list-group-item  ">
                <input type="radio" class="tag-picker" tag_id="${tag_id}" name="item${type}${i}" value="-1" >
                <input type="radio" class="tag-picker" tag_id="${tag_id}" name="item${type}${i}" value="0" checked >
                <input type="radio" class="tag-picker" tag_id="${tag_id}" name="item${type}${i}" value="1" >
                <i></i>
                <span>${tag_name}</span>
            </li>`        
        }
        return tags_list_body
    }
    show_selectors() {
        for (let i = 0; i < this.tag_selectors.length; i++){
            this.tag_selectors[i]['include'].show();
            this.tag_selectors[i]['exclude'].show();
        } 

    }
    add_selectors() {
        let selectors = {}
        selectors['include'] = new Tag_selector(this.user_tags,this.tags);
        selectors['exclude'] = new Tag_selector(this.user_tags,this.tags);
        this.tag_selectors.push(selectors)
        this.update_start_game_page()
    }

    new_game() {
        
        this.container.innerHTML = `
            <div id ='tag_selectors_container'></div>   
            <div button class="btn btn-primary" id = 'add-tag-selectors-btn' <h1> start game </h1></button> </div>      
            <div class="alert alert-primary" style="padding:10px">                                  
            <div style="text-align: center" > <button class="btn btn-primary game-control" id = 'start-game-btn'><h1> start game </h1></button> </div>
            </div>`  

        this.add_selectors()
          
        this.container.querySelector('#start-game-btn').onclick = function () { game.start() };
        this.container.querySelector('#add-tag-selectors-btn').onclick = function () { game.add_selectors() };
        this.update_start_game_page()
    }
 /*
    new_game() {
        let tags_list_body = "<div class=columns-container>";
        if (this.user_tags.length > 0){
            tags_list_body += "<div class=column-in-container> "
            tags_list_body+= this.get_tags_html(this.user_tags, 'user_tags','Personal tags') + '</div>';
        }

        tags_list_body += "<div class=column-in-container>" + this.get_tags_html(this.tags,'tags','Common tags') + '</div></div>';
        
        this.container.innerHTML = `
                                    <div class="alert alert-primary" id="lable-cards-count" > <h1>Number of cards in game</h1></div> 
                                    <div>                                   
                                    ${tags_list_body}  
                                    <div class="alert alert-primary" style="padding:10px">                                  
                                    <div style="text-align: center" > <button class="btn btn-primary game-control" id = 'start-game-btn'><h1> start game </h1></button> </div>
                                    </div>
                                    </div>`

    
        this.container.querySelector('#start-game-btn').onclick = function () { game.start() };

        const tag_pickers = this.container.querySelectorAll(".tag-picker");        
        for (let i = 0; i < tag_pickers.length; i++) {
            tag_pickers[i].onchange = function (e) {
                game.update_start_game_page()
            }     
        }

        this.update_start_game_page()
    }
    */

    update_start_game_page(){

        //create containers for selectors
        let tag_selectors_html ='';
        for (let i=0;i<this.tag_selectors.length;i++){
            tag_selectors_html+= `<div class="row" >
                                 <div class=" col" id='tag_selector_incl_${i}'></div>
                                 <div class=" col" id='tag_selector_excl_${i}'></div>
                                 </div>`
            }
        const tag_selectors_container = this.container.querySelector('#tag_selectors_container');
        tag_selectors_container.innerHTML = tag_selectors_html;
       //assign containers to selectors
       for (let i=0;i<this.tag_selectors.length;i++){
            this.tag_selectors[i]['include'].set_container(tag_selectors_container.querySelector('#tag_selector_incl_'+i));
            this.tag_selectors[i]['exclude'].set_container(tag_selectors_container.querySelector('#tag_selector_excl_'+i));
            }
        //finnaly show selectors
        this.show_selectors();
        
        this.selected_tags = this.get_selected_tags();        

                fetch('../get_cards', {
                    method: 'POST',
                    body: JSON.stringify({
                        filter: this.selected_tags
                    })
                }
                )
                    .then(response => response.json())
                    .then(result => {
                        const card_count = result.cards.order.length;
                        const lable = this.container.querySelector("#lable-cards-count")
                        if (lable != null) {
                            if (card_count == 0) {
                                if (this.selected_tags.tags_exclude.length > 0 || this.selected_tags.tags_include.length > 0) {
                                    lable.innerHTML = `<h1>No cards found</h1>`
                                    lable.className = "alert alert-warning"
                                }
                                else {
                                    lable.innerHTML = `<h1>Select cards</h1>`
                                    lable.className = "alert alert-primary"
                                }
                            }
                            else {
                                lable.innerHTML = `<h1>Selected ${card_count} cards</h1>`
                                lable.className = "alert alert-primary"
                            }
                        }
                    })
    }
   

    get_selected_tags() {
        const tags = this.container.querySelectorAll(".tag-picker");
        let tags_include = [];
        let tags_exclude = [];

        for (let i = 0; i < tags.length; i++) {
            if (tags[i].checked) {
                switch (tags[i].getAttribute('value')) {
                    case '-1': tags_exclude.push(Number(tags[i].getAttribute('tag_id')));
                    case '1': tags_include.push(Number(tags[i].getAttribute('tag_id')));
                }
            }
        }       

        return { "tags_include": tags_include, "tags_exclude": tags_exclude }
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
        this.active_card_container = this.container.querySelector('#current_card');

        //assumming that "game" is global variable, need to find a way to avoid this.
        this.container.querySelector('#show-prev-card-btn').onclick = function () { game.show_new_card('left') };
        this.container.querySelector('#show-next-card-btn').onclick = function () { game.show_new_card('right') };
        this.container.querySelector('#reverse-card-btn').onclick = function () { game.active_card_obj.reverse() };
        //Перехватываем события
        this.container.addEventListener("touchstart", function (e) { game.TouchStart(e); }); //Начало касания
        this.container.addEventListener("touchmove", function (e) { game.TouchMove(e); }); //Движение пальцем по экрану
        //Пользователь отпустил экран
        this.container.addEventListener("touchend", function (e) { game.TouchEnd(e); });
        //Отмена касания
        this.container.addEventListener("touchcancel", function (e) { game.TouchEnd(e); });
        
        fetch('../get_cards', {
            method: 'POST',
            body: JSON.stringify({
                filter: this.selected_tags
            })
        }
        )
            .then(response => response.json())
            .then(result => {                
                this.card_set = new Card_set(result.cards, result.tags);
                this.update_game()
            })
    }

    show_new_card(direction) {       
        
        let onAnimationend = function () {
            let increment = direction == 'right' ? +1:-1;
            game.card_set.change_card(increment);
            game.update_game();            
            game.active_card_obj.move('in', direction);
        };

        this.active_card_obj.move('out', direction, onAnimationend);
    }

    update_game() {
        const card_set = this.card_set;
        if (card_set.cards_count() == 0) {
            this.container.innerHTML = `<div class="alert alert-danger" role="alert">
                                           <h1>Card set is empty</h1>
                                     </div>

                                     <form action="/Cards/game/">   
                                        <div style="text-align: center; padding:10px"> 
                                             <input type="submit" class="btn btn-primary game-control" value = "Start new game"></input>
                                        </div>
                                     </form>
                                     `
        }
        else {
            this.container.querySelector('#show-prev-card-btn').disabled = (card_set.get_current_card_number() <= 0);
            this.container.querySelector('#show-next-card-btn').disabled = (card_set.get_current_card_number() >= card_set.cards_count() - 1);
      
            this.new_active_card_obj().show();                     
        }
    }

    new_active_card_obj(){
        this.active_card_obj = this.card_set.get_card(this.card_set.get_current_card_number(), this.active_card_container)
        return this.active_card_obj;
    }

    TouchStart(e) {
        //Получаем текущую позицию касания
        this.touchStart = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        this.touchPosition = { x: this.touchStart.x, y: this.touchStart.y };
    }

    TouchMove(e) {
        //Получаем новую позицию
        this.touchPosition = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }

    TouchEnd(e) {

        this.CheckAction(); //Определяем, какой жест совершил пользователь

        //Очищаем позиции
        this.touchStart = null;
        this.touchPosition = null;
    }

    CheckAction() {
        const sensitivity = 20;
        var d = //Получаем расстояния от начальной до конечной точек по обеим осям
        {
            x: this.touchStart.x - this.touchPosition.x,
            y: this.touchStart.y - this.touchPosition.y
        };
       
        if (Math.abs(d.x) > Math.abs(d.y)) //Проверяем, движение по какой оси было длиннее
        {
            if (Math.abs(d.x) > sensitivity) //Проверяем, было ли движение достаточно длинным
            {
                if (d.x > 0) //Если значение больше нуля, значит пользователь двигал пальцем справа налево
                {
                    console.log("Swipe Left");
                    this.show_new_card('left');
                }
                else //Иначе он двигал им слева направо
                {
                    console.log("Swipe Right");
                    this.show_new_card('right');
                }
            }
        }
        else //Аналогичные проверки для вертикальной оси
        {
            if (Math.abs(d.y) > sensitivity) {
                if (d.y > 0) //Свайп вверх
                {
                    console.log("Swipe up");
                }
                else //Свайп вниз
                {
                    console.log("Swipe down");
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    game = new Game(document.querySelector('#game_container'));
})





