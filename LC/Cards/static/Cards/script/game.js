import {Card_set,Card, Tag_selector,Tag_selector_set,Settings, Widget, State, Timer} from './card_set.js'

class Abstract_game extends Widget{
    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner, container)
        
        this.card_set = undefined;
        this.tags = tags; //[{'name':name,'id': id},{}...]
        this.user_tags = user_tags;//[{'name':name,'id': id},{}...]
        this.FAs = FAs;//[FA1_name,FA2_name...]
        this.selected_tags = undefined;            
        this.tag_selectors_set = undefined;
        this.settings = undefined; // Settings instance
        this.name = 'Abstract game'
        let captions = {'include':'Add cards with tags:','exclude':'except cards with tags:'}
        this.tag_selectors_set =  new Tag_selector_set(this, this.user_tags, this.tags, captions); 
        this.front_attribute = undefined;        
        this.back_attributes = undefined;
        this.wrong_answers = 0;
        this.right_answers = 0;
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
    get state() {
        return super.state
    } 

    show(){
        if (!super.show()) return false;
        switch(this._state){
            case State.settings: return this._show_settings()
            case State.game: return this._show_game()
            default: throw new Error('Unknown state');                
        }        
    }

    start(){
        this.wrong_answers = 0;
        this.right_answers = 0;
        this._set_state(State.game, true)
        this.show()        
    }

    get_selected_tags() {
        return this.tag_selectors_set.get_selected_tags();        
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

          
    /**
    * 
    * @param {State} new_state 
    * @param {Boolean} throw_onChange 
    */
     _set_state(new_state, throw_onChange = false) {
        if (this._state = State.settings) this._update_selected_settings()
        super._set_state(new_state, throw_onChange)
    }
    _show_settings(){
        let ts_container =  this.container.querySelector('#tag_selectors_container');
        this.tag_selectors_set.set_container(ts_container)
        this.tag_selectors_set.show()
        
        this.tag_selectors_set.onChange = function(){ this._update_settings_page() }.bind(this);
        
        this.container.querySelector('#start-game-btn').onclick = function (e) { this.start()}.bind(this);
       
        this._update_settings_page()
        
        return true;
    }

    _show_game(){     

        fetch('../get_cards', {
            method: 'POST',
            body: JSON.stringify({
                tag_filter: this.selected_tags
            })        }
        )
            .then(response => response.json())
            .then(result => {                
                this.card_set = new Card_set(this, result.cards, result.tags, this.front_attribute, this.back_attributes);
                this._update_game_page()
            })
        return true;
    }

    _update_selected_settings(){
        
        const FA_selector = this.container?.querySelector('#FA_selector')
        if (!FA_selector) return

        this.selected_tags = this.get_selected_tags();
        this.front_attribute = [this.container.querySelector('#FA_selector').value];
        
        let back_attributes = [...this.FAs];
        this.back_attributes = back_attributes.filter((value)=>{return value !=this.front_attribute[0]});
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
                <label class="form-control-lg label-gp">Front side:</label>
                <select id ="FA_selector" class="form-control-lg form-select-lg input-gp flex-grow-1">
                `
        for (let i = 0; i < this.FAs.length; i++) {
            FA_selector += `<option value='${this.FAs[i]}'>${this.FAs[i]}</option>`
        }
        FA_selector += '</select></div>'
        //this.container.style.padding = "5px";
        result = ` 
            <div class="alert alert-primary" id="lable-cards-count" >
                <h1>Number of cards in game</h1>
            </div>
            <div>
                <div class="form-group  group-gp"> ${FA_selector}</div> 
                <div id='additional_settings'> </div>
            </div>
            <div id ='tag_selectors_container'></div>                           
            <div class="alert alert-primary" style="padding:10px">                                  
                <div style="text-align: center" >
                    <button class="btn btn-primary" id = 'start-game-btn'>
                        <h1> start game </h1>
                    </button> 
                </div>
            </div>` 

        return result                 
    }

    _getHTML_game(){
        return "<div>Game over</div>"
    }

    _update_settings_page(){
        
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

    _update_game_page() {        
    }


}

class Simple_game extends Abstract_game {
     
    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner,tags,user_tags,FAs,container=undefined)        
       
        this.active_card_obj = undefined;       
        this.active_card_container = undefined; //DOM элемент содержащий текущую карту        
        this.name = 'Simple game'   
        this.display_score = false;    
    }     
    
    _show_game(){      

        this.active_card_container = this.container.querySelector('#current_card');
     
        this.container.querySelector('#show-prev-card-btn').onclick = this._show_new_card.bind(this,'left') ;
        this.container.querySelector('#show-next-card-btn').onclick = this._show_new_card.bind(this,'right');
        this.container.querySelector('#reverse-card-btn').onclick = function () {this.active_card_obj.reverse();}.bind(this);
        this._activate_swipes()

        return super._show_game();      
    }

    _getHTML_game_blocks(){
        result = {}
        
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
        <div id="score" class = "game-control-bar" style="display:none">
            <h3>
                <span id = "right_answers" class="badge badge-success">12</span>
                <span id = "wrong_answers" class="badge badge-danger">11</span>
            </h3> 
         </div>
        <div id = "current_card"></div>
        <div id = "aditional_controls"> </div>
        <div class = "game-control-bar">    
        <button class="btn btn-primary game-control" id="show-prev-card-btn" ><h1><i class="bi bi-arrow-left"></i> </h1></button>
        <button class="btn btn-primary game-control " id="reverse-card-btn" ><h1><i class="bi bi-arrow-repeat"></i> </h1></button>
        <button class="btn btn-primary game-control" id="show-next-card-btn"  ><h1><i class="bi bi-arrow-right"></i></h1></button>
        </div>
        </div>`;

        const loading =  `<div id="loading"><div class="alert alert-primary" role="alert"> <h1>Loading... Продам гараж </h1> </div></div>`

        return loading + error_message + game
    }  
     
    _update_game_page() {
        const card_set = this.card_set;
        const empty_card_set = this.container.querySelector('#empty_card_set')
        const full_card_set = this.container.querySelector('#full_card_set')
        this.container.querySelector('#loading').style.display = 'none' 
        const score = this.container.querySelector('#score')
        if (this.display_score){
            score.style.display = 'block'
            score.querySelector('#wrong_answers').innerHTML = this.wrong_answers;
            score.querySelector('#right_answers').innerHTML = this.right_answers;
        }
        else score.style.display = 'none'

        if (card_set.cards_count() == 0) {
            empty_card_set.style.display = 'block'
            full_card_set.style.display = 'none'                       
        }
        else {
            empty_card_set.style.display = 'none'
            full_card_set.style.display = 'block'      
            this.container.querySelector('#show-prev-card-btn').disabled = (card_set.get_current_card_number() <= 0);
            this.container.querySelector('#show-next-card-btn').disabled = (card_set.get_current_card_number() >= card_set.cards_count() - 1);
      
            this._new_active_card_obj().show();                     
        }
    }

    _show_new_card(direction) {       
        
        let onAnimationend = function () {
            let increment = direction == 'right' ? +1:-1;
           
            this.card_set.change_card(increment);
            this._update_game_page();            
            this.active_card_obj.move('in', direction);
        }.bind(this);

        this.active_card_obj.move('out', direction, onAnimationend);
    }

    _new_active_card_obj(){
        this.active_card_obj = this.card_set.get_card(this.card_set.get_current_card_number(), this.active_card_container)
        return this.active_card_obj;
    }
 
    _swipe_left(){
        this._show_new_card('left');
    }
    
    _swipe_right(){
        this._show_new_card('right');
    }
}

