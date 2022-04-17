
var card_set 
var is_front_side = true


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
                header = (card_set.get_card_number(this)+1)+'/'+card_set.cards_count()
            }

        var body = '';

        for (var i=0; i< attributes.length;i++) {
            const FA = this.card_data.FAs[attributes[i]]
            if (FA != undefined){
                body +=  `<h5 class="card-title ">${this.card_data.FAs[attributes[i]]}</h5> \n`;
                //<p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>

            }              
        }

        var footer =''
        if (show_tags){
            for (var i=0; i< tags.length;i++) {
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

  class Game {
    // методы класса
    constructor(cards) {}
  }
function show_prev_card(){
    is_front_side = true;
    card_set.get_prev_card();   
    update_game();
}

function show_next_card(){
    is_front_side = true;
    card_set.get_next_card();   
    update_game();
}

function reverse_card(){
    is_front_side = !is_front_side;   
    update_game();
}


function update_game(){
    
    document.querySelector('#show-prev-card-btn').disabled = (card_set.get_current_card_number() <= 0);
    document.querySelector('#show-next-card-btn').disabled = (card_set.get_current_card_number() >= card_set.cards_count() - 1);
    const container = document.querySelector('#current_card');
    const card = card_set.get_card(card_set.get_current_card_number(),container);
    card.show(is_front_side);
}
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#show-prev-card-btn').onclick = show_prev_card;
    document.querySelector('#show-next-card-btn').onclick = show_next_card;
    document.querySelector('#reverse-card-btn').onclick = reverse_card;
    fetch('../get_cards', {
        method: 'POST',
        body: JSON.stringify({
        filter: 'all'
        })
      }
      )
      .then(response => response.json())
      .then(result => { 
        console.log(result)           
        card_set = new Card_set (result.cards);
        update_game()
        })
})


