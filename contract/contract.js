const uuid = require('uuid/v1');

class SmartContract{
    constructor(index, timestamp, amount, sender, recipient){
        this.index = index;
        this.timestamp = timestamp;
        this.sender = sender;
        this.recipient = recipient;
        this.amount = amount
    }

    makeContract(){
        var sender = this.sender;
        var recipient = this.recipient;
        var amount = this.amount;
        if (amount > 1500) {
            var transaction = {
                amount: amount,
                sender: sender,
                recipient: recipient,
                id: uuid().split('-').join('')
                
            }
            return transaction;
        } else {
            return false;
        } 
    }
}

Smart = new SmartContract("1",Date.now(),"me","her",1502);
console.log(Smart.makeContract())

module.exports = SmartContract;