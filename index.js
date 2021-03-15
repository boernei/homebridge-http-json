var Service, Characteristic, FakeGatoHistoryService;
var superagent = require('superagent');


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
}

HttpAccessory.prototype = {

    getServices: function () {
        this.log("getServices")
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Bernhard Hering")
            .setCharacteristic(Characteristic.Model, "HTTP Resol")
            .setCharacteristic(Characteristic.SerialNumber, "ACME#1")


        this.services.push(informationService);

        for (var i = this.sensors.length - 1; i >= 0; i--) {
            let sensor = this.sensors[i];
            let url = this.url;
            this.log("Setting up: " + sensor.name);

            this.temperatureService = new Service[sensor.service](sensor.name);

            this.temperatureService.log = this.log;


            sensor.loggingService = new FakeGatoHistoryService('room', this, {
                size: 360 * 24 * 6,
                storage: 'fs'
            });

            this.temperatureService.getCharacteristic(Characteristic[sensor.caractheristic])
                .setProps({minValue: -10, maxValue: 100, minStep: 0.1})
                .on('get', this.getState.bind(this, sensor.loggingService, url, sensor.service, sensor.field));

            this.services.push(sensor.loggingService);
            this.services.push(this.temperatureService);

            this.timer_temp = setInterval(this.updateState.bind(this, sensor.loggingService, url, sensor.service, sensor.field), 1 * 60000);
        }

        return this.services;
    },
    getState: function (loggingService, url, servicetype, sensorfield, callback) {
        superagent.get(url).end(function (err, res) {
            console.log(err)
            res.body.forEach(function (element) {
                if (element["name"] == sensorfield) {
                    var reading = element["rawValue"];
                    this.addHistoryCallback(this, null, loggingService, servicetype, reading);
                    callback(null, reading)
                }
            });
        });
    },
    updateState: function (loggingService, url, sensorfield, servicetype, callback) {
        this.getState(this, url, loggingService, sensorfield, servicetype, addHistoryCallback)
    },

};

addHistoryCallback = function(err, loggingService, servicetype, temp) {
    console.log("addHistoryCallback " + temp)
    if (err) return console.error(err);
    console.log(self)
    if (servicetype == Temperature) {
        loggingService.addEntry({
            time: Math.round(new Date().valueOf() / 1000),
            temp: reading,
            humidity: 0,
            ppm: 0
        })
    } else {
        loggingService.addEntry({
            time: Math.round(new Date().valueOf() / 1000),
            temp: 0,
            humidity: reading,
            ppm: 0
        })
    }
}

