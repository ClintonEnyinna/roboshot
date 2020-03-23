const authenticate = require('password-hash'),
    fs = require('fs'),
    path = require('path'),
    electron = require('electron'),
    { dialog } = electron.remote,
    remote = electron.remote,
    app = remote.app,
    ipc = electron.ipcRenderer,
    serialPort = require('serialport');
Readline = require('@serialport/parser-readline');

let folderName = path.join(app.getPath('userData'), 'roboshotData'),
    ingdFile = path.join(folderName, 'ingredientes.txt'),
    cardFile = path.join(folderName, 'recetas.txt'),
    pass = path.join(folderName, 'pass.txt');

let pos,
    ingds,
    folio = 1000,
    imgFolderPath = "",
    user = false;

fs.mkdir(folderName, err => {
    if (err && err.code != 'EEXIST') throw 'up'
});

function drink(name, ingredients, price, description, image) {
    this.name = name;
    this.ingredients = ingredients;
    this.price = price;
    this.description = description;
    this.image = image;

    ko.track(this);
}

function ingredient(pos, name, price, level) {
    this.pos = pos;
    this.name = name;
    this.price = price;
    this.level = level;

    ko.track(this);
}

function sales(name, quantity, price) {
    this.name = name;
    this.quantity = quantity;
    this.price = price;
    this.date = new Date().toDateString();

    ko.track(this);
}

function hex(num) {
    this.num = num;
}

function AppViewModel() {
    this.cards = [];

    this.addCard = function() {
        if ($("#drink-name").val() != "" && ingds != "") {
            this.cards.push(new drink(`${$("#drink-name").val()}`, ingds, `${$("#drink-price").val()}`, `${$("#drink-description").val()}`, imgFolderPath));
            console.log(this.cards)
            if (user) $(".deleteBtn").css("display", "inline-block");
        }
        if (viewModel.cards.length > 0) {
            let cardData = JSON.stringify(viewModel.cards);

            fs.writeFile(cardFile, cardData, (err) => {
                if (err) {
                    return console.log(err)
                }
            });
        }
        imgFolderPath = "";
    }

    this.removeCard = card => {
        this.cards.remove(card);
        let data = JSON.stringify(this.cards);
        fs.writeFile(cardFile, data, (err) => {
            if (err) {
                return console.log(err);
            }
        });
    }

    this.sales = [];

    this.drinkOrdered = card => {

        if (this.sales != 0) {
            let match = this.sales.some(sale => {
                if (sale.name === card.name) {
                    sale.quantity++;
                    sale.price = Number(sale.price) + Number(card.price);
                    console.log(typeof sale.price)
                    return true
                }
            });
            if (!match) {
                this.sales.push(new sales(card.name, 1, card.price));
            }
        } else {
            this.sales.push(new sales(card.name, 1, card.price));
        }

        let nameWithPos = [];
        if (card.ingredients.length != 0 && this.ingredients.length != 0) {

            let bottles = card.ingredients.split(", ");

            bottles.forEach(element => {
                this.ingredients.forEach(item => {
                    if (element == item.name) {
                        data = {
                            name: item.name,
                            pos: item.pos
                        }
                        nameWithPos.push(data);
                    }
                })
            });
            console.log(nameWithPos);
            ipc.send("drink-ordered", { num: folio, drink: card.name });
            folio += 1;
        }
    }

    ko.defineProperty(this, 'grandTotal', function() {
        let total = 0;
        this.sales.forEach(sale => total += Number(sale.price));
        return total;
    });

    this.ingredients = [];

    this.addBottle = function() {

        if (this.ingredients.some(ingredient => ingredient.pos === pos)) {
            console.log("Position is occupied")
        } else {
            this.ingredients.push(new ingredient(pos, `${$("#ingdName").val()}`, `${$("#unit-price").val()}`, `${$("#quantity").val()}`));
            if (user) $(".deleteBtn").css("display", "inline-block");
        }

        if (viewModel.ingredients.length > 0) {
            let ingdData = JSON.stringify(viewModel.ingredients);
            fs.writeFile(ingdFile, ingdData, (err) => {
                if (err) {
                    return console.log(err)
                }
            });
        }
    }

    this.removeBottle = ingredient => {
        this.ingredients.remove(ingredient);
        let data = JSON.stringify(this.ingredients);
        fs.writeFile(ingdFile, data, (err) => {
            if (err) {
                return console.log(err)
            }
        });
    }

    this.hexagon = [];
    for (i = 1; i <= 20; i++) {
        this.hexagon.push(new hex(i))
    }

    ko.track(this);
}

