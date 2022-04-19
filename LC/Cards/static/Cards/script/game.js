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

    show(is_front_side) {
        if (this.container != null) {
            this.container.innerHTML = this.getHTML(is_front_side);
            const tag_selector = this.container.querySelector("#card_tag_selector" + this.get_id());
            tag_selector.addEventListener("change", function (e) 
            {   
                const element = e.target;
                const card_id = element.getAttribute("card_id");
                const tag_id = element.value;
               
                fetch('../set_card_tag', {
                    method: 'POST',
                    body: JSON.stringify({'tag_id':tag_id,'card_id':card_id})
                })
                    .then(response => response.json())
                    .then(result => {
                        game.update_card(card_id,result)
                        console.log(result)
                })
            })
            const tag_elements =  this.container.querySelectorAll(".card_tag_item" );
            for (let i = 0; i < tag_elements.length; i++) {
                tag_elements[i].addEventListener("click", function (e) {
                    const element = e.target;
                    const card_id = element.getAttribute("card_id");
                    const tag_id = element.getAttribute("tag_id"); 
                   
                    fetch('../delete_card_tag', {
                        method: 'POST',
                        body: JSON.stringify({'tag_id':tag_id,'card_id':card_id})
                    })
                        .then(response => response.json())
                        .then(result => {
                            game.update_card(card_id,result)
                            console.log(result)
                    })
                })  
            }
            

        }
    }


    _tags_to_string(tags, class_ = '') {
        let result = ''
        for (let i = 0; i < tags.length; i++) {
            result += `<span card_id = '${this.get_id()}' tag_id = '${tags[i].id}' class = '${class_}'>&lt;${tags[i].name}&gt;</span>`;
        }

        return result
    }




    getHTML(front = true) {

        let result = `<div id="card-holder${this.get_id()}" style ="text-align:center">`;

        const sides = [front, !front]
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
                    //<p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>

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
        this.cards = cards.cards;
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

    get_next_card(container = null) {
        if (this.current_card_number < this.cards_count() - 1) {
            this.current_card_number++;
        }

        return this.get_card(this.current_card_number, container)
    }

    get_prev_card(container = null) {
        if (this.current_card_number > 0) {
            this.current_card_number--;
        }

        return this.get_card(this.current_card_number, container)
    }

    get_card(number, container = null) {

        return new Card(this.cards[this.order[number]], this.front, this.back, this, this.show_tags, container)

    }
}

function ___show_next_card___(obj) {
    obj.show_next_card();
}

//assumming that "game" is global variable, need to find a way to avoid this (see start()).
class Game {
    // методы класса
    constructor(container, globalname) {

        this.container = container;
        this.card_set = undefined;
        this.is_front_side = true;
        this.tags = undefined;
        this.selected_tags = undefined;
        this.touchStart = null; //Точка начала касания
        this.touchStart = null; //Текущая позиция

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
    
    update_card(card_id,card_data) {
        this.card_set.update_card(card_id,card_data)
        this.update_game() 
    }
 
    new_game() {
        var tags_list_body = "";
        for (let i = 0; i < this.tags.length; i++) {
            const tag_name = this.tags[i].name;
            tags_list_body += ` 
            <li class="tristate tristate-switcher list-group-item">
                <input type="radio" id="item1-state-off" class="tag-picker" tag_name="${tag_name}" name="item${i}" value="-1">
                <input type="radio" id="item1-state-null" class="tag-picker" tag_name="${tag_name}" name="item${i}" value="0" checked>
                <input type="radio" id="item1-state-on" class="tag-picker" tag_name="${tag_name}" name="item${i}" value="1">
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
        document.querySelector('#start-game-btn').onclick = function () { game.start() };
    }
   

    get_selected_tags() {

        const tags = document.querySelectorAll(".tag-picker");
        let tags_include = [];
        let tags_exclude = [];

        for (let i = 0; i < tags.length; i++) {
            if (tags[i].checked) {
                switch (tags[i].getAttribute('value')) {
                    case '-1': tags_exclude.push(tags[i].getAttribute('tag_name'));
                    case '1': tags_include.push(tags[i].getAttribute('tag_name'));

                }
            }
        }
        console.log(tags_include);
        console.log(tags_exclude);

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

        //assumming that "game" is global variable, need to find a way to avoid this.
        document.querySelector('#show-prev-card-btn').onclick = function () { game.show_prev_card() };
        document.querySelector('#show-next-card-btn').onclick = function () { game.show_next_card() };
        document.querySelector('#reverse-card-btn').onclick = function () { game.reverse_card() };
        //Перехватываем события
        this.container.addEventListener("touchstart", function (e) { game.TouchStart(e); }); //Начало касания
        this.container.addEventListener("touchmove", function (e) { game.TouchMove(e); }); //Движение пальцем по экрану
        //Пользователь отпустил экран
        this.container.addEventListener("touchend", function (e) { game.TouchEnd(e, "green"); });
        //Отмена касания
        this.container.addEventListener("touchcancel", function (e) { game.TouchEnd(e, "red"); });

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
                this.card_set = new Card_set(result.cards, result.tags);
                this.update_game()
            })

    }
    show_prev_card() {
        this.show_new_card('left');
        /* this.is_front_side = true;
        this.card_set.get_prev_card();
        this.update_game();*/
    }
    show_new_card(direction) {
        this.is_front_side = true;
        let cardobject = this.card_set.get_card(this.card_set.current_card_number);
        let card = document.querySelector('#card-holder' + cardobject.get_id())
        /*
         if (card.classList.contains('position-right') ||card.classList.contains('position-left') ){
             return
         }*/
        card.classList = [];
        card.classList.add('move-' + direction);

        card.addEventListener('animationend', () => {
            if (direction == 'right') {
                game.card_set.get_next_card()
            }
            else {
                game.card_set.get_prev_card()
            }
            game.update_game();
            let newcardobject = game.card_set.get_card(game.card_set.current_card_number);
            let newcard = document.querySelector('#card-holder' + newcardobject.get_id());
            newcard.classList.add('position-' + direction);

            newcard.addEventListener('animationend', () => {
                newcard.classList.remove('position-' + direction);
            });
        });

    }

    show_next_card() {
        this.show_new_card('right');
    }

    reverse_card() {
        this.is_front_side = !this.is_front_side;
        let cardobject = this.card_set.get_card(this.card_set.current_card_number);
        let card = document.querySelector('#card-holder' + cardobject.get_id())
        if (this.is_front_side) {
            card.className = ' rotate0';
        }
        else {
            card.className = 'rotate180';
        }

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
            document.querySelector('#show-prev-card-btn').disabled = (card_set.get_current_card_number() <= 0);
            document.querySelector('#show-next-card-btn').disabled = (card_set.get_current_card_number() >= card_set.cards_count() - 1);
            const container = document.querySelector('#current_card');
            const card = card_set.get_card(card_set.get_current_card_number(), container);
            card.show(this.is_front_side);
        }
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

    TouchEnd(e, color) {

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

        var msg = ""; //Сообщение

        if (Math.abs(d.x) > Math.abs(d.y)) //Проверяем, движение по какой оси было длиннее
        {
            if (Math.abs(d.x) > sensitivity) //Проверяем, было ли движение достаточно длинным
            {
                if (d.x > 0) //Если значение больше нуля, значит пользователь двигал пальцем справа налево
                {
                    console.log("Swipe Left");
                    this.show_prev_card();
                }
                else //Иначе он двигал им слева направо
                {
                    console.log("Swipe Right");
                    this.show_next_card();
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





