$(document).ready(function() { //jQuery библиотека скриптов на JS
    $(document).on('click', '.dropdown-menu', function (e) {
        if (e.target.classList.contains('keep_open')){
            e.stopPropagation();          
        }
    }); 
});

function OpenUrlInNewWindow(event){
    const element = event.target;
    const url = element.getAttribute("URL");
    window.open(url, '_blank').focus();
   }


export class Settings{
    constructor(){        
        this.settings = {}
    }

    get(name){
        return this.settings[name]
    }

    set(name, value){
        this.settings[name] = value
    }

    reset(){
        this.settings = {}
    }
}

/** used to specify internal state of objects 
 * @class
 */

export class State {

    static default = new State('default')
    /**
     * 
     * @param {string} name name of the state. Will be used ONLY to save State to  JSON    ToDo
     * @param {State} specified_state perent state wich is specify by this State. 
     *     For example State "Move" could be specified by "Run" or "Walk"
     */
    constructor(name, specified_state = undefined){
        this.specified_state = specified_state
        this.name = name
    }

    /**
     * 
     * @param {string} name 
     * @param {State} specified perent state wich is specify by this State. 
     *     For example State "Move" could be specified by "Run" or "Walk"
     * @returns 
     */

    static get_or_create_state(name, specified = State.default){
        if (Object.keys(State).find((value)=>{return value == name} ) )return State[name]
        State[name] = new State(name,specified)
    }

    /**
     * 
     * @param {State} state 
     * @returns {Boolean} True if this = state or specify state
     */
    is_in_state(state){
        return this == state || this.specify_state?.is_in_state(state)
    }
}
 
/** just able to save internal state into JSON and load it back
 * @class
 */
 export class Saveable{

    constructor(){
    }
    
    /**
     * loads this object form JSON
     * @param {JSON} objectJSON 
     */
    load_from_JSON(objectJSON)
    {
        for( let key in objectJSON){
            _load_attribute_to_JSON(key,objectJSON)
        }
    }

    /**
     * saves this object to JSON 
     * @returns {JSON}
     */
    save_to_JSON(){
        let result = {}   
        for (let key in this){
            if (this[key] instanceof Saveable){
                _save_attribute_to_JSON(key,result)
            }
        } 
        return result
    }

    /** loads one attribute 'attribute_name' from JSON
     * @protected
     * @param {string} attribute_name 
     * @param {JSON} objectJSON 
     */
    _load_attribute_to_JSON(attribute_name,objectJSON) {
        let attribute = this[attribute_name]
        if (attribute instanceof Saveable) {
            attribute.load_from_JSON(objectJSON[attribute_name])
        } 
        else {
            this[attribute_name] = objectJSON[attribute_name]   
        }    
    }    
  
    /** saves atribute 'attribute_name' to 
     * @protected
     * @param {string} attribute_name 
     * @param {JSON} objectJSON 
     */
    _save_attribute_to_JSON(attribute_name,objectJSON) {
        if (this[attribute_name] instanceof Saveable){
            let value = this[attribute_name].save_to_JSON()
            if (!isEmpty(value)) objectJSON[attribute_name] = value;
        } 
        else {
            objectJSON[attribute_name] = this[attribute_name]
        }
    }

}

/**  represents abstract Widget that 
*   - can show itself in container DOM element
*   - remeber its 'owner' - any object which owns the Wiget
*   - can generate event onChange when internal state changes
*   @class
*   @extends {Saveable}
*/  
export class Widget extends Saveable{

    static default = State.default

    /**
    * @constructor
    * @param {Object} owner
    * @param {HTMLElement} container  
    */
    constructor(owner,container = undefined){
        super()
        this.owner = owner
        this.set_container(container)
        this.onChange = undefined
        this._state = State.default;
        this.touchStart = null; //Точка начала касания
        this.touchStart = null; //Текущая позиция
    }

    /**
     * @return {State}
     */
    get state(){
        return this._state
    }

    /** @param {HTMLElement} container */
    set_container(container) {
        this.container = container;
        if (container != undefined) {
            this.container.obj = this;
        } 
    }
    /**
     * shows Widget inside container
     * @returns {boolean} ture - succesfully showed, false not
     */
    show(){
        if (this.container) {
            this.container.innerHTML = this._getHTML()
            return true
        } else return false
    }
    /**
     * 
     * @param {State} new_state 
     * @param {Boolean} throw_onChange 
     */
    _set_state(new_state, throw_onChange = false){
        const old_state = this.state;
        this._state = new_state;
        if (throw_onChange)
            this._change({'event_name':'state_change', 'old_state': old_state, 'new_state': new_state })
    }

