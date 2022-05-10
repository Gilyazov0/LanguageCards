import {Card_set, Tag_selector, LableSetting, Tag_selector_set, Widget, State, Timer,Settings, SelectInput, BooleanInput, NumericInput} from './card_set.js'

function generateRandomInteger(max) {
    return Math.floor(Math.random() * max) + 1;
}


class Abstract_game extends Widget{
    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner, container)
        
        this.card_set = undefined;
        this.tags = tags; //[{'name':name,'id': id},{}...]
        this.user_tags = user_tags;//[{'name':name,'id': id},{}...]
        this.FAs = FAs;//[FA1_name,FA2_name...]
        this.name = 'Abstract game'
            
        this.back_attributes = undefined;

        this.wrong_answers = 0;
        this.right_answers = 0;
        this.user_answers = {};//{answer_key: Is_right}

        this.settings = new Settings(this, undefined)
        this.settings.add_setting(new SelectInput(this,this.FAs[0],'Front side:', this.FAs),'front_attribute');
        this.settings.add_setting(new NumericInput(this,30,'Answer time:'),'answer_time');

        let captions = {'include':'Add cards with tags:','exclude':'except cards with tags:'}
        this.settings.add_setting(new Tag_selector_set(this, undefined, this.user_tags, this.tags, captions),'tag_selectors_set');
        this.settings.tag_selectors_set.onChange = function(){ this._update_settings_page() }.bind(this);
   
        
        this.display_timer = false;
        this.timer = new Timer(this,this.settings.answer_time.value,'1.5rem'); 
        this.timer.onChange = this._timer_change.bind(this);
        this.sounds = {} //{'path': Audio('path')}
  
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
        if (this._state.is_in_state(State.settings)) return this._show_settings()
        else if (this._state.is_in_state(State.game)) return this._show_game()
        else throw new Error('Unknown state'); 
    }

    start(){
        this.user_answers = {}
        this.wrong_answers = 0;
        this.right_answers = 0;
        this._set_state(State.game, true)
        this.show()        
    }

    get_selected_tags() {
        return this.settings.tag_selectors_set.value;        
    }

    _play_sound(path){
        if (!this.sounds[path])
            this.sounds[path] = new Audio(path);
        this.sounds[path].play();
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
        this.settings.set_container(this.container.querySelector('#settings_container'))
        this.settings.show()
        
        this.container.querySelector('#start-game-btn').onclick = function (e) { this.start()}.bind(this);
       
        this._update_settings_page()
        
        return true;
    }

    _show_game(){     

        fetch('/Cards/get_cards', {
            method: 'POST',
            body: JSON.stringify({
                tag_filter: this.get_selected_tags()
            })        }
        )
            .then(response => response.json())
            .then(result => {                
                this.card_set = new Card_set(this, result.cards, result.tags, [this.settings.front_attribute.value], this.back_attributes);
                this._update_game_page()
            })
        return true;
    }

    _check_answer(){
   
    }

    _timer_change(timer,event){
        if (this.timer.state == State.stopped) this._check_answer()
    }
   
    _get_current_answer_key(){
        return undefined
    }

    _is_answered(answer_key = undefined){
        let new_answer_key = answer_key;
        if (new_answer_key == undefined) new_answer_key = this._get_current_answer_key() 
        return (this.user_answers[new_answer_key] !==undefined)     
    }

    _save_answer(is_right,answer){
        if(is_right) this.right_answers++;
        else this.wrong_answers++;

        this.user_answers[this._get_current_answer_key()] ={'is_right':is_right,'answer':answer};
    }

    _update_selected_settings(){
        
        let back_attributes = [...this.FAs];
        const front_attribute = this.settings.front_attribute.value;
        this.back_attributes = back_attributes.filter((value)=>{return value !=front_attribute});

        if (this.settings.answer_time.value) {
            this.timer.reset(this.settings.answer_time.value)
        };
    }

    _getHTML(){    

        if (this._state.is_in_state(State.settings)) return this._getHTML_settings()
        else if (this._state.is_in_state(State.game)) return this._getHTML_game()
        else throw new Error('Unknown state'); 
  
    }

    _getHTML_settings(){
        let result = ''
        result = ` 
            <div class="alert alert-primary" id="lable-cards-count" >
                <h1>Number of cards in game</h1>
            </div>
            <div id="settings_container"> </div>
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

    _update_settings_page() {
       
        fetch('/Cards/get_cards_count', {
            method: 'POST',
            body: JSON.stringify({
                tag_filter: this.get_selected_tags()
            })
        }
        )
            .then(response => response.json())
            .then(result => {
                const card_count = result.cards_count;
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
        if (this.display_timer && !this._state.is_in_state(State.results)){   
            if (!this._is_answered()){
                this.timer.reset();
                this.timer.start();
            } else if (this.timer.state != State.disabled) this.timer.stop()
        };
    }
}

class Simple_game extends Abstract_game {
     
    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner,tags,user_tags,FAs,container=undefined)        
       
        this.active_card_obj = undefined;       
        this.active_card_container = undefined; //DOM элемент содержащий текущую карту        
        this.name = 'Simple game'   
        this.settings.add_setting(new BooleanInput(this,true,'Show score:'),'display_score');        

    }     
    
    _show_game(){      

        this.active_card_container = this.container.querySelector('#current_card');
     
        this.container.querySelector('#show-prev-card-btn').onclick = this._show_new_card.bind(this,'left') ;
        this.container.querySelector('#show-next-card-btn').onclick = this._show_new_card.bind(this,'right');
        this.container.querySelector('#reverse-card-btn').onclick = function () {this.active_card_obj.reverse(true);}.bind(this);
        this.container.querySelector('#results_right').onclick = this._show_results.bind(this,'results_right')
        this.container.querySelector('#results_wrong').onclick = this._show_results.bind(this,'results_wrong')
        
        this._activate_swipes()

        if (this.display_timer){
            let timer_container = this.container.querySelector("#timer_container")
            this.timer.set_container(timer_container)
            this.timer.start()
        }
   
        return super._show_game();      
    } 

    _show_results(right_or_wrong='results_right'){
        if (this._state !=State[right_or_wrong]){ 
            this._state = State[right_or_wrong];
            this.timer.disable();
        } else {
            this._state = State.game;  
        }
        this._update_game_page();
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
        <div class = "game-control-bar">
            <div id="score" style="display:none">
                <div id = "results_right" class="score_badge badge-success"><h2>12</h2></div>
                <div id = "results_wrong" class="score_badge badge-danger"><h2>11</h2></div>
                <div class ='flex-grow-1'> </div>
            </div>
            <div class = ""><div id = "timer_container" class="col-auto-1"> </div></div>
        </div>
        <div id = "current_card"></div>
        <div id ="game_results_controls" class = "game-control-bar"> <a id ="get_result_cards" target="_blank" href="-">constant link to this cards</a> </div>
        <div id ="game_results">
        </div>
        <div id ="game_controls">
            <div id = "aditional_controls"> </div>
            <div id = "simple_game_controls" class = "game-control-bar">    
                <button class="btn btn-primary game-control" id="show-prev-card-btn" ><h1><i class="bi bi-arrow-left"></i> </h1></button>
                <button class="btn btn-primary game-control " id="reverse-card-btn" ><h1><i class="bi bi-arrow-repeat"></i> </h1></button>
                <button class="btn btn-primary game-control" id="show-next-card-btn"  ><h1><i class="bi bi-arrow-right"></i></h1></button>
           </div>
        </div>
        </div>`;

        const loading =  `<div id="loading"><div class="alert alert-primary" role="alert"> <h1>Loading... Продам гараж </h1> </div></div>`

        return loading + error_message + game
    }  
     
    _update_game_page(show_card = true) {
        const card_set = this.card_set;
        const empty_card_set = this.container.querySelector('#empty_card_set')
        const full_card_set = this.container.querySelector('#full_card_set')
        this.container.querySelector('#loading').style.display = 'none' 
        const score = this.container.querySelector('#score')
        if (this.settings.display_score.value){
            score.style.display = 'flex'
            score.querySelector('#results_wrong').innerHTML = this.wrong_answers;
            score.querySelector('#results_right').innerHTML = this.right_answers;
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
      
            if(show_card) this._new_active_card_obj().show();                     
        }

        this._show_game_or_results()

        super._update_game_page();
     }

    //show game results or game itself 
    _show_game_or_results(){
        let game_elements = ['current_card','game_controls'];
        let result_elements = ['game_results','game_results_controls'];
        let game_elements_state = 'block'
        let result_elements_state = 'none'
        

        if (this.state.is_in_state(State.results)){
            game_elements_state = 'none'
            result_elements_state = 'block'
        }

        for (let i=0;i<game_elements.length;i++){
            this.container.querySelector(`#${game_elements[i]}`).style.display = game_elements_state;  
        }

        for (let i=0;i<result_elements.length;i++){
            this.container.querySelector(`#${result_elements[i]}`).style.display = result_elements_state;  
        }
        this.container.querySelector("#results_right").classList.remove('border','border-white','border-lg')
        this.container.querySelector("#results_wrong").classList.remove('border','border-white','border-lg')
        if (this.state.is_in_state(State.results)){
            this.container.querySelector("#"+this.state.name).classList.add('border','border-white','border-lg')

            let container = this.container.querySelector("#game_results")
            container.innerHTML ='';
            let CardIDS=''
            for (let i=0;i<this.card_set.cards_count();i++){
                
                let card_container = document.createElement("div")
                let card = this.card_set.get_card(i,card_container);
                if (!this._is_answered(card.get_id())) continue;
                let answer_is_right = this.user_answers[card.get_id()].is_right;
                if (answer_is_right && this._state.is_in_state(State.results_right)||
                    !answer_is_right && this._state.is_in_state(State.results_wrong))
                   {
                        container.appendChild(card_container)
                        card.show();
                        CardIDS = CardIDS+'&id='+card.get_id()
                   }
            }
            const url = `/Cards/card_list/?FA=${this.settings.front_attribute.value}${CardIDS}`
            this.container.querySelector("#get_result_cards").setAttribute("href", url);

        }
        
     }

    _show_new_card(direction) {       
        this.timer.disable();

        let onAnimationend = function () {
            let increment = direction == 'right' ? +1:-1;
           
            this.card_set.change_card(increment);
            this._update_game_page();            
            this.active_card_obj.move('in', direction);
        }.bind(this);

        this.active_card_obj.move('out', direction, onAnimationend);
    }

    _get_current_answer_key(){
        return this.active_card_obj?.get_id()
    }

    _new_active_card_obj(){
        this.active_card_obj = this.card_set.get_card(this.card_set.get_current_card_number(), this.active_card_container)
        this.active_card_obj.onReverse = this._on_card_reverse.bind(this)
        return this.active_card_obj;
    }

    _on_card_reverse(){
    }
 
    _swipe_left(){
        this._show_new_card('left');
    }
    
    _swipe_right(){
        this._show_new_card('right');
    }
}

