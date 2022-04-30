import {Card_set,Card, Tag_selector,Tag_selector_set,Settings,find_nearest_obj, Widget, State} from './card_set.js'

//var game
var meta_game
var game

//assumming that "game" is global variable, need to find a way to avoid this (see start()).
class Game extends Widget {
    // методы класса
    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner, container)
        
        this.card_set = undefined;
        this.tags = tags; //[{'name':name,'id': id},{}...]
        this.user_tags = user_tags;//[{'name':name,'id': id},{}...]
        this.FAs = FAs;//[FA1_name,FA2_name...]
        this.selected_tags = undefined;
        this.active_card_obj = undefined;
        this.touchStart = null; //Точка начала касания
        this.touchStart = null; //Текущая позиция
        this.active_card_container = undefined; //DOM элемент содержащий текущую карту
        this.tag_selectors_set = undefined;
        this.settings = undefined; // Settings instance
        this.name = 'Simple game'
        let captions = {'include':'Add cards with tags:','exclude':'except cards with tags:'}
        this.tag_selectors_set =  new Tag_selector_set(this, this.user_tags, this.tags, captions); 
        this.front_attribute = undefined;        
        this.back_attributes = undefined;
        this._set_state(State.settings,false) 

    }   
    /**
    * @param {State} value 
    */
    set state(value) {         
        this._set_state(value, false)        
        this.show()
    }

    /**
    * @return {State}
    */
    get state(){
        return super.state
    }

     /**
     * 
     * @param {State} new_state 
     * @param {Boolean} throw_onChange 
     */
      _set_state(new_state, throw_onChange = false){
        if (this._state = State.settings) this._update_selected_settings()
        super._set_state(new_state, throw_onChange)
    }

    load_settings(settings){
        this.settings = settings
        this.tag_selectors_set.set_settings(settings.get('tag_selectors_set_stgs'))        
    }

    save_settings(){
        if (this.settings == undefined) this.settings = new Settings()
        this.settings.set('tag_selectors_set_stgs', this.tag_selectors_set.get_settings())
        return this.settings
    }
     
    show(){
        if (!super.show()) return false;
        switch(this._state){
            case State.settings: return this.show_settings()
            case State.game: return this.show_game()
            default: throw new Error('Unknown state');                
        }        
    }

    show_settings(){
        let ts_container =  this.container.querySelector('#tag_selectors_container');
        this.tag_selectors_set.set_container(ts_container)
        this.tag_selectors_set.show()
        
        this.tag_selectors_set.onChange = function(){ meta_game.active_game.update_settings_page() };
        
        this.container.querySelector('#start-game-btn').onclick = function (e) { find_nearest_obj(e.target).start()};
       
        this.update_settings_page()
    }
    start(){
        this._set_state(State.game, true)
        this.show()        
    }

    _update_selected_settings(){
        
        const FA_selector = this.container?.querySelector('#FA_selector')
        if (!FA_selector) return

        this.selected_tags = this.get_selected_tags();
        this.front_attribute = [this.container.querySelector('#FA_selector').value];
        
        let back_attributes = [...this.FAs];
        this.back_attributes = back_attributes.filter((value)=>{return value !=this.front_attribute[0]});
    }

    show_game(){      

        this.active_card_container = this.container.querySelector('#current_card');
     
        this.container.querySelector('#show-prev-card-btn').onclick = function (e) {find_nearest_obj(e.target).show_new_card('left') };
        this.container.querySelector('#show-next-card-btn').onclick = function (e) { find_nearest_obj(e.target).show_new_card('right') };
        this.container.querySelector('#reverse-card-btn').onclick = function (e) { find_nearest_obj(e.target).active_card_obj.reverse();};
        //Перехватываем события
        this.container.addEventListener("touchstart", function (e) { find_nearest_obj(e.target).TouchStart(e); }); //Начало касания
        this.container.addEventListener("touchmove", function (e) { find_nearest_obj(e.target).TouchMove(e); }); //Движение пальцем по экрану
        //Пользователь отпустил экран
        this.container.addEventListener("touchend", function (e) { find_nearest_obj(e.target).TouchEnd(e); });
        //Отмена касания
        this.container.addEventListener("touchcancel", function (e) { find_nearest_obj(e.target).TouchEnd(e); });

        fetch('../get_cards', {
            method: 'POST',
            body: JSON.stringify({
                tag_filter: this.selected_tags
            })
        }
        )
            .then(response => response.json())
            .then(result => {                
                this.card_set = new Card_set(this, result.cards, result.tags, this.front_attribute, this.back_attributes);
                this.update_game_page()
            })
    }

   
    _getHTML(){    
        switch(this._state){
            case State.settings: return this._getHTML_settings()
                          
            case State.game: return this._getHTML_game()

            default: throw new Error('Unknown state'); 
        }         
    }

    _getHTML_settings(){
        let result = ''

        let FA_selector = `
            <div> <label><h4>Front side:</h4> </label>
                <select id ="FA_selector" class="form-select form-select-sm">
                   `
        for (let i = 0; i < this.FAs.length; i++) {
            FA_selector += `<option value='${this.FAs[i]}'>${this.FAs[i]}</option>`
        }
        FA_selector += '</select></div>'
        this.container.style.padding = "5px";
        result = ` 
            <div class="alert alert-primary" id="lable-cards-count" >
                <h1>Number of cards in game</h1>
            </div>
            <div>${FA_selector}</div> 
            <div id ='tag_selectors_container'></div>                           
            <div class="alert alert-primary" style="padding:10px">                                  
                <div style="text-align: center" >
                    <button class="btn btn-primary game-control" id = 'start-game-btn'>
                        <h1> start game </h1>
                    </button> 
                </div>
            </div>` 

        return result                 
    }

    _getHTML_game(){

        const error_message = `
        <div id="empty_card_set" style="display:none">
            <div class="alert alert-danger" role="alert">
            <h1>Card set is empty</h1>
            </div>

            <form action="/Cards/game/">   
                <div style="text-align: center; padding:10px"> 
                    <input type="submit" class="btn btn-primary game-control" value = "Start new game"></input>
                </div>
            </form>
        </div>
        `

        const game = `
        <div id="full_card_set" style="display:none">
        <div id = 'current_card'></div>
        <div class = "game-control-bar">    
        <button class="btn btn-primary game-control" id="show-prev-card-btn" ><h1><i class="bi bi-arrow-left"></i> </h1></button>
        <button class="btn btn-primary game-control " id="reverse-card-btn" ><h1><i class="bi bi-arrow-repeat"></i> </h1></button>
        <button class="btn btn-primary game-control" id="show-next-card-btn"  ><h1><i class="bi bi-arrow-right"></i></h1></button>
        </div>
        </div>`;

        const loading =  `<div id="loading"><div class="alert alert-primary" role="alert"> <h1>Loading...</h1> </div></div>`

        return loading + error_message + game
    }
 
 
    update_settings_page(){
        
        this.selected_tags = this.get_selected_tags();        

                fetch('../get_cards', {
                    method: 'POST',
                    body: JSON.stringify({
                        tag_filter: this.selected_tags
                    })
                }
                )
                    .then(response => response.json())
                    .then(result => {
                        const card_count = result.cards.order.length;
                        const lable = this.container.querySelector("#lable-cards-count")
                        if (lable != null) {
                            if (card_count == 0) {
                                 lable.innerHTML = `<h1>No cards found</h1>`
                                 lable.className = "alert alert-warning"
                               }
                            else {
                                lable.innerHTML = `<h1>Selected ${card_count} cards</h1>`
                                lable.className = "alert alert-primary"
                            }
                        }
                    })
    }    

    get_selected_tags() {
        return this.tag_selectors_set.get_selected_tags();        
    }
  
    update_game_page() {
        const card_set = this.card_set;
        const empty_card_set = this.container.querySelector('#empty_card_set')
        const full_card_set = this.container.querySelector('#full_card_set')
        this.container.querySelector('#loading').style.display = 'none' 

        if (card_set.cards_count() == 0) {
            empty_card_set.style.display = 'block'
            full_card_set.style.display = 'none'                       
        }
        else {
            empty_card_set.style.display = 'none'
            full_card_set.style.display = 'block'      
            this.container.querySelector('#show-prev-card-btn').disabled = (card_set.get_current_card_number() <= 0);
            this.container.querySelector('#show-next-card-btn').disabled = (card_set.get_current_card_number() >= card_set.cards_count() - 1);
      
            this.new_active_card_obj().show();                     
        }
    }

    show_new_card(direction) {       
        
        let onAnimationend = function () {
            let increment = direction == 'right' ? +1:-1;
            let agame = meta_game.active_game;
            agame.card_set.change_card(increment);
            agame.update_game_page();            
            agame.active_card_obj.move('in', direction);
        };

        this.active_card_obj.move('out', direction, onAnimationend);
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

class MetaGame {
    constructor(container) {
        this.set_container(container)
        //for now 2 posible variants: 'new' and 'runing'
        this.game_state = 'new'
        fetch('../get_metadata', {
            method: 'POST',
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(result => {
                const tags = result.tags;
                const user_tags = result.user_tags;
                const FAs = result.FAs;
                this.games = [new Game(this,tags,user_tags,FAs), new Game(this,tags,user_tags,FAs)]
                this.active_game = this.games[0];
                game = this.active_game;
                this.new_game()
            })   
    }

    set_container(container){
        this.container = container;
        if (container != undefined) {
            this.container.obj = this;
        } 
    }

    new_game() {
        this.game_state = 'new'
        this.show()
    }    

    show() {
        this.container.innerHTML = this._getHTML();

        if (this.game_state == 'new') {
            let game_selector = this.container.querySelector('#game_selector');
            game_selector.onchange = (e)=>{
                const index = Number(e.target.value);
                find_nearest_obj(e.target)._select_game(index)
                } 
         }
        this.active_game.set_container(this.container.querySelector('#game_container'));
        if (this.game_state == 'new') this.active_game.state = State.settings
        else if (this.game_state == 'running')  this.active_game.state = State.game
    }

    _getHTML() {
        let result = '<div id="game_container"></div>'
        if (this.game_state == 'running') return result
        let game_selector = `
        <div> <label><h4>Select game:</h4> </label>
            <select id ="game_selector" class="form-select form-select-sm">
               `
        for (let i = 0; i < this.games.length; i++) {
            game_selector += `<option value='${i}'>${this.games[i].name}</option>`
        }
        game_selector += '</select></div>'
        
        result = game_selector + result;
        return result
     }

     _select_game(index) {
        let settings = this.active_game.save_settings()
        this.active_game = this.games[index]
        game = this.active_game;
        this.active_game.set_container(this.container.querySelector('#game_container'));
        this.active_game.load_settings(settings);    
        this.active_game.state = State.settings
     }
}

document.addEventListener('DOMContentLoaded', function () {
    meta_game = new MetaGame(document.querySelector('#meta_game_container'))
   // meta_game.new_game()

    document.querySelector('#new_game_btn').onclick = (e)=> {
        e.stopPropagation();
        e.preventDefault();
        meta_game.new_game()}
})


State.get_or_create_state('settings')
State.get_or_create_state('game')