    /**@protected*/
    _change(event){
        if (this.onChange) this.onChange(this,event)
    }

    /** 
    * @protected
    * @returns {string} html to display
    */
    _getHTML() {
        return ''
    }

    
    _TouchStart(e) {
        //Получаем текущую позицию касания
        this.touchStart = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        this.touchPosition = { x: this.touchStart.x, y: this.touchStart.y };
    }

    _TouchMove(e) {
        //Получаем новую позицию
        this.touchPosition = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }

    _TouchEnd(e) {

        this._CheckAction(); //Определяем, какой жест совершил пользователь

        //Очищаем позиции
        this.touchStart = null;
        this.touchPosition = null;
    }
    _activate_swipes(){
        //Перехватываем события
        this.container.ontouchstart = function (e) { this._TouchStart(e); }.bind(this); //Начало касания
        this.container.ontouchmove = function (e) { this._TouchMove(e); }.bind(this); //Движение пальцем по экрану
        //Пользователь отпустил экран
        this.container.ontouchend = function(e) { this._TouchEnd(e); }.bind(this);
        //Отмена касания
        this.container.ontouchcancel =  function (e) { this._TouchEnd(e); }.bind(this);
    }

    _swipe_left(){}
    
    _swipe_right(){}

    _swipe_up(){}

    _swipe_down(){}

    _CheckAction() {
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
                    this._swipe_left();
                
                else //Иначе он двигал им слева направо                
                    this._swipe_right();                  
            }
        }
        else //Аналогичные проверки для вертикальной оси
        {
            if (Math.abs(d.y) > sensitivity) {
                if (d.y > 0) //Свайп вверх
                    this._swipe_up();              
                else //Свайп вниз
                    this._swipe_down();
                
            }
        }
    }
}

/**  represents Timer  
*   - shows it current value 
*   - when started can change value from initial_time to zero with time
*   - generates event onChange when value becomes 0
*   @class
*   @extends {Widget}
*/  
export class Timer extends Widget{
 
    /**
    * @constructor
    * @param {Object} owner 
    * @param {HTMLElement} container 
    * @param {Number} initial_time initial number of secons 
    */
    constructor(owner,initial_time,container = undefined){
        super(owner,container)
        this.initial_time = initial_time;
        this.value = initial_time;
        this._set_state(State.stopped);
        this._start_time = undefined;
        this.interval = undefined;
    }

   
   /**
    * starts Timer
    */
    start(){
        this._set_state(State.running, true)
        this._start_time = new Date().getTime();
        this.interval = setInterval(this._tic.bind(this),1000)
    }

    /**
     * reset Timer doesn't change state 
     * @param {Number} initial_time 
     */

    reset(initial_time = undefined){
        if (initial_time) this.initial_time = initial_time;
        this.value = this.initial_time;
        this.show()
    }

    /**
     * stops Timer
     */
    stop(){
        clearInterval(this.interval)
        this._set_state(State.stopped,true);
        this.show();
    }

     /** @override */
    save_to_JSON(){
        let result = super.save_to_JSON(objectJSON) 

        this._save_attribute_to_JSON('initial_time',result)

        return result
    }

    /**
     * if ruuning updates Timers value
     */
    _tic(){
        if (this.state.is_in_state(State.running)){
            this.value = this.initial_time + Math.round((this._start_time - new Date().getTime())/1000);
            if(this.value <=0){
                this.value = 0;
                this.stop();
            }
            this.show();
        }
    }

     /**
     *  @override 
     */
    show(){              
        if (!super.show()) return false
        return true    
    }

     /** @override */
    _getHTML() {
        return `<div style='width:100px;height: 100%;display:flex;justify-content:center'> <h3><div style='width:4rem;height: 100%;' class="badge badge-primary">
        ${this.value}</div></h3></div>`
    }
         
}


export class Tag_selector extends Widget{