class Simple_score_game extends Simple_game {

    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner,tags,user_tags,FAs,container=undefined)        
             
        this.name = 'Simple score game'  
        this.answer = undefined;
        this.settings.answer_time.visible = false;
    }    

    _show_game(){

        if(this.settings.display_score.value) {
            let aditional_controls = this.container.querySelector("#aditional_controls");
            aditional_controls.innerHTML = this._getHTML_simple_score_game_controls();
            
            this.container.querySelector("#right_btn").onclick = function(){
                this.answer = true;
                this._check_answer()
            }.bind(this);
            this.container.querySelector("#wrong_btn").onclick = function(){
                this.answer = false;
                this._check_answer()
            }.bind(this);
        }      
               
        return super._show_game();
    }  

    _check_answer(){

        if (this._is_answered()) return

        this._save_answer(this.answer,this.answer)
 
        if (this.active_card_obj.is_front_side) 
            this.active_card_obj.reverse()
       this._update_game_page(false); 
    }
    
    _getHTML_simple_score_game_controls(){
       
        return `<div class="game-control-bar mb-3">
                    <div class="col-auto-1 flex-grow-1 mr-1">
                        <button id="wrong_btn" class="form-control btn btn-danger">I don't know</button>
                    </div>
                    <div class="col-auto-1 flex-grow-1 mr-1">
                        <button id="right_btn" class="form-control btn btn-success">I know</button>
                    </div>
                </div>`
    }
}