function availablePorts() {
    serialPort.list().then(ports => {
        if (ports.length > 0) {
            let foundPort = false;
            for (let port of ports) {
                if (port.manufacturer.includes('Silicon')) {
                    foundPort = true

                    function connect(newSerial) {
                        var mySerial = newSerial;
                        console.log(mySerial);
                        mySerial = new serialPort(port.path, {
                            baudRate: 115200
                        });
                        var parser = mySerial.pipe(new Readline())
                        mySerial.on('open', _ => {
                            console.log('Serial started')
                            parser.on('data', console.log)
                            mySerial.write("connected")
                        });

                        mySerial.on('close', _ => {
                            console.log('closed');
                            reconnect();
                        });
                        mySerial.on('error', function(err) {
                            console.log('Error: ', err.message);
                            reconnect();
                        });
                    }

                    function reconnect() {
                        console.log('Iniciating Reconnect');
                        setTimeout(function() {
                            console.log('Reconnecting to Esp');
                            connect();
                        }, 2000);
                    };
                    connect(port.path);
                }
            }
            if (foundPort == false) {
                console.log("Esp not found!");
            }
        } else {
            console.log("no port available");
        }
    }).catch(err => {
        console.log(err)
    });
}

//upload image
function uploadImageFile() {

    // Open a dialog to ask for the file path
    dialog.showOpenDialog({
        properties: ['openFile']
    }).then(result => {

        if (result.canceled) {
            console.log("No file selected!")
        } else {
            const filePath = result.filePaths[0];
            console.log(app.getPath('userData'))
            const fileName = path.basename(filePath);
            imgFolderPath = path.join(app.getPath('userData'), 'roboshotData', 'img', fileName);

            fs.copyFile(filePath, imgFolderPath, (err) => {
                if (err) throw err;
                console.log('Image ' + fileName + ' stored.');
            });
            $(".image-name").text(fileName)
        }
    });
}

window.addEventListener('DOMContentLoaded', function(event) {
    viewModel = new AppViewModel();

    availablePorts();

    $("#logInOut").on("click", _ => {

        $("#password").val("");

        let target = $(".custom").attr('data-target-custom');

        if ($("#logInOut").text() === "Log Out!") {

            console.log("logged out");
            $(".admin").prop('disabled', true);

            user = false;

            $(".deleteBtn").css("display", "none");
            $("#logInOut").text("");
            $("#logInOut").text("Log In!");
            $(target).modal('hide');
        } else {
            $(target).modal('show');
        }
    });

    $("#loginBtn").on("click", _ => {

        let password = $("#password").val();
        var content = "";

        fs.readFile(pass, (err, data) => {
            if (err) {
                return console.log(err);
            }
            content = data.toString();

            if (!authenticate.isHashed(password) && content !== "") {
                if (authenticate.verify(password, content)) {
                    $(".deleteBtn").css("display", "inline-block");
                    $("#logInOut").text("");
                    $("#logInOut").text("Log Out!");
                    $(".admin").prop('disabled', false);

                    console.log("logged in");
                    user = true;
                } else {
                    console.log("incorrect password")
                }
            } else {
                console.log("what are you trying to do?")
            }
        });
    });

    //prevent page from refreshing when the enter key is pressed
    $('.modal').on('keypress', function(e) {
        if (e.keyCode === 13) {
            e.preventDefault();
        }
    });

    //clears modal content on close
    $('#newRecipe').on('hidden.bs.modal', function() {
        $(this).find('form').trigger('reset');
    });

    $(".hexagon-container").on("click", (event) => {
        pos = event.target.innerHTML;
    });

    $('.container').on('click', '.details', (event) => {
        let selectedCard = viewModel.cards[event.target.id]

        $(".see-more-description").text("");
        $(".show-image").attr("src", 'img/camera.jpg');

        $(".see-more-title").text(selectedCard.name);
        $(".see-more-description").text(selectedCard.description);
        $(".show-image").attr("src", selectedCard.image);
    });

    $(".upload-image").on("click", () => {
        uploadImageFile()
    });

    $('#add').on('click', _ => {
        ingds = [];

        $('.ing-list').each(function(index, value) {
            if (this.value != "") {
                ingds.push(this.id)
            }
        });
        ingds = ingds.join(", ");
    });

    $(".input-fields").on("click",  '.input-number-increment', function(){
        var el = $(this).prev();
        increment(el)
    });

    $(".input-fields").on("click",  '.input-number-decrement', function(){
        var el = $(this).next();
        decrement(el)
    });

    function decrement(el) {
        var value = el.val();
        value = Number(value) - 10;
        if (value <= 0) {
            value = "";
        }
        el.val(value);
    }

    function increment(el) {
        var value = el.val();
        value = Number(value) + 10;
        el.val(value);
    }

    fs.readFile(cardFile, (err, data) => {
        if (err) {
            return console.log(err);
        }
        let storedData = JSON.parse(data);

        storedData.forEach(element => {
            viewModel.cards.push(element)
        });
    });

    fs.readFile(ingdFile, (err, data) => {
        if (err) {
            return console.log(err);
        }
        let storedData = JSON.parse(data);

        storedData.forEach(element => {
            viewModel.ingredients.push(element)
        });
    });

    ipc.on('app-close', _ => {
        //do something here before app closes
        ipc.send('closed');
    });

    ko.applyBindings(viewModel);
});