/**
 * @typedef Tag
 * @type {Object}
 * @property {string} name
 * @property {number} id
 */

/**
 *@typedef Card_data
 *@type {Object}
 *@property {Number} id 
 *@property {Object.<string,string>} FAs {FA_Name:FA_Value}
 *@property {Array.<Tag>} tags 
 *@property {Array.<Tag>} user_tags
 */

$(document).ready(function () {
    $(document).on('click', '.dropdown-menu', function (e) {
        if (e.target.classList.contains('keep_open')) {
            e.stopPropagation();
        }
    });
});

function OpenUrlInNewWindow(event) {
    const element = event.target;
    const url = element.getAttribute("URL");
    window.open(url, '_blank').focus();
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
    constructor(name, specified_state = undefined) {
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

    static get_or_create_state(name, specified = State.default) {
        if (Object.keys(State).find((value) => { return value == name })) return State[name]
        State[name] = new State(name, specified)
    }

    /**
     * 
     * @param {State} state 
     * @returns {Boolean} True if this = state or specify state
     */
    is_in_state(state) {
        if (this == state) return true
        if (this.specified_state == undefined) return false
        return this.specified_state.is_in_state(state)
    }
}

/** just able to save internal state into JSON and load it back
 * @class
 */
export class Saveable {

    constructor() {
        this._do_not_save = []
    }

    /**
     * loads this object form JSON
     * @param {JSON} objectJSON 
     */
    load_from_JSON(objectJSON) {
        console.log(this);
        for (let key in objectJSON) {
            this._load_attribute_to_JSON(key, objectJSON)
        }
    }

    /**
     * saves this object to JSON 
     * @returns {JSON}
     */
    save_to_JSON() {
        let result = {}
        for (let key in this) {
            if (this._do_not_save.includes(key))
                continue;
            if (this[key] instanceof Saveable) {
                this._save_attribute_to_JSON(key, result)
            }
        }
        return result
    }

    /** loads one attribute 'attribute_name' from JSON
     * @protected
     * @param {string} attribute_name 
     * @param {JSON} objectJSON 
     */
    _load_attribute_to_JSON(attribute_name, objectJSON) {
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
    _save_attribute_to_JSON(attribute_name, objectJSON) {
        if (this[attribute_name] instanceof Saveable) {
            let value = this[attribute_name].save_to_JSON()
            if (Object.keys(value).length !== 0) objectJSON[attribute_name] = value;
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
export class Widget extends Saveable {

    static default = State.default

    /**
    * @constructor
    * @param {Object} owner
    * @param {HTMLElement} container  
    */
    constructor(owner, container = undefined) {
        super()
        this.owner = owner
        this.set_container(container)
        this.onChange = undefined
        this._state = State.default;
        this.touchStart = null; //Точка начала касания
        this.touchStart = null; //Текущая позиция
        this._do_not_save.push('owner')
    }

    /**
     * @return {State}
     */
    get state() {
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
    show() {
        if (this.container) {
            this.container.innerHTML = this._getHTML()
            return true
        } else
            return false
    }
    /**
     * 
     * @param {State} new_state 
     * @param {Boolean} throw_onChange 
     */
    _set_state(new_state, throw_onChange = false) {
        const old_state = this.state;
        this._state = new_state;
        if (throw_onChange)
            this._change({ 'event_name': 'state_change', 'old_state': old_state, 'new_state': new_state })
    }

    /**@protected*/
    _change(event) {
        if (this.onChange) 
            this.onChange(this, event)
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
    _activate_swipes() {
        //Перехватываем события
        this.container.ontouchstart = function (e) { this._TouchStart(e); }.bind(this); //Начало касания
        this.container.ontouchmove = function (e) { this._TouchMove(e); }.bind(this); //Движение пальцем по экрану
        //Пользователь отпустил экран
        this.container.ontouchend = function (e) { this._TouchEnd(e); }.bind(this);
        //Отмена касания
        this.container.ontouchcancel = function (e) { this._TouchEnd(e); }.bind(this);
    }

    _swipe_left() { }

    _swipe_right() { }

    _swipe_up() { }

    _swipe_down() { }

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
export class Timer extends Widget {

    /**
    * @constructor
    * @param {Object} owner 
    * @param {HTMLElement} container 
    * @param {Number} initial_time initial number of secons 
    */
    constructor(owner, initial_time, font_size = undefined, container = undefined) {
        super(owner, container)
        this.value = initial_time;
        this._set_state(State.stopped);
        this._start_time = undefined;
        this.interval = undefined;
        this.font_size = font_size;
        this._set_initial_time(initial_time)
    }
    _set_initial_time(initial_time) {
        this._initial_time = initial_time;
        this.width = `${String(this._initial_time).length * 1.2}rem`
    }

    start() {
        this._set_state(State.running, true)
        this._start_time = new Date().getTime();
        this.interval = setInterval(this._tic.bind(this), 1000)
    }

    /**
     * reset Timer doesn't change state 
     * @param {Number} initial_time 
     */

    reset(initial_time = undefined) {
        if (initial_time) this._set_initial_time(initial_time);
        this.value = this._initial_time;
        this.show()
    }

    stop() {
        this._set_state(State.stopped, true);
        this.show();
    }

    disable() {
        this._set_state(State.disabled, true);
        this.show();
    }


    _set_state(new_state, throw_onChange = false) {
        if (this.state.is_in_state(State.running)) clearInterval(this.interval)
        super._set_state(new_state, throw_onChange)
    }

    /** @override */
    save_to_JSON() {
        let result = super.save_to_JSON()

        this._save_attribute_to_JSON('initial_time', result)

        return result
    }

    /**
     * if ruuning updates Timers value
     */
    _tic() {
        if (this.state.is_in_state(State.running)) {
            this.value = this._initial_time + Math.round((this._start_time - new Date().getTime()) / 1000);
            if (this.value <= 0) {
                this.value = 0;
                this.stop();
            }
            this.show();
        }
    }

    _calculate_font_zise() {
        const h_font_size = this.container.scrollHeight * 2 / 3;
        const w_font_size = this.container.scrollWidth / String(this._initial_time).length * 2 * 0.9;
        return `${Math.min(h_font_size, w_font_size)}px`;
    }

    /** @override */
    _getHTML() {
        let value = this._state == State.disabled ? '--' : this.value;
        let font_size = this.font_size;
        if (font_size == undefined) {
            font_size = this._calculate_font_zise();
        }

        return `
                    <div style='font-size:${font_size}; width:${this.width}' class="timer badge-primary border-primary border border-lg">
                        <span>${value}</span>
                    </div>
                `
    }

}

export class Tag_selector extends Widget {

    /**
    * @param {Object} owner
    * @param {Array.<Tag>} user_tags [{'name':name,'id': id},{}...]
    * @param {Array.<Tag>} tags [{'name':name,'id': id},{}...]
    * @param {string} caption 
    * @param {HTMLElement} container  
    */
    constructor(owner, user_tags, tags, caption, container = undefined) {

        super(owner, container);
        this.tags = tags;
        this.user_tags = user_tags;

        /**
        * [tag.id, tag.id....]
        * @type {Array.<Number>}
        * @public
        */
        this.selected_tags = []; //[tag.id, tag.id....]

        /**
        * all_tags_dict {tag.id: {'name':name,'id': id}...} tags.id and user_tags.id do not intersect
        * @type {Array.<Tag>}
        * @public
        */
        this.all_tags_dict = {}

        /**
         * @type {Array.<string>}
         */
        this.caption = caption;

        for (let i = 0; i < this.tags.length; i++) {
            this.tags[i]['type'] = 'common';
            this.all_tags_dict[this.tags[i].id] = this.tags[i]
        }
        for (let i = 0; i < this.user_tags.length; i++) {
            this.user_tags[i]['type'] = 'user';
            this.all_tags_dict[this.user_tags[i].id] = this.user_tags[i]
        }
    }

    show() {
        if (!super.show()) return false

        this.container.style.marginBottom = '5px';

        this._update_selected_tags_dom()
        this._show_selected_tags()
        $(this.container).on('click', '.tag-selector', this._form_check_input_onClick.bind(this));
        return true
    }

    /**
     * occurs when user click on tag
     * @param {Event} e 
     */
    _form_check_input_onClick(e) {
        this._update_selected_tags();
        this._show_selected_tags();
    }

    _get_tag_by_id(tag_id) {
        return this.all_tags_dict[tag_id]

    }

    _update_selected_tags_dom() {
        const tag_selectors = this.container.querySelectorAll(".tag-selector-checkbox");
        for (let i = 0; i < tag_selectors.length; i++) {
            let id = Number(tag_selectors[i].getAttribute('tag_id_data'))
            tag_selectors[i].checked = this.selected_tags.includes(id)
        }
    }

    _update_selected_tags() {
        const tag_selectors = this.container.querySelectorAll(".tag-selector-checkbox");
        this.selected_tags = []
        for (let i = 0; i < tag_selectors.length; i++) {
            if (tag_selectors[i].checked) {
                this.selected_tags.push(Number(tag_selectors[i].getAttribute('tag_id_data')))

            }
        }
        this._change({ 'event_name': 'tags_changed' })
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

    _show_selected_tags() {
        let result = this._tags_to_html_string()
        this.container.querySelector("#selected_tags").innerHTML = result
    }

    _getHTML() {

        let result = "<div class='flex-grow-1' id ='selected_tags'></div>"

        let common_tags_html = ''
        for (let i = 0; i < this.tags.length; i++) {
            common_tags_html += `<div class="tag-selector keep_open">
                                     <input type="checkbox" class="form-control tag-selector-checkbox keep_open" tag_id_data ='${this.tags[i].id}' id="dropdownCheck${this.tags[i].id}">
                                     <label class="flex-grow-1 form-control-lg label-gp keep_open" for="dropdownCheck${this.tags[i].id}">
                                     ${this.tags[i].name}
                                 </label> </div>`
        }
        let personal_tags_html = ''
        for (let i = 0; i < this.user_tags.length; i++) {
            personal_tags_html += `<div class="tag-selector keep_open">
                                 <input type="checkbox" class="form-control tag-selector-checkbox keep_open" tag_id_data ='${this.user_tags[i].id}' id="dropdownCheck${this.user_tags[i].id}">
                                 <label class="form-control-lg label-gp keep_open" for="dropdownCheck${this.user_tags[i].id}">
                                 ${this.user_tags[i].name}
                                 </label>  </div>`
        }
        result = `<div><h5>${this.caption}</h5></div>
            <div class = 'group-gp bg-light border flex-grow-1'>${result}
            <div class="dropdown  flex-grow-0">
            <button class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">...
                <span class="caret"></span></button>
            <div class="dropdown-menu rounded keep_open ">
                <h4 class="mb-0  keep_open">Personal tags:</h4>
                <div class="border border-primary rounded mb-2 keep_open" style="display: flex; justify-content:last baseline; flex-wrap: wrap;padding:10px">
                    ${personal_tags_html}
                </div>
                <h4 class="mb-0  keep_open">   Common tags: </h4>
                <div class="border border-primary rounded mb-2 keep_open" style="display: flex; justify-content:last baseline; flex-wrap: wrap ;padding:10px">
                    ${common_tags_html}
                </div> 
                <div  class="bg-white border border-primary rounded" style="padding:10px;position:sticky; bottom: 0px;">  
                <button class="btn btn-primary btn-block"> OK </button> 
                </div>           
            </div>
        </div></div>`
        return result
    }
}

//Игровая карта. Хранит данные карты в виде сырых данных JSON
export class Card extends Widget {

    /**
    * @constructor
    * @param {Object} owner
    * @param {Card_data} card_data data of this card returned by DJANGO API 
    * @param {Array.<string>} front front attributes of this card
    * @param {Array.<string>} back back attributes of this card
    * @param {Card_set} card_set 
    * @param {HTMLElement} container  
    * @returns {Card}
    */
    constructor(owner, card_data, front, back, card_set, container = null) {
        super(owner, container);
        this.card_data = card_data;
        this.front = front; //[front face attr]
        this.back = back; //[back face attr]
        this.card_set = card_set;
        this.is_front_side = true;
        this.CSRF_TOKEN = undefined;
        this.onReverse = undefined;
    }

    /**
    * @constructor
    * @param {Object} owner
    * @param {Card_data} card_data data of this card returned by DJANGO API 
    * @param {Array.<string>} front front attributes of this card
    * @param {Array.<string>} back back attributes of this card
    * @param {Array.<Tag>} user_tags all user tags avaiable 
    * @param {HTMLElement} container  
    * @returns {Card}
    */
    static create_without_card_set(owner, card_data, front, back, user_tags, container = null) {
        let result = new Card(owner, card_data, front, back, undefined, container);
        let card_set = Card_set.create_from_card(result, user_tags);
        result.card_set = card_set
        return result;
    }

    /**
    *creates card from string json data provided by API
    * @param {Object} owner 
    * @param {string} card_data_JSON {Card_data} serilized to JSON string
    * @param {string} tags_data_JSON {Array.Tag} serilized to JSON string
    * @param {HTMLElement} container 
    * @returns {Card}
    */
    static create_from_JSON_strings(owner, card_data_JSON, tags_data_JSON, container) {
        const card_data_ = JSON.parse(card_data_JSON);
        const tags_data_ = JSON.parse(tags_data_JSON);
        const FAs_ = Object.keys(card_data_['FAs'])
        const front_ = [FAs_.shift()];
        const back_ = FAs_;
        return Card.create_without_card_set(owner, card_data_, front_, back_, tags_data_, container);
    }

    /**
     * @returns {Number}
     */
    get_id() {
        return this.card_data.id;
    }

    /**
     * @returns {Card_data} internal data of the card
     */
    get_data() {
        return this.card_data
    }

    /**
     * @param {Card_data} data 
     */
    set_data(data) {
        this.card_data = data
        if (this.card_set) {
            this.card_set.update_card(this.get_id(), this.card_data)
        }
    }

    /**
     * turn card to the curent side
     * @param {boolean} instantly true - do not show animation false - show animation
     */
    _show_side(instantly = false) {
        let card = this.container.querySelector('#card-holder' + this.get_id())
        if (this.is_front_side) {
            card.className = instantly ? 'rotate-instantly0' : 'rotate0';
        }
        else {
            card.className = instantly ? 'rotate-instantly180' : 'rotate180';
        }
    }

    /**
     * change card side to the opposite
     * @param {boolean} throw_event throw onReverse event or not
     */
    reverse(throw_event = false) {

        this.is_front_side = !this.is_front_side;
        this._show_side(false)
        if (throw_event) this.onReverse?.()
    }

    /**
     * play move animation
     * @param {string} in_out 'in' or 'out'
     * @param {string} direction 'left' or 'right'
     * @param {function} onAnimationendExternal func to call-back after anim ends 
     */
    move(in_out, direction, onAnimationendExternal = undefined) {

        let onAnimationend = function (event) {
            event.target.classList.remove('move_in_from-' + direction)
            if (onAnimationendExternal)
                onAnimationendExternal()
        };

        let class_name = in_out == 'in' ? 'move_in_from-' : 'move_out_to-';
        class_name += direction;
        let card_dom_object = this.container;
        card_dom_object.onanimationend = onAnimationend;
        card_dom_object.classList = [];
        card_dom_object.classList.add(class_name);
    }

    show() {
        if (!super.show()) return false;

        //new card always created on front side. Need to add  to rotate 
        if (!this.is_front_side) {
            this._show_side(true)
        }

        const card_front = this.container.querySelector(".flip-card-front");
        const card_back = this.container.querySelector(".flip-card-back");
        let height = Math.max(card_front.scrollHeight, card_back.scrollHeight)
        card_back.style.height = height + 'px';
        card_back.style.minHeight = '30vh';
        card_front.style.height = height + 'px';
        card_front.style.minHeight = '30vh';


        const tag_selectors = this.container.querySelectorAll("#card_tag_selector" + this.get_id());
        for (let i = 0; i < tag_selectors.length; i++) {
            tag_selectors[i].card = this //!!! убрать
            tag_selectors[i].onchange = this._tag_selector_onchange
        }

        const tag_elements = this.container.querySelectorAll(".card_tag_item");
        for (let i = 0; i < tag_elements.length; i++) {
            tag_elements[i].card = this //!!! убрать
            tag_elements[i].onclick = this._tag_onclick
        }

        const card_titles = this.container.querySelectorAll('.card-title');
        for (let i = 0; i < card_titles.length; i++) {
            card_titles[i].card = this //!!! убрать
            card_titles[i].onclick = function (event) { event.target.card.reverse(true) };
        }

        const card_menu = this.container.querySelectorAll(".card_menu");
        for (let i = 0; i < card_menu.length; i++) {
            card_menu[i].onclick = OpenUrlInNewWindow;
        }
    }

    /**
     * @param {string} FA_name 
     * @returns {string}
     */
    get_FA_value(FA_name) {
        return this.card_data.FAs[FA_name]
    }

    _tag_onclick(event) {
        const card = event.target.card; //!!! убрать
        const tag_id = event.target.getAttribute("tag_id");

        fetch('/Cards/delete_card_tag', {
            method: 'POST',
            body: JSON.stringify({ 'tag_id': tag_id, 'card_id': card.get_id() }),
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
        const tag_id = event.target.value;

        fetch('/Cards/set_card_tag', {
            method: 'POST',
            body: JSON.stringify({ 'tag_id': tag_id, 'card_id': card.get_id() }),
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
        let result = `<div id="card-holder${this.get_id()}" style ="text-align:center" class = "rotate-instantly0">`;

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
            else {
                card_number_label = '1/1'
            }
            header = `<span class = 'card_menu' URL = '/Cards/card_profile/${this.get_id()}/'>${card_number_label}</span>`


            let body = '';

            for (let i = 0; i < attributes.length; i++) {
                const FA = this.card_data.FAs[attributes[i]]
                if (FA != undefined) {
                    let class_size = 'card-title-bg';
                    if (FA.length > '30') {
                        class_size = 'card-title-sm';
                    }
                    if (FA.length > '20') {
                        class_size = 'card-title-md';
                    }
                    body += `<h5 class="card-title ${class_size}">${FA}</h5> \n`;
                }
            }

            let footer = ''
            if (show_tags) {
                footer += this._tags_to_string(tags, 'tag_common')
            }

            //user_tags selector
            let user_tags_selector = `
                <form style="padding-bottom: 0px; margin: 0px; ">
                    <select id ="card_tag_selector${this.get_id()}" card_id ="${this.get_id()}" class="form-select form-select-sm">
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
                                        ${this._tags_to_string(card_user_tags, 'tag_user card_tag_item')} 
                                        ${user_tags_selector}
                                    </div>
                                  `

            result += `
            <div class="card border-success mb-3 game-card ${i == 0 ? "flip-card-front" : "flip-card-back"}">
            <div class="card-header bg-transparent border-success ">${header} ${user_tags_string}</div>
            <div class="card-body text-success">
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

    /**
     * @constructor
     * @param {object} owner 
     * @param {cards:{Number,Card}, order:{Array.<Number>}} cards from DJANGO API
     * @param {Object.<tags:{Array.<Tag>}, user_tags:{Array.<Tag>}} tags all possible tags
     * @param {Array.<string>} front Front attributes of cards
     * @param {Array.<string>} back  Back attributes of cards
     */
    constructor(owner, cards, tags, front, back) {
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
        this.owner = owner;
        this._do_not_save.push('owner')

    }

    /**
    * @constructor
    * @param {Card} card 
    * @param {Array.<Tag>} tags all possible tags
    * @returns {Card_set}
    */
    static create_from_card(card, tags) {
        let cards = {}
        const id = card.get_id()
        cards['cards'] = { id: card }
        cards['order'] = [id]

        return new Card_set(card.owner, cards, tags, card.front, card.back)
    }

    /**
     * @param {Number} card_id 
     * @param {Card_data} card_data 
     */
    update_card(card_id, card_data) {
        this.cards[Number(card_id)] = card_data;
    }

    /**
     * @returns {Array.<Tag>}
     */
    get_user_tags() {
        return this.tags.user_tags
    }

    cards_count() {
        return this.order.length
    }

    get_current_card_number() {
        return this.current_card_number
    }

    /**
     * @param {Card} card 
     * @returns {Number} 
     */
    get_card_number(card) {
        const id = card.get_id();
        return this.order.findIndex(x => x == id)
    }

    /**
     * Changes current card of card_set
     * @param {Number} increment 
     */
    change_card(increment) {
        let new_card_number = this.current_card_number + increment;
        new_card_number = new_card_number < 0 ? 0 : new_card_number;
        new_card_number = new_card_number > this.cards_count() - 1 ? this.cards_count() - 1 : new_card_number;
        this.current_card_number = new_card_number;
    }

    /**
     * Creates Card object stored in card_set on position <Number>
     * @param {Number} number 
     * @param {HTMLElement} container 
     * @returns {Card}
     */
    get_card(number, container) {
        return new Card(this.owner, this.cards[this.order[number]], this.front, this.back, this, container)
    }

    /**
     * @param {Number} card_id 
     * @param {String} FA 
     * @returns {String}
     */
    get_card_FA_value(card_id, FA) {
        return this.cards[card_id].FAs[FA]
    }
}

export class Setting extends Widget {
    constructor(owner, initial_value, container = undefined) {
        super(owner, container);
        this._value = initial_value;
        this.name = undefined;
        this.visible = true;
        this.onLoad = undefined
        this.override_value = undefined;
    }

    
    set_name(name) {
        this.name = name
    }

    get value() {
        if (this.override_value !== undefined) return this.override_value;
        return this._value
    }

    set value(value) {
        this._value = value;
        this.show();
    }

    get_user_value() {
        return this._value;
    }

    show() {
        if (!this.visible) return false
        if (!super.show()) return false
        return true
    }

    load_from_JSON(objectJSON){
        super.load_from_JSON(objectJSON)
        this._Throw_load_event({ 'event_name': 'load_from_JSON' })
    }

      /**@protected*/
      _Throw_load_event(event) {
        if (this.onLoad) 
            this.onLoad(this, event)
    }

    /**
    * saves this object to JSON 
    * @returns {JSON}
    */
    save_to_JSON() {
        let result = super.save_to_JSON();

        this._save_attribute_to_JSON('value', result)

        return result
    }
}

export class LableSetting extends Setting {
    constructor(owner, initial_value, container = undefined) {
        super(owner, initial_value, container);
    }

    _getHTML() {
        return `<h5 id ='${this.name}'>${this.value}</h5>`
    }
}

export class SimpleInput extends Setting {
    constructor(owner, initial_value, lable, container = undefined) {
        super(owner, initial_value, container);
        this.lable = lable;
        this.type = undefined;
    }
    _getHTML() {
        return ` 
        <div class="form-group group-gp">
            <label class="form-control-lg label-gp" for="input_id">${this.lable}</label>
            <input id='input_id' type="${this.type}" class="form-control-lg input-gp input-gp-sm flex-grow-1"
                value=${this._value} />           
        </div>               
        `
    }

    show() {
        if (!super.show()) return false

        const element = this.container.querySelector("#input_id");
        element.onchange = this._input_onChange.bind(this)

        return true
    }

    _input_onChange(event) {
        this._change(event)
    }
}

export class NumericInput extends SimpleInput {
    constructor(owner, initial_value, lable, container = undefined) {
        super(owner, initial_value, lable, container);

        this.type = 'number';
    }
    _input_onChange(event) {
        this._value = Number(event.target.value);
        super._input_onChange(event)
    }
}

export class StringInput extends SimpleInput {
    constructor(owner, initial_value, lable, container = undefined) {
        super(owner, initial_value, lable, container);

        this.type = 'text';
    }
    _input_onChange(event) {
        this._value = event.target.value;
        super._input_onChange(event)
    }
}

export class BooleanInput extends SimpleInput {
    constructor(owner, initial_value, lable, container = undefined) {
        super(owner, initial_value, lable, container);

        this.type = 'checkbox';
    }
    _input_onChange(event) {
        this._value = event.target.checked;
        super._input_onChange(event)
    }

    _getHTML() {
        let is_checked = this._value? 'checked':''
        return ` 
          <div class="form-group group-gp">
              <label class="form-control-lg label-gp" for="input_id">${this.lable}</label>
              <input id='input_id' type="${this.type}" class="form-control input-gp"  ${is_checked}/>           
          </div>               
          `
    }
}

export class SelectInput extends SimpleInput {
    constructor(owner, initial_value, lable, options, container = undefined) {
        super(owner, initial_value, lable, container);
        this._options = options; //[string]

    }

    _getHTML() {
        let result = `
        <div class="form-group  group-gp"> <label class="form-control-lg label-gp">${this.lable}</label>
            <select id ="input_id" class="form-control-lg form-select form-select-lg input-gp flex-grow-1">
               `
        for (let i = 0; i < this._options.length; i++) {
            let selected = this._options[i] == this._value ? 'selected="selected"' : ''

            result += `<option  ${selected} value='${this._options[i]}'>${this._options[i]}</option>`
        }
        result += '</select></div>'

        return result
    }
    _input_onChange(event) {
        this._value = event.target.value;
        super._input_onChange(event)
    }
}

export class Tag_selector_set extends Setting {

    /**
    * @typedef TS_captions sdsdds
    * captions for tag selectors pair
    * @type {Object}
    * @property {string} inculde caption for tag selectors 
    * @property {string} exclude caption for tag selectors 
    */


    /**
     * @constructor
     * @param {Object} owner
     * @param {HTMLElement} container  
     * @param {Array.<Tag>} user_tags [{'name':name,'id': id},{}...]
     * @param {Array.<Tag>} tags [{'name':name,'id': id},{}...] 
     * @param {TS_captions} captions  captions = {'inculde':'caption for includes', 'exclude':'caption for excludes' } 
     */
    constructor(owner, initial_value, user_tags, tags, captions, container = undefined) {
        super(owner, initial_value, container)

        /**
        * @type {Array.<Tag>}
        * @public
        */

        this.tags = tags;
        /**
        * @type {Array.<Tag>}
        * @public
        */
        this.user_tags = user_tags;

        /**
        * [{'include': Tag_selector, 'exclude': Tag_selector},{same}...]  
        * @type {Object.<string,Tag_selector>}
        * @public
        */
        this.tag_selectors = []

        /**
        * @type {TS_captions}
        * @public
        */
        this.captions = captions;
        this.add_tag_selectors_pair()
        if (initial_value != undefined) this.value = initial_value;
    }

    /**
    * @returns  {Object.<string,Tag_selector>} {'include': Tag_selector, 'exclude': Tag_selector}
    */
    add_tag_selectors_pair() {
        let ts_pair = {}
        ts_pair['include'] = new Tag_selector(this, this.user_tags, this.tags, this.captions['include']);
        ts_pair['include'].onChange = function (tag_selector, event) {
            tag_selector.owner._change({ 'event_name': 'tags_changed' })
        }

        ts_pair['exclude'] = new Tag_selector(this, this.user_tags, this.tags, this.captions['exclude']);
        ts_pair['exclude'].onChange = function (tag_selector, event) {
            tag_selector.owner._change({ 'event_name': 'tags_changed' })
        }

        this.tag_selectors.push(ts_pair);
        this.show()
        return ts_pair
    }

    show() {
        if (!super.show()) return false

        this.container.style.marginBottom = "5px";
        //this.container.className = "container-fluid"

        for (let i = 0; i < this.tag_selectors.length; i++) {
            let container = this.container.querySelector('#tag_selector_incl_' + i)
            this.tag_selectors[i]['include'].set_container(container)
            this.tag_selectors[i]['include'].show();
            container = this.container.querySelector('#tag_selector_excl_' + i)
            this.tag_selectors[i]['exclude'].set_container(container)
            this.tag_selectors[i]['exclude'].show();
        }

        this.container.querySelector('#add-tag-selectors-btn').onclick = this.add_tag_selectors_pair.bind(this);
    }

    /**
     * @returns  {Object.<string,Array.<number>>} [{'include':[tag_id, ..], 'exclude':[tag_id, ...]} ...]
     */
    get_selected_tags() {
        let result = []
        for (let i = 0; i < this.tag_selectors.length; i++) {
            let element = {}
            element['include'] = this.tag_selectors[i]['include'].selected_tags;
            element['exclude'] = this.tag_selectors[i]['exclude'].selected_tags;
            result.push(element);
        }
        return result;
    }

    /**
    * @returns return settings(internal state) in serializable structure
    */

    get_settings() {
        return { 'selected_tags': this.get_selected_tags() }
    }
    /**
     *restore previously saved state. inverse of get_settings()
     * @param {*} settings  
     */
    set_settings(settings) {
        this.tag_selectors = []
        const selected_tags = settings['selected_tags'];
        if (selected_tags == undefined) this.add_tag_selectors_pair()
        else {
            for (let i = 0; i < selected_tags.length; i++) {
                let ts_pair = this.add_tag_selectors_pair();
                ts_pair['include'].selected_tags = selected_tags[i]['include'];
                ts_pair['exclude'].selected_tags = selected_tags[i]['exclude'];
            }
        }
    }

    _getHTML() {
        let tag_selectors_html = '';
        for (let i = 0; i < this.tag_selectors.length; i++) {
            tag_selectors_html += `<div class="group-gp" >
                                   <div style = 'display:flex;max-width:50%' class="flex-column flex-grow-1"  id='tag_selector_incl_${i}'></div>
                                   <div style = 'display:flex;max-width:50%' class="flex-column flex-grow-1" id='tag_selector_excl_${i}'></div>
                                </div>`
        }
        let result = `${tag_selectors_html} 
                 <div button class="btn btn-primary" id = 'add-tag-selectors-btn' <h1> add filter </h1></button> </div>`
        return result
    }

    get value() {
        if (this.override_value !== undefined) return this.override_value;
        return this.get_selected_tags()
    }

    get_user_value() {
        return this.get_selected_tags();
    }


    set value(value) {
        this.tag_selectors = []
        const selected_tags = value;
        if (selected_tags == undefined) this.add_tag_selectors_pair()
        else {
            for (let i = 0; i < selected_tags.length; i++) {
                let ts_pair = this.add_tag_selectors_pair();
                ts_pair['include'].selected_tags = selected_tags[i]['include'];
                ts_pair['exclude'].selected_tags = selected_tags[i]['exclude'];
            }
        }
        this.show()
    }
}

export class Settings extends Widget {
    /**
    * @constructor
    * @param {Object} owner
    * @param {HTMLElement} container  
    */
    constructor(owner, container = undefined) {
        super(owner, container)
        this._settings = [] 
        //this.do_not_load = []

    }

    agrigate(new_settings) {
        for(let i =0; i <new_settings._settings.length;i++){
            let setting = new_settings._settings[i];
            //if (!new_settings.do_not_load.includes(setting.name))
                this.add_setting(setting, setting.name)   
        }

    }

    load(new_settings) {
        for (let i = 0; i < this._settings.length; i++) {
            let setting = this._settings[i]
            if (Object.keys(new_settings).includes(setting.name)
                && new_settings[setting.name] instanceof Setting
                //&& !this.do_not_load.includes(setting.name)
                ){
                setting.value = new_settings[setting.name].get_user_value();
            }
        }
    }

 
    add_setting(setting, name) {
        const index = this._settings.indexOf(setting);
        if (index > -1)
            this._settings[index] = setting;

        else
            this._settings.push(setting);

        this[name] = setting;
        setting.set_name(name);

    }

    delete_setting(setting) {
        const index = this._settings.indexOf(setting);
        if (index > -1) {
            this._settings.splice(index, 1);
        }

    }

    insert_before(setting, before_setting) {
        const index = this._settings.indexOf(before_setting);
        if (index > -1) {
            this._settings.splice(index, 0, setting);
        }
        else {
            throw ReferenceError(`Setting ${setting.name} not found`)
        }
    }

    show() {
        if (!super.show()) return false

        this._settings.forEach(setting => {
            
            if(setting.owner == this.owner){
                setting.set_container(this.container.querySelector('#' + setting.name))
                setting.show()
            }                
        });

        return true
    }

    _getHTML() {
        let result = ''
        this._settings.forEach(element => {
            result += `<div id='${element.name}'></div>`
        });
        return result;
    }


}

/**
 * all possible states of Timer 
 */
State.get_or_create_state('stopped')
State.get_or_create_state('running')
State.get_or_create_state('disabled', State.stopped)