    constructor(owner, user_tags, tags, caption,container=undefined) {

        super(owner,container);
        this.tags = tags;//[{'name':name,'id': id},{}...]
        this.user_tags = user_tags;//[{'name':name,'id': id},{}...]
        this.selected_tags = []; //[tag.id, tag.id....]
        this.all_tags_dict = {} // {tag.id: {'name':name,'id': id}...} tags.id and user_tags.id do not intersect
        this.caption = caption;
        for(let i=0; i < this.tags.length;i++){
            this.tags[i]['type'] ='common';
            this.all_tags_dict[this.tags[i].id] = this.tags[i]
        }
        for(let i=0; i < this.user_tags.length;i++){
            this.user_tags[i]['type'] ='user';
            this.all_tags_dict[this.user_tags[i].id] = this.user_tags[i]
        }
    }

    show(){       
        if (!super.show()) return false
      
        this.container.style.marginBottom = '5px';
        
        this._update_selected_tags_dom()       
        this._show_selected_tags()       
        $(this.container).on('click', '.form-check-input', this._form_check_input_onClick.bind(this)); 
        return true    
    }

    _form_check_input_onClick(e){
        this._update_selected_tags();
        this._show_selected_tags();
        //this.show();
    }

    _get_tag_by_id(tag_id){
         return this.all_tags_dict[tag_id]

    }

    _update_selected_tags_dom(){
        const tag_selectors = this.container.querySelectorAll(".tag_selector");        
        for (let i = 0; i < tag_selectors.length; i++) {
            let id = Number(tag_selectors[i].getAttribute('tag_id_data'))             
            tag_selectors[i].checked=this.selected_tags.includes(id)            
        } 
    }

    _update_selected_tags() {
        const tag_selectors = this.container.querySelectorAll(".tag_selector");
        this.selected_tags = []
        for (let i = 0; i < tag_selectors.length; i++) {
            if (tag_selectors[i].checked) {
                this.selected_tags.push(Number(tag_selectors[i].getAttribute('tag_id_data')))

            }
        }        
        this._change({'event_name':'tags_changed'})
    }    

    _tags_to_html_string() {
        let result = ''
        for (let i = 0; i < this.selected_tags.length; i++) {
            let tag_data = this.all_tags_dict[this.selected_tags[i]]; 
            let class_ = tag_data['type'];
            result += `<span class = 'tag_${class_}'>&lt;${tag_data['name']}&gt;</span>`;
        }
        return result
    }

    _show_selected_tags (){
        let result = this._tags_to_html_string ()
        this.container.querySelector("#selected_tags").innerHTML = result
    }

    _getHTML() {

        let result = "<div class='col' id ='selected_tags'></div>"        
        
        let common_tags_html = ''
        for (let i = 0; i < this.tags.length; i++) {
            common_tags_html += `<div class="form-check keep_open">
                                     <input type="checkbox" class="form-check-input tag_selector keep_open" tag_id_data ='${this.tags[i].id}' id="dropdownCheck${this.tags[i].id}">
                                     <label class="form-check-label keep_open" for="dropdownCheck${this.tags[i].id}">
                                     ${this.tags[i].name}
                                 </label> </div>`
        }
        let personal_tags_html = ''
        for (let i = 0; i < this.user_tags.length; i++) {
            personal_tags_html += `<div class="form-check keep_open">
                                 <input type="checkbox" class="form-check-input tag_selector keep_open" tag_id_data ='${this.user_tags[i].id}' id="dropdownCheck${this.user_tags[i].id}">
                                 <label class="form-check-label keep_open" for="dropdownCheck${this.user_tags[i].id}">
                                 ${this.user_tags[i].name}
                                 </label>  </div>`
        }
           result = `<div><h4>${this.caption}</h4></div>
            <div class = 'row bg-light border flex-grow-1'>${result}
            <div class="dropdown  flex-grow-0">
            <button class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">...
                <span class="caret"></span></button>
            <div class="dropdown-menu keep_open">
                <p class="mb-0  keep_open">Personal tags.</p>
                <div style="display: flex; justify-content:last baseline; flex-wrap: wrap keep_open">
                    ${personal_tags_html}
                </div>
                <p class="mb-0  keep_open">   Common tags. </p>
                <div style="display: flex; justify-content:last baseline; flex-wrap: wrap keep_open">
                    ${common_tags_html}
                </div>             
            </div>
        </div></div>`     
        return result
    }
}