class Variants_game extends Simple_game {
    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner,tags,user_tags,FAs,container)        
        this.name = 'Variants game'   
        this.settings.display_score.value = true;
        this.display_timer = true;
        this.settings.answer_time.value = 60;

        this.variants_card_set = undefined;
        this.answer_variants = undefined;//{card_id:[sting]}
        this.answer = undefined;
        this.answer_variants = undefined;

        this.settings.display_score.override_value = true;
        this.settings.display_score.visible = false;

        this.settings.add_setting(new NumericInput(this,4,'Number of variants:'),'number_of_variants');

        this.settings.add_setting(new SelectInput(this,this.FAs[1],'Answer type:', this.FAs),'answer_attribute');
    
        this.settings.add_setting(new LableSetting(this,'Select cards to pick answers from'),'variants_tag_selector_lable');
    
        let captions = {'include':'Add cards with tags:','exclude':'except cards with tags:'}
        this.settings.add_setting(new Tag_selector_set(this, undefined, this.user_tags, this.tags, captions),'variants_tag_selector');
    
    } 

    _show_game(){     

        let aditional_controls = this.container.querySelector("#aditional_controls")
        aditional_controls.innerHTML = this._getHTML_variants_game_controls()

        for (let i=0;i<this.settings.number_of_variants.value;i++){
            this.container.querySelector(`#answer_button_${i}`).onclick =
            function(event){
                this.answer = event.target.innerHTML; 
                this._check_answer();

                }.bind(this);
        }
 
        fetch('/Cards/get_cards', {
            method: 'POST',
            body: JSON.stringify({
                tag_filter: this.settings.variants_tag_selector.value
            })        }
        )
            .then(response => response.json())
            .then(result => {                
                this.variants_card_set = new Card_set(this, result.cards, result.tags, [this.settings.front_attribute.value], this.back_attributes);
                this._update_game_page()
            })
        return super._show_game();
    }

    _create_answer_variants(){

        let _get_random_variant = function() {
            let variant = undefined;
            //10 attempts max to find card with definded attribute to avoid 
            for (let i=0;i<10;i++){  
                let variant_id = this.variants_card_set.order[
                generateRandomInteger(this.variants_card_set.order.length)-1];
                variant = this.variants_card_set.get_card_FA_value(variant_id,this.settings.answer_attribute.value)
                if (variant) break
            }
            return variant;
        }.bind(this);

        this.answer_variants = {};
        
        for (let id in  this.card_set.cards){
            this.answer_variants[id] = [];
            for (let i=0; i<this.settings.number_of_variants.value-1;i++){
                let variant = _get_random_variant();
                this.answer_variants[id].push(variant);
            }
            let right_variant_place = generateRandomInteger(this.settings.number_of_variants.value)-1; 
            let right_variant =  this.card_set.get_card_FA_value(id,this.settings.answer_attribute.value)
            this.answer_variants[id].splice(right_variant_place, 0, right_variant);
        }
    }

    start(){
        this.answer_variants = undefined;
        super.start()
    }

    _update_answer_buttons(){
        for (let i=0;i<this.settings.number_of_variants.value;i++){
            let button = this.container.querySelector(`#answer_button_${i}`);
            button.value = this.answer_variants[this.active_card_obj.get_id()][i];
            button.innerHTML = button.value;
            button.classList.replace('btn-success','btn-primary');
            button.classList.replace('btn-danger', 'btn-primary');
        }
        if (this._is_answered()){
            this.answer = this.user_answers[this._get_current_answer_key()].answer;
            this._check_answer();
        }
    }

    _update_game_page(show_card = true){
        if (!this.card_set||!this.variants_card_set) return;
        if (!this.answer_variants) this._create_answer_variants()
        
        super._update_game_page(show_card);

        if (show_card) this._update_answer_buttons()

    }

    _getHTML_variants_game_controls(){
        let result ='';
        for (let i=0;i<this.settings.number_of_variants.value;i+=2){
            let variant2 ='';
            if (i<this.settings.number_of_variants.value-1) {variant2 =`
                <div style="width:calc(50% - 5px)">
                    <button id="answer_button_${i+1}" class="form-control btn btn-primary">answer</button>
                </div>`
            }
            result += `<div class="game-control-bar mb-3">
                            <div style="width:calc(50% - 5px)">
                                    <button id="answer_button_${i}" class="form-control btn btn-primary">answer</button>
                            </div>
                                ${variant2}
                       </div>`   
        }
        return result
    }

    _check_answer(){

        let is_right = false;
        let right_answer = this.active_card_obj.get_FA_value(this.settings.answer_attribute.value);
        if (this.answer == right_answer)          
            is_right = true;           
        else 
            is_right = false; 
           
    
        for (let i=0;i<this.settings.number_of_variants.value;i++){
            let button = this.container.querySelector(`#answer_button_${i}`);
            if (button.value == right_answer) 
                button.classList.replace('btn-primary','btn-success')
            if (button.value == this.answer && !is_right) 
                button.classList.replace('btn-primary','btn-danger')
        }
   
        if (this._is_answered()) return

        if(is_right)
        this._play_sound('/static/Cards/sounds/answer right.mp3')

        this._save_answer(is_right,this.answer)

        if (this.active_card_obj.is_front_side) 
            this.active_card_obj.reverse()
        this._update_game_page(false); 
    }

    _on_card_reverse(){
        this.answer = undefined
        this._check_answer()       
    }
}