class Print_game extends Simple_game {
     
    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner,tags,user_tags,FAs,container=undefined)        
        this.answer_attribute = 'На иврите'
        this.name = 'Print game'   
        this.answer_time = 60;   
        this.timer = new Timer(this,this.answer_time,'1.5rem') 
        this.display_score = true;
        this.user_answers = {};//{card_id: Is_right}
    } 
    start(){
        this.user_answers = {}
        super.start()
    }

    _show_settings(){
        super._show_settings();

      let answer_time = ` 
        <div class="form-group group-gp">
            <label class="form-control-lg label-gp" for="answer_time">Answer time:</label>
            <input id='answer_time' type="number" class="form-control-lg input-gp flex-grow-1" value=${this.answer_time} />           
        </div>`
        
        let answer_type = `
        <div class="form-group  group-gp"> <label class="form-control-lg label-gp">Answer type:</label>
            <select id ="answer_type" class="form-control-lg form-select form-select-lg input-gp flex-grow-1">
               `
        for (let i = 0; i < this.FAs.length; i++) {
            let selected = this.FAs[i] == this.answer_attribute? 'selected="selected"':''
             
            answer_type += `<option  ${selected} value='${this.FAs[i]}'>${this.FAs[i]}</option>`
        }   
        answer_type += '</select></div>'

        const additional_settings = this.container.querySelector('#additional_settings');
        additional_settings.innerHTML = answer_type + answer_time;
         
    }

    _update_selected_settings(){
        super._update_selected_settings()
 
        const answer_type = this.container?.querySelector('#answer_type')
        if (!answer_type) return
        this.answer_attribute = answer_type.value;

        const answer_time = this.container?.querySelector('#answer_time')
        this.answer_time = Number(answer_time.value);
       
        this.timer.reset(this.answer_time);
    }
 

    _getHTML_aditional_controls(){
        return `<div class="game-control-bar mb-3">
                    <div class="col-auto-1 flex-grow-1 mr-1">
                         <input id="answer" placeholder="${this.answer_attribute}" class="form-control" 
                         type="text" required autofocus>
                    </div>
                    <div class="col-auto-1">
                        <button id="answer_button" class="form-control btn btn-primary">answer</button>
                    </div>
                    <div id = "timer_container" class="col-auto-1">
                    </div>
                </div>`
    }
    _timer_change(timer,event){
        if (this.timer.state == State.stopped) this._check_answer()
    }

    _is_answered(){
        return (this.user_answers[this.active_card_obj?.get_id()] !==undefined)     
    }
    _check_answer(){

        if (this._is_answered()) return

        let answer = this.container.querySelector("#answer")
        let is_right = false;
        if (answer.value == this.active_card_obj.get_FA_value(this.answer_attribute)){
            is_right = true; 
            this.right_answers++;
        }
        else {
            is_right = false; 
            this.wrong_answers++
        }   
     
        this.user_answers[this.active_card_obj.get_id()] =is_right; 
 
        if (this.active_card_obj.is_front_side) this.active_card_obj.reverse()
        this._update_game_page(); 
    }

    _show_new_card(direction) {  
        this.timer.disable();
        let answer = this.container.querySelector("#answer")
        answer.value = ''
        super._show_new_card(direction);
    }

    _show_game(){
        let aditional_controls = this.container.querySelector("#aditional_controls")
        aditional_controls.innerHTML = this._getHTML_aditional_controls()
        let timer_container = this.container.querySelector("#timer_container")
        this.timer.set_container(timer_container)
        this.timer.start()
        this.timer.onChange = this._timer_change.bind(this)
        let answer_button = this.container.querySelector("#answer_button")
        answer_button.onclick = this._check_answer.bind(this);
        let answer = this.container.querySelector("#answer")
        answer.onchange = this._check_answer.bind(this);
        return super._show_game();
    } 

    _update_game_page() {
        super._update_game_page()
        if (!this._is_answered()){
            this.timer.reset();
            this.timer.start();
        } else if (this.timer.state != State.disabled) this.timer.stop();
        
    }
}    


