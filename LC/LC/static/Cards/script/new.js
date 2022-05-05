



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
*   - remeber its 'owner' any object which owns the Wiget
*   - can generate event onChange when something internal state changes
*   @class
*   @extends {Saveable}
*/  
export class Widget extends Saveable{

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

    /**@protected*/
    _change(){
        if (this.onChange) this.onChange(this)
    }

    /** 
    * @protected
    * @returns {string} html to display
    */
    _getHTML() {
        return ''
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
    }

     /** @override */
    save_to_JSON(){
        let result = super(objectJSON) 

        this._save_attribute_to_JSON('initial_time',result)

        return result
    }

     /**
     *  @override 
     */
    show(){
        if (!super()) return false
        return true    
    }

     /** @override */
    _getHTML() {
        return `<div> ${this.value} </div>`
    }

    load_from_JSON(objectJSON){
        super(objectJSON)    
    }
}

