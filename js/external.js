const electron = require('electron'),
    ipc = electron.ipcRenderer;

let folio,
    drink;

function row(num, drink) {
    this.num = num;
    this.drink = drink;

    ko.track(this);
}

function AppViewModel() {
    this.rows = [];

    this.addRow = function () {
        if (drink && folio) {
            this.rows.push(new row(folio, drink));
        }
        console.log(this.rows)
    }

    ko.track(this);
}

window.addEventListener('DOMContentLoaded', function (event) {
    viewModel = new AppViewModel();
    
    ipc.on('order-info', (e, args) => {
        console.log("Order Recieved!");

        drink = args.drink;
        folio = args.num;

        viewModel.addRow();
    });

    ko.applyBindings(viewModel);
});