class MetaGame extends Widget{
    constructor(container) {
        super(undefined,container)            
        this._state = State.settings;
        
        fetch('../get_metadata', {
            method: 'POST',
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(result => {
                const tags = result.tags;
                const user_tags = result.user_tags;
                const FAs = result.FAs;
                this.games = [new Print_game(this,tags,user_tags,FAs), new Simple_game(this,tags,user_tags,FAs)]
                this.active_game = this.games[0];               
                this.new_game()
            })   
    }

    new_game() {
        this._state = State.settings
        this.show()
    }    

    show() {
        if (!super.show()) return false;
        this.active_game.onChange = function() {
            this._state = this.active_game.state
            this.show()
        }.bind(this)

        this.active_game.set_container(this.container.querySelector('#game_container'));
        // this if needed to avoide several fetch requests from game
        if (!(this.active_game.state == State.game  && this._state == State.game)) 
            this.active_game.state = this._state;
        
        switch(this._state){
            case State.settings: return this._show_settings()
            case State.game: return true
            default: throw new Error('Unknown state');                
        }       
    }

    _show_settings(){
        let game_selector = this.container.querySelector('#game_selector');
        game_selector.onchange = function(e){
            const index = Number(e.target.value);
            this._select_game(index)
            }.bind(this);
    }

    _getHTML() {

        let result = '<div id="game_container" style="padding:5px"></div>'
        if (this._state == State.game) return result

        let game_selector = `
            <div style='padding:5px'> 
                <label class="form-control-lg label-gp">Select game type:</label>
                <select id ="game_selector" class="form-control-lg form-select-lg input-gp flex-grow-1">
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
        this.active_game.set_container(this.container.querySelector('#game_container'));
        this.active_game.load_settings(settings);    
        this.active_game.state = State.settings
     }
}

document.addEventListener('DOMContentLoaded', function () {
    const meta_game = new MetaGame(document.querySelector('#meta_game_container'))
    

    document.querySelector('#new_game_btn').onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        meta_game.new_game()}.bind(meta_game)
})


State.get_or_create_state('settings')
State.get_or_create_state('game')


