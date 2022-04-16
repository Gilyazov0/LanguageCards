
var game 

//Игровая карта. Хранит данные карты в виде сырых данных JSON
class Card {
    constructor(card_data,front,back,show_tags = true) {
        this.card_data = card_data;
        this.front = front;
        this.back = back;
        this.show_tags = show_tags;
    }
    getHTML(front = true ) {

        let attributes = (front) ? this.front : this.back;
        let show_tags = (front) ? false : this.show_tags;
        let tags = this.card_data.tags;
        
        var result = 
        `
        <div class="card border-success mb-3 game-card">
            <div class="card-header bg-transparent border-success "></div>
            <div class="card-body text-success ">`;
        for (var i=0; i< attributes.length;i++) {
            const FA = this.card_data.FAs[attributes[i]]
            if (FA != undefined){
                result +=  `<h5 class="card-title ">${this.card_data.FAs[attributes[i]]}</h5> \n`;
            }              
        }
                //<p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>

        var footer =''
        if (show_tags){
            for (var i=0; i< tags.length;i++) {
                footer +='<' + tags[i] + '>';
            }
        }

        result += `
            </div>
            <div class="card-footer bg-transparent border-success ">${footer}</div>
        </div>
        `   
        return result
    }
}

//Игра. Хранит данные игры (список карты в виде данных JSON)
class Game {
    // методы класса
    constructor(cards) {
        this.cards = cards;
        this.current_card_number = 0;
        this.front = ['На русском'];
        this.back = ['Транскрипция','На иврите'];
        this.show_tags = true;
    }
    
    cards_count() {
        return this.cards.length
    }    

    get_current_card_number() {
        return this.current_card_number    
    }
    get_card(number) {
       
       return new Card( this.cards[number] ,this.front,this.back,this.show_tags)
    }
  }

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('document loaded')

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
            cards_data = result.cards; 
            game = new Game (cards_data);
            card = game.get_card(game.get_current_card_number());

            const container = document.querySelector('#current_card');

            container.innerHTML = card.getHTML()+card.getHTML(false);     
        })
})


