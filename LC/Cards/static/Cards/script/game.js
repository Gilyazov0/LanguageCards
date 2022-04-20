var game

//Игровая карта. Хранит данные карты в виде сырых данных JSON
class Card {
    constructor(card_data, front, back, card_set = null, show_tags = true, container = null) {
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

    show_side(is_front_side, instantly = false) {     
        let card = this.container.querySelector('#card-holder' + this.get_id())
        if (is_front_side) {
            card.className = instantly? 'rotate-instantly0': 'rotate0';
        }
        else {
            card.className = instantly? 'rotate-instantly180': 'rotate180';   
        }
    }

    move(in_out,direction,onAnimationend) {
        let class_name = in_out =='in' ? 'move_in_from-': 'move_out_to-';
        class_name +=  direction;
        let card_dom_object = this.container;
        card_dom_object.onanimationend = onAnimationend;
        card_dom_object.classList = [];
        card_dom_object.classList.add(class_name);
    }
   
    show(is_front_side) {
        this.container.innerHTML = this.getHTML();
        //new card always created on front side. Need to add  to rotate 
        if (!is_front_side) {
            this.show_side(is_front_side, true)
        }

        const tag_selectors = this.container.querySelectorAll("#card_tag_selector" + this.get_id());
        for (let i = 0; i < tag_selectors.length; i++) {
            tag_selectors[i].onchange=this._tag_selector_onchange
        }

        const tag_elements = this.container.querySelectorAll(".card_tag_item");
        for (let i = 0; i < tag_elements.length; i++) {
            tag_elements[i].onclick = this._tag_onclick
        }

        let card_titles = this.container.querySelectorAll('.card-title');
            for(let i=0;i<card_titles.length; i++){
                card_titles[i].onclick = function () { game.reverse_card() };
            }  
    }

    _tag_onclick(event) {
        const element = event.target;
        const card_id = element.getAttribute("card_id");
        const tag_id = element.getAttribute("tag_id");

        fetch('../delete_card_tag', {
            method: 'POST',
            body: JSON.stringify({ 'tag_id': tag_id, 'card_id': card_id })
        })
            .then(response => response.json())
            .then(result => {
                game.update_card(card_id, result)

            })
    }

    _tag_selector_onchange(event){
        {
            const element = event.target;
            const card_id = element.getAttribute("card_id");
            const tag_id = element.value;

            fetch('../set_card_tag', {
                method: 'POST',
                body: JSON.stringify({ 'tag_id': tag_id, 'card_id': card_id })
            })
                .then(response => response.json())
                .then(result => {
                    game.update_card(card_id, result)
                })
        }
    }    

    _tags_to_string(tags, class_ = '') {
        let result = ''
        for (let i = 0; i < tags.length; i++) {
            result += `<span card_id = '${this.get_id()}' tag_id = '${tags[i].id}' class = '${class_}'>&lt;${tags[i].name}&gt;</span>`;
        }
        return result
    }

    getHTML() {
        let result = `<div id="card-holder${this.get_id()}" style ="text-align:center">`;

        const sides = [true, false]
        for (let i = 0; i < sides.length; i++) {

            let attributes = (sides[i]) ? this.front : this.back;
            let show_tags = (sides[i]) ? false : this.show_tags;
            let tags = this.card_data.tags;
            // user tags applyed to this card
            let card_user_tags = this.card_data.user_tags;

            let header = '';
            if (this.card_set != null) {
                header = (this.card_set.get_card_number(this) + 1) + '/' + this.card_set.cards_count()
            }

            let body = '';

            for (let i = 0; i < attributes.length; i++) {
                const FA = this.card_data.FAs[attributes[i]]
                if (FA != undefined) {
                    body += `<h5 class="card-title ">${this.card_data.FAs[attributes[i]]}</h5> \n`;
                }
            }

            let footer = ''
            if (show_tags) {
                footer += this._tags_to_string(tags)
            }

            //user_tags selector
            let user_tags_selector = `
                <form style="padding-bottom: 0px; margin: 0px; ">
                    <select id ="card_tag_selector${this.get_id()}" card_id ="${this.get_id()}" class="form-select form-select-sm" aria-label=".form-select-sm example">
                    <option selected>set tag</option>
                                `

            // all user_tags of current user                   
            let game_user_tags = this.card_set.get_user_tags()
            for (let i = 0; i < game_user_tags.length; i++) {
                user_tags_selector += `<option value=${game_user_tags[i].id}>${game_user_tags[i].name}</option>`
            }

            user_tags_selector += '</select></form>'

            let user_tags_string = ` <div style="display: flex; align-items: center;">                                 
                                        ${this._tags_to_string(card_user_tags,'card_tag_item')} 
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
class Card_set {
    // методы класса
    constructor(cards, tags) {
        // dict {card.id: card object}
        this.cards = cards.cards;
        //array of card.id 
        this.order = cards.order;
        this.tags = tags;
        this.current_card_number = 0;
        this.front = ['На русском'];
        this.back = ['Транскрипция', 'На иврите'];
        this.show_tags = true;
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
        return new Card(this.cards[this.order[number]], this.front, this.back, this, this.show_tags, container)
    }
}

//assumming that "game" is global variable, need to find a way to avoid this (see start()).
class Game {
    // методы класса
    constructor(container, globalname) {

        this.container = container; // DOM элемент содержащий игру
        this.card_set = undefined;
        this.is_front_side = true;
        this.tags = undefined;
        this.user_tags = undefined;
        this.selected_tags = undefined;
        this.active_card_obj = undefined;
        this.touchStart = null; //Точка начала касания
        this.touchStart = null; //Текущая позиция
        this.active_card_container = undefined; //DOM элемент содержащий текущую карту
       

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
    
    update_card(card_id,card_data) {
        this.card_set.update_card(card_id,card_data);
        this.update_game(); 
    }

    //for start new game page
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

    update_start_game_page(){
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
        this.container.querySelector('#reverse-card-btn').onclick = function () { game.reverse_card() };
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
        this.is_front_side = true;
        let cardobject = this.active_card_obj;

        let onAnimationend = function () {
            let increment = direction == 'right' ? +1:-1;
            game.card_set.change_card(increment);
            game.update_game();

            let cardobject = game.active_card_obj;
            let onAnimationend_ = function () {
                newcard.classList.remove('move_in_from-' + direction)
            };
            cardobject.move('in', direction), onAnimationend_;
        };
        cardobject.move('out', direction, onAnimationend);
    }

    reverse_card() {
        this.is_front_side = !this.is_front_side;
        this.active_card_obj.show_side(this.is_front_side,false)
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
      
            this.new_active_card_obj().show(this.is_front_side);                     
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