class Print_game extends Simple_game {
     
    constructor(owner,tags,user_tags,FAs,container=undefined) {
        super(owner,tags,user_tags,FAs,container)        
        this.settings.add_setting(new SelectInput(this,this.FAs[1],'Answer type:', this.FAs),'answer_attribute');
        
        this.settings.display_score.override_value = true;
        this.settings.display_score.visible = false;

    
    
        this.name = 'Print game'   
        this.settings.display_score.value = true;
        this.display_timer = true;
        this.settings.answer_time.value = 60;
    } 

    _getHTML_print_game_controls(){
        return `<div class="game-control-bar mb-3">
                    <div class="col-auto-1 flex-grow-1 mr-1">
                         <input id="answer" placeholder="${this.settings.answer_attribute.value}" class="form-control" 
                         type="text" required autofocus>
                    </div>
                    <div class="col-auto-1">
                        <button id="answer_button" class="form-control btn btn-primary">answer</button>
                    </div>
                </div>`
    }

    _check_answer(){

        if (this._is_answered()) return

        let answer = this.container.querySelector("#answer")
        let is_right = false;
        if (answer.value.toLowerCase() == this.active_card_obj.get_FA_value(this.settings.answer_attribute.value)?.toLowerCase())          
            is_right = true;           
        else 
            is_right = false; 
           
        this._save_answer(is_right,answer.value)
 
        if (this.active_card_obj.is_front_side) 
            this.active_card_obj.reverse()
       this._update_game_page(false); 
    }

