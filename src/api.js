const express = require('express');
const md5File = require('md5-file')
const app = express();
const bodyParser = require('body-parser');
const urlendcodedParser = bodyParser.urlencoded({extended: false});
const path = require('path');
app.use(bodyParser.json());
var addr = require('url');
const uuid = require('uuid/v1');
const nodeAddr = uuid();
const port = process.argv[2];
const reqPromise = require('request-promise');
const handle = require('hbs');
const partialspath = 'C:/Users/Kaori/Desktop/HandleBars/blockchain/views/partials';
app.use( express.static( "public" ) );
console.log(partialspath)
handle.registerPartials(partialspath);

const Blockchain = require('../src/blockchain');
const SupariCoin = new Blockchain();
const Contract = require('../contract/contract')


app.set('view engine', 'hbs');

panel1 = "<div class='card border-dark m-2' style='max-width: 18rem;'>";
panel2 = "<div class='card-header bg-info border-dark'>";
panel3 = "</div><div class='card-body bg-info text-white'>";
panel4 = "<p class='card-text'> ";
panel5 = "<br></p> </div></div> ";


app.get('/', function(req, res){
    res.render('Home')
});


app.get('/Mining', function(req,res){
    console.log(typeof(SupariCoin.pendingTransactions));
    console.log(typeof(JSON.stringify(SupariCoin.pendingTransactions)));
    res.render('Mining', {pending:SupariCoin.pendingTransactions});
});


app.get('/error', function(req, res){
    res.render('error')
});

app.get('/Ledger', function (req, res){
    var chain = SupariCoin.chain;
    var c =[];
    for(var i=0;i<chain.length;i++){
        c.push(chain[i].transactions);
    }
    res.render('Ledger', {c});
});


app.post('/transaction', function (req, res) {
    const transaction = req.body;
    const blockIndex = SupariCoin.addTransactionToPendingTransactions(transaction);

    res.json(
        {
            message: `Transaction will be added to block with index: ${blockIndex}`
        }
    );
});


app.get('/blockchain', function (req, res) {
    coin = SupariCoin.chain;
    nodes = SupariCoin.networkNodes;
    nodeUrl = SupariCoin.nodeUrl;
    list = [];
    for(var i =0;i<coin.length;i++){
        coins = '';
        coins = panel1 + panel2 + "<b> Index: </b>" +  coin[i].index  + panel3 + panel4 + "<b> Previous Hash: <br></b> " + coin[i].prevBlockHash +" <br>" +
        " <b> Current Hash: <br></b> " +  coin[i].hash + "<br> <b> Timestamp: <br></b> " +  coin[i].timestamp + "<br> <b> Nonce: <br></b> " + coin[i].nonce + panel5;      
        list.push(coins);
    }
        res.render('blockchain', {list:list, nodes:nodes, nodeUrl:nodeUrl, chain:JSON.stringify(SupariCoin)}); 
});


app.get('/MakeTransaction',function (req, res){
    var node = SupariCoin.nodeUrl;
    res.render('MakeTransaction',{qs:req.query,node:node})
});


app.post('/MakeTransaction', urlendcodedParser , function (req, res) {
    const transaction = SupariCoin.makeNewTransaction(
        req.body.amount,
        req.body.sender,
        req.body.recipient
    );
    SupariCoin.addTransactionToPendingTransactions(transaction);
    const requests = [];
    SupariCoin.networkNodes.forEach(networkNode => {
        const requestOptions = {
            uri: networkNode + '/transaction',
            method: 'POST',
            body: transaction,
            json: true
        };

        requests.push(reqPromise(requestOptions));
    });

    Promise.all(requests)
        .then(data => {
            res.render('MakeTransaction',{msg:"Transaction Broadcasted Successfully"})           
        }).catch(err => err);
});


app.get('/contract', function (req, res){
    res.render('contract',{qs:req.query});
});


app.post('/invoke', urlendcodedParser, function (req, res){
    sender = req.body.sender;
    recipient = req.body.recipient;
    amount = req.body.amount;
    console.log(sender,recipient,amount)
    const newContract = new Contract('1',Date.now(),amount, sender, recipient);
    const transaction = newContract.makeContract();
    console.log(newContract.makeContract());
    
    if (transaction !== false) {
        SupariCoin.addTransactionToPendingTransactions(transaction);

    const requests = [];
    SupariCoin.networkNodes.forEach(networkNode => {
        const requestOptions = {
            uri: networkNode + '/transaction',
            method: 'POST',
            body: transaction,
            json: true
        };

        requests.push(reqPromise(requestOptions));
    });

    Promise.all(requests)
        .then(data => {
            res.render('Success',{msg:"Transaction Broadcasted Successfully"})           
        }).catch(err => err);
    }
    else {
        res.render('Failed',{msg: "The values don't add up"})    }
});

app.post('/contract', urlendcodedParser, function (req, res){
   
    sender = req.get('host');
    sender = "http://" + sender;
    console.log(sender);
    const recipient = req.body.recipient;
    console.log(recipient);
    res.render('invoke',{sender:sender,recipient:recipient});
       
});