export class Tag_selector_set extends Widget{

    /**
     * @constructor
     * @param {Object} owner
     * @param {HTMLElement} container  
     * @param {Array} user_tags [{'name':name,'id': id},{}...]
     * @param {Array} tags [{'name':name,'id': id},{}...] 
     * @param {Array} captions  captions = {'inculde':'caption for includes', 'exclude':'caption for excludes' } 
     */
    constructor(owner, user_tags, tags, captions, container=undefined ){
        super(owner,container)
        this.tags = tags;
        this.user_tags = user_tags;
        this.tag_selectors = [] //[{'include': Tag_selector, 'exclude': Tag_selector},{same}...]        
        this.captions = captions;
        this.add_tag_selectors_pair()
    }
 
    add_tag_selectors_pair(){
        let ts_pair = {}         
        ts_pair['include'] = new Tag_selector(this,this.user_tags,this.tags,this.captions['include']); 
        ts_pair['include'].onChange =  function(tag_selector,event){
            tag_selector.owner._change({'event_name':'tags_changed'})
            }

        ts_pair['exclude'] = new Tag_selector(this,this.user_tags,this.tags,this.captions['exclude']);
        ts_pair['exclude'].onChange =  function(tag_selector,event){
            tag_selector.owner._change({'event_name':'tags_changed'})
            }
        
        this.tag_selectors.push(ts_pair);
        this.show()
        return ts_pair
    }

    _getHTML(){
        let tag_selectors_html ='';
        for (let i=0;i<this.tag_selectors.length;i++){
            tag_selectors_html+= `<div class="row" >
                                 <div style = 'display:flex' class=" col flex-column"  id='tag_selector_incl_${i}'></div>
                                 <div style = 'display:flex' class=" col flex-column" id='tag_selector_excl_${i}'></div>
                                 </div>`
            }
        let result = `${tag_selectors_html} 
                  <div button class="btn btn-primary" id = 'add-tag-selectors-btn' <h1> add filter </h1></button> </div>`        
        return result
    }

    show(){
        if (!super.show()) return false
        
        this.container.style.marginBottom ="5px";
        this.container.className = "container-fluid"

        for (let i=0;i<this.tag_selectors.length;i++){
            let container = this.container.querySelector('#tag_selector_incl_' + i)
            this.tag_selectors[i]['include'].set_container(container)
            this.tag_selectors[i]['include'].show();
            container = this.container.querySelector('#tag_selector_excl_' + i)
            this.tag_selectors[i]['exclude'].set_container(container)
            this.tag_selectors[i]['exclude'].show();
        }

        this.container.querySelector('#add-tag-selectors-btn').onclick =this.add_tag_selectors_pair.bind(this);         
    }
 
    // return [{'include':[tag_id, ..], 'exclude':[tag_id, ...]} ...]
    get_selected_tags(){
        let result =[]
        for(let i=0; i< this.tag_selectors.length;i++){
            let element = {}
            element['include'] = this.tag_selectors[i]['include'].selected_tags;
            element['exclude'] = this.tag_selectors[i]['exclude'].selected_tags;
            result.push(element);
        }
        return result;
    }

    //return settings(internal state) in serializable structure
    get_settings(){
        return {'selected_tags':this.get_selected_tags()}
    }

    //inverse of get_settings()
    set_settings(settings){
        this.tag_selectors = []
        const selected_tags = settings['selected_tags'];
        if (selected_tags == undefined) this.add_tag_selectors_pair()
        else{
            for (let i=0; i<selected_tags.length; i++){
                let ts_pair = this.add_tag_selectors_pair();
                ts_pair['include'].selected_tags = selected_tags[i]['include'];
                ts_pair['exclude'].selected_tags = selected_tags[i]['exclude'];
            }
        }      
    }
}

//Игровая карта. Хранит данные карты в виде сырых данных JSON
export class Card extends Widget{
    constructor(owner, card_data, front, back, card_set, container = null) {
        super(owner,container);
        this.card_data = card_data;
        this.front = front; //[front face attr]
        this.back = back; //[back face attr]
        //this.show_tags = show_tags;
        this.card_set = card_set;
        this.is_front_side = true;
        //this.container.card=this;
        this.CSRF_TOKEN = undefined;
    }
    static create_without_card_set(owner, card_data, front, back, user_tags, container = null)
    {
        let result = new Card(owner, card_data, front, back, undefined, container);
        let card_set = Card_set.create_from_card(result,user_tags);
        result.card_set = card_set
        return result; 
    }