    _show_new_card(direction) {  
        let answer = this.container.querySelector("#answer")
        answer.value = ''
        super._show_new_card(direction);
    }

    _on_card_reverse(){
        this._check_answer()       
    }

    _show_game(){
        let aditional_controls = this.container.querySelector("#aditional_controls")
        aditional_controls.innerHTML = this._getHTML_print_game_controls()
        let answer_button = this.container.querySelector("#answer_button")
        answer_button.onclick = this._check_answer.bind(this);
        let answer = this.container.querySelector("#answer")
        answer.onkeyup = function(event){
            if(event.key === 'Enter') 
                this._check_answer();
            }.bind(this) 
        return super._show_game();
    } 

}    

class MetaGame extends Widget{
    constructor(container) {
        super(undefined,container)            
        this._state = State.settings;
        this.settings = new Settings(this)
        this._do_not_save.push('active_game')
        
         
        fetch('/Cards/get_metadata', {
            method: 'POST',
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(result => {
                const tags = result.tags;
                const user_tags = result.user_tags;
                const FAs = result.FAs;
                this.games = [new Variants_game(this,tags,user_tags,FAs), new Simple_score_game(this,tags,user_tags,FAs),new Print_game(this,tags,user_tags,FAs) ]
                let game_list = []
                for (let i = 0; i<this.games.length;i++)  {
                    this.games[i].onChange = this._on_game_change.bind(this)
                    this.settings.agrigate( this.games[i].settings)
                    game_list.push(this.games[i].name)
                } 
                
                this.settings.add_setting(new SelectInput(this,this.games[0].name,'Select game type:',game_list),"game_type")
                this.settings.game_type.onChange = this._select_game.bind(this)
                
                this.active_game = this.games[0]; 
                fetch('/Cards/get_game_settings/', {
                    method: 'POST',
                    body: JSON.stringify({ 'name': 'last used' })
                })
                    .then(response => response.json())
                    .then(result => {
                        this.settings.load_from_JSON(JSON.parse(result.settings))
                        this.active_game.settings.load(this.settings)
                        this._select_game()
                        this.new_game()
                    })                              
            })          
        
    }

    new_game() {
        this._state = State.settings
        this.show()
    }    

    _on_game_change(){
        this._state = this.active_game.state
        this.settings.agrigate(this.active_game.settings)
        
        this.show()

        fetch('/Cards/save_game_settings/', {
            method: 'POST',
            body: JSON.stringify({'name':'last used', 'value': JSON.stringify(this.settings.save_to_JSON())})
        })
    }

    show() {
        if (!super.show()) return false;
        
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
        // let game_selector = this.container.querySelector('#game_selector');
        // game_selector.onchange = function(e){
        //     const index = Number(e.target.value);
        //     this._select_game(index)
        //     }.bind(this);
        this.settings.set_container(this.container.querySelector('#meta_game_settings'))
        this.settings.show()
    }

    _getHTML() {

        let result = '<div id="meta_game_settings" style="padding:5px"></div><div id="game_container" style="padding:5px"></div>'
        if (this._state == State.game) return result

        // let game_selector = `
        //     <div class="form-group  group-gp" style="padding:5px"> 
        //         <label class="form-control-lg label-gp">Select game type:</label>
        //         <select id ="game_selector" class="form-control-lg form-select-lg input-gp flex-grow-1">
        //        `
        // for (let i = 0; i < this.games.length; i++) {           
        //     let is_selected = this.active_game.name == this.games[i].name? 'selected':'';
        //     game_selector += `<option ${is_selected} value='${i}'>${this.games[i].name} </option>`
        // }
        // game_selector += '</select></div>'
        
       //result = game_selector  + result;
        return result
     }

     _select_game() {
        const game_type = this.settings.game_type.value;
        this.games.forEach(game => {
            if (game.name == game_type ){
                this.settings.agrigate(this.active_game.settings)
                this.active_game = game
                this.active_game.set_container(this.container.querySelector('#game_container'));
                this.active_game.settings.load(this.settings);
                this.active_game.state = State.settings ;                     

            }            
        });
        
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
State.get_or_create_state('results',State.game)
State.get_or_create_state('results_wrong',State.results)
State.get_or_create_state('results_right',State.results)