app.get('/mine', function (req, res) {
    const latestBlock = SupariCoin.getLatestBlock();
    const prevBlockHash = latestBlock.hash;
    const currentBlockData = {
        transactions: SupariCoin.pendingTransactions,
        index: latestBlock.index + 1
    }
    const nonce = SupariCoin.proofOfWork(prevBlockHash, currentBlockData);
    console.log(nonce);
    const blockHash = SupariCoin.hashBlock(prevBlockHash, currentBlockData, nonce);
    console.log(blockHash);
    const newBlock = SupariCoin.creatNewBlock(nonce, prevBlockHash, blockHash)

    const requests = [];
    SupariCoin.networkNodes.forEach(networkNode => {
        const requestOptions = {
            uri: networkNode + '/add-block',
            method: 'POST',
            body: { newBlock: newBlock },
            json: true
        };

        requests.push(reqPromise(requestOptions));
    });
        res.redirect('Ledger');
});


app.post('/add-block', function (req, res) {
    const block = req.body.newBlock;
    const latestBlock = SupariCoin.getLatestBlock();

    if ((latestBlock.hash === block.prevBlockHash)
        && (block.index === latestBlock.index + 1)) {
        SupariCoin.chain.push(block);
        SupariCoin.pendingTransactions = [];

        res.json(
            {
                message: 'Add new Block successfully!',
                newBlock: block
            }
        );
    } else {
        res.json(
            {
                message: 'Cannot add new Block!',
                newBlock: block
            }
        );
    }
});


app.get('/register-and-broadcast-node',function(req,res){
    res.render('blockchain',{qs: req.query})
})


app.post('/register-and-broadcast-node',urlendcodedParser, function (req, res) {
    var nodeUrl = req.body;
    nodeUrl = nodeUrl['url'];
    if (SupariCoin.networkNodes.indexOf(nodeUrl) == -1) {
        SupariCoin.networkNodes.push(nodeUrl);
    }

    const registerNodes = []; 
    SupariCoin.networkNodes.forEach(networkNode => {
        const requestOptions = {
            uri: networkNode + '/register-node',
            method: 'POST',
            body: { nodeUrl: nodeUrl },
            json: true
        };

        registerNodes.push(reqPromise(requestOptions));
    });

    Promise.all(registerNodes)
        .then(data => {
            const bulkRegisterOptions = {
                uri: nodeUrl + '/register-bulk-nodes',
                method: 'POST',
                body: { networkNodes: [...SupariCoin.networkNodes, SupariCoin.nodeUrl] },
                json: true
            };

            return reqPromise(bulkRegisterOptions);
        }).then(data => {
            res.redirect('blockchain');         
        }).catch(err => err);
});


app.post('/register-node', function (req, res) {
    const nodeUrl = req.body.nodeUrl;

    if ((SupariCoin.networkNodes.indexOf(nodeUrl) == -1)
        && (SupariCoin.nodeUrl !== nodeUrl)) {
        SupariCoin.networkNodes.push(nodeUrl);

        res.json(
            {
                message: 'A node registers successfully!'
            }
        );
    }
    else {
        res.json(
            {
                message: 'This node cannot register!'
            }
        );
    }
});


app.post('/register-bulk-nodes', function (req, res) {
    const networkNodes = req.body.networkNodes;

    networkNodes.forEach(nodeUrl => {
        if ((SupariCoin.networkNodes.indexOf(nodeUrl) == -1)
            && (SupariCoin.nodeUrl !== nodeUrl)) {
            SupariCoin.networkNodes.push(nodeUrl);
        }
    });

    res.json(
        {
            message: 'Registering bulk successfully!'
        }
    );
});


app.get('/consensus', function (req, res) {
    const requests = [];
    SupariCoin.networkNodes.forEach(nodeUrl => {
        const requestOptions = {
            uri: nodeUrl + '/blockchain',
            method: 'GET',
            json: true
        };
 
        requests.push(reqPromise(requestOptions));
    });
    
    Promise.all(requests)
        .then(blockchains => {
            const currentChainLength = SupariCoin.chain.length;
            let maxChainLength = currentChainLength;
            let longestChain = null;
            let pendingTransactions = null;
 
            blockchains.forEach(blockchain => {
                if (blockchain.chain.length > maxChainLength) {
                    maxChainLength = blockchain.chain.length;
                    longestChain = blockchain.chain;
                    pendingTransactions = blockchain.pendingTransactions;
                }
            });
 
            if (!longestChain ||
                (longestChain && !SupariCoin.isChainValid(longestChain))) {
                res.json({
                    message: 'Current chain cannot be replaced!',
                    chain: SupariCoin.chain
                });
            } else if (longestChain && SupariCoin.isChainValid(longestChain)) {
                SupariCoin.chain = longestChain;
                SupariCoin.pendingTransactions = pendingTransactions;
 
                res.json({
                    message: 'Chain is updated!',
                    chain: SupariCoin.chain
                });
            }
        }).catch(err => err);
});


app.get('/transaction/:id', function (req, res) {
    const id = req.params.id;
    const transactionInfo = SupariCoin.findTransactionById(id);
 
    if (transactionInfo !== null) {
        res.json({
            transaction: transactionInfo.transaction,
            block: transactionInfo.block
        });
    } else {
        res.json({
            transaction: null
        });
    }
});


app.get('/transaction', function (req, res) {
    res.render('transaction',{qs:req.query});
});


app.get('/address/:address', function (req, res) {
    var address = req.params.address;
    address = 'http://' + address;
    const data = SupariCoin.findTransactionsByAddress(address);
    res.render('record', {data:data.transactions,address: address});
});


app.post('/address/search', urlendcodedParser, function (req,res) {
    var address = req.body.address;
    res.redirect('/address/' + address);
});


app.listen(port, function () {
    console.log(`> listening on port ${port}...`);
});