    //creates card from string json data provided by API
    static create_from_JSON_strings(owner, card_data_JSON, tags_data_JSON, container){
        const card_data_ = JSON.parse(card_data_JSON);
        const tags_data_ = JSON.parse(tags_data_JSON);
        const FAs_ = Object.keys(card_data_['FAs'])
        const front_ = [FAs_.shift()];
        const back_ = FAs_;
        return Card.create_without_card_set(owner,card_data_, front_, back_, tags_data_, container);
    }

    get_id() {
        return this.card_data.id;
    }

    get_data(){
        return this.card_data
    }

    set_data(data){
        this.card_data = data
        if (this.card_set) {
            this.card_set.update_card(this.get_id(),this.card_data)
        }
    }

    show_side(instantly = false) {     
        let card = this.container.querySelector('#card-holder' + this.get_id())
        if (this.is_front_side) {
            card.className = instantly? 'rotate-instantly0': 'rotate0';
        }
        else {
            card.className = instantly? 'rotate-instantly180': 'rotate180';   
        }
    }

    reverse() {
        this.is_front_side = !this.is_front_side;
        this.show_side(false)
    }

    move(in_out,direction, onAnimationendExternal = undefined) {

        let onAnimationend = function (event) {               
            event.target.classList.remove('move_in_from-' + direction)
            if (onAnimationendExternal)
                onAnimationendExternal()
        };        

        let class_name = in_out =='in' ? 'move_in_from-': 'move_out_to-';
        class_name +=  direction;
        let card_dom_object = this.container;
        card_dom_object.onanimationend = onAnimationend;
        card_dom_object.classList = [];
        card_dom_object.classList.add(class_name);       
    }
   
    show() {
        if (!super.show()) return false;

        //new card always created on front side. Need to add  to rotate 
        if (!this.is_front_side) {
            this.show_side(true)
        }

        const tag_selectors = this.container.querySelectorAll("#card_tag_selector" + this.get_id());
        for (let i = 0; i < tag_selectors.length; i++) {
            tag_selectors[i].card = this //!!! убрать
            tag_selectors[i].onchange=this._tag_selector_onchange
         }

        const tag_elements = this.container.querySelectorAll(".card_tag_item");
        for (let i = 0; i < tag_elements.length; i++) {
            tag_elements[i].card = this //!!! убрать
            tag_elements[i].onclick = this._tag_onclick      
        }

        const card_titles = this.container.querySelectorAll('.card-title');
        for(let i=0;i<card_titles.length; i++){
            card_titles[i].card = this //!!! убрать
            card_titles[i].onclick = function (event) { event.target.card.reverse() };
            }
        
        const card_menu = this.container.querySelectorAll(".card_menu");
        for(let i=0;i<card_menu.length; i++){
            card_menu[i].onclick = OpenUrlInNewWindow;
        }
    }

    get_FA_value(FA_name){
        return this.card_data.FAs[FA_name]
    }
     
    _tag_onclick(event) {
        const card = event.target.card; //!!! убрать
        const tag_id = event.target.getAttribute("tag_id");
   
        fetch('/Cards/delete_card_tag', {
            method: 'POST',
            body: JSON.stringify({ 'tag_id':tag_id, 'card_id': card.get_id()}),
            headers: { "X-CSRFToken": card.CSRF_TOKEN }
        })
            .then(
                response => response.json()
            )
            .then(result => {
                const card = this.card; //!!! убрать
                card.set_data(result);
                card.show()
            })        
    }

    _tag_selector_onchange(event) {
        const card = event.target.card; //!!! убрать
        const tag_id =event.target.value;
   
        fetch('/Cards/set_card_tag', {
            method: 'POST',
            body: JSON.stringify({ 'tag_id':tag_id, 'card_id': card.get_id()}),
            headers: { "X-CSRFToken": card.CSRF_TOKEN }
        })
            .then(
                response => response.json()
            )
            .then(result => {
                const card = this.card; //!!! убрать
                card.set_data(result);
                card.show()
            })        
    }

