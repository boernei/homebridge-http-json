var Service, Characteristic, FakeGatoHistoryService;
var superagent = require('superagent');

var temperatureService;
var humidityService;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    FakeGatoHistoryService = require('fakegato-history')(homebridge);
    homebridge.registerAccessory("homebridge-http-resol-json-vbus", "http-resol-json-vbus", HttpAccessory);
}

function HttpAccessory(log, config) {
    this.log = log;
    this.url = config["url"];
    this.service = config["service"];
    this.name = config["name"];
    this.sensors = config["sensors"];
    this.services = [];
    this.loggingService = new FakeGatoHistoryService('room', this, {
        size: this.log_days * 24 * 6,
        storage: 'fs'
    });
}

HttpAccessory.prototype = {

    getServices: function () {
        this.log("getServices")
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Bernhard Hering")
            .setCharacteristic(Characteristic.Model, "HTTP Resol")
            .setCharacteristic(Characteristic.SerialNumber, "ACME#1")

        //if (this.service == "Thermostat") {

        this.services.push(informationService);

        for (var i = this.sensors.length - 1; i >= 0; i--) {
            let sensor = this.sensors[i];
            let url = this.url;
            this.log("Setting up: " + sensor.name);

            this.temperatureService = new Service[sensor.service](sensor.name);

            this.temperatureService.log = this.log;

            this.temperatureService.getCharacteristic(Characteristic[sensor.caractheristic])
                .setProps({minValue: -10, maxValue: 100, minStep: 0.1})
                .on('get', this.getState.bind(this, this.url, sensor.field));

            this.services.push(this.loggingService);
            this.services.push(this.temperatureService);

            this.timer_temp = setInterval(this.updateState.bind(this, url, sensor.field), 1 * 60000);
        }
        self = this
        return this.services;
        // }
    },
    getState: function(url, sensorfield, callback) {
        superagent.get(url).end(function (err, res) {
            res.body.forEach(function (element) {
                if (element["name"] == sensorfield) {
                    var reading = element["rawValue"]
                    self.loggingService.addEntry({
                        time: Math.round(new Date().valueOf() / 1000),
                        temp: reading,
                        humidity: 50,
                        ppm: 0
                    })
                    callback(null, reading);
                }
            });
        });
    },
    addHistoryCallback: function (err, temp) {
        console.log("addHistoryCallback " + temp)
        if (err) return console.error(err);
        self.loggingService.addEntry({time: Math.round(new Date().valueOf() / 1000), temp: temp, humidity: 50, ppm: 0})
    },
    updateState:  function (url, sensorfield, callback) {
        self.getState(url, sensorfield, this.addHistoryCallback)
    },

};