    _tags_to_string(tags, class_ = '') {
        let result = ''
        for (let i = 0; i < tags.length; i++) {
            result += `<span card_id = '${this.get_id()}' tag_id = '${tags[i].id}' class = '${class_}'>&lt;${tags[i].name}&gt;</span>`;
        }
        return result
    }

    _getHTML() {
        let result = `<div id="card-holder${this.get_id()}" style ="text-align:center">`;

        const sides = [true, false]
        for (let i = 0; i < sides.length; i++) {

            let attributes = (sides[i]) ? this.front : this.back;
            let show_tags = (sides[i]) ? false : this.show_tags;
            let tags = this.card_data.tags;
            // user tags applyed to this card
            let card_user_tags = this.card_data.user_tags;

            let header = '';
            let card_number_label = ''
            if (this.card_set != null) {
                card_number_label = `${this.card_set.get_card_number(this) + 1}/${this.card_set.cards_count()}`
            }     
            else{
                card_number_label = '1/1'
            }
            header = `<span class = 'card_menu' URL = '/Cards/card_profile/${this.get_id()}/'>${card_number_label}</span>`
          

            let body = '';

            for (let i = 0; i < attributes.length; i++) {
                const FA = this.card_data.FAs[attributes[i]]
                if (FA != undefined) {
                    let class_size = 'card-title-bg';
                    if (FA.length>'30'){
                        class_size = 'card-title-sm';
                    }     
                    if (FA.length>'20'){
                        class_size = 'card-title-md';     
                    }
                    body += `<h5 class="card-title ${class_size}">${FA}</h5> \n`;
                }
            }

            let footer = ''
            if (show_tags) {
                footer += this._tags_to_string(tags,'tag_common')
            }

            //user_tags selector
            let user_tags_selector = `
                <form style="padding-bottom: 0px; margin: 0px; ">
                    <select id ="card_tag_selector${this.get_id()}" card_id ="${this.get_id()}" class="form-select form-select-sm" aria-label=".form-select-sm example">
                    <option selected>set tag</option>
                                `

            // all user_tags of current user    
            if (this.card_set != undefined) {
                let game_user_tags = this.card_set.get_user_tags()
                for (let i = 0; i < game_user_tags.length; i++) {
                    user_tags_selector += `<option value=${game_user_tags[i].id}>${game_user_tags[i].name}</option>`
                }
            }

            user_tags_selector += '</select></form>'

            let user_tags_string = ` <div style="display: flex; align-items: center;">                                 
                                        ${this._tags_to_string(card_user_tags,'tag_user card_tag_item')} 
                                        ${user_tags_selector}
                                    </div>
                                  `

            result += `
            <div class="card border-success mb-3 game-card ${i == 0 ? "flip-card-front" : "flip-card-back"}">
            <div class="card-header bg-transparent border-success ">${header} ${user_tags_string}</div>
            <div class="card-body text-success ">
            ${body}
            </div>
            <div class="card-footer bg-transparent border-success ">${footer}</div>
        </div>
        `
        }
        return result + '</div>'
    }
}

//Игра. Хранит данные игры (список карты в виде данных JSON)
export class Card_set extends Saveable {
    // методы класса
    constructor(owner, cards, tags, front, back ) {
        super();
        // dict {card.id: card object}
        this.cards = cards.cards;
        //array of card.id 
        this.order = cards.order;
        this.tags = tags;
        this.current_card_number = 0;
        this.front = front;
        this.back = back;
        this.show_tags = true;
    }
    static create_from_card(card, tags ) {
        let cards = {}
        const id = card.get_id() 
        cards['cards'] = {id:card}
        cards['order'] = [id]

        return new Card_set(card.owner, cards, tags, card.front, card.back)
    }
    update_card(card_id,card_data) {
        this.cards[Number(card_id)] = card_data;          
    }

    get_user_tags() {
        return this.tags.user_tags
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

    change_card(increment) {
        let new_card_number = this.current_card_number + increment;
        new_card_number = new_card_number < 0? 0:new_card_number;
        new_card_number = new_card_number>this.cards_count() - 1? this.cards_count() - 1: new_card_number;
        this.current_card_number = new_card_number;
    }

    get_card(number, container) {
        return new Card(this.owner, this.cards[this.order[number]], this.front, this.back, this, container)
    }
}
/**
 * all possible states of Timer 
 */
State.get_or_create_state('stopped')
State.get_or_create_state('running')
