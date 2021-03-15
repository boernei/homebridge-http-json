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

            var loggingService = new FakeGatoHistoryService('room', this.temperatureService, {
                size: 360 * 24 * 6,
                storage: 'fs'
            });

            this.temperatureService.getCharacteristic(Characteristic[sensor.caractheristic])
                .setProps({minValue: -10, maxValue: 100, minStep: 0.1})
                .on('get', this.getState.bind(this, loggingService, url, sensor.service, sensor.field));

            this.services.push(loggingService);
            this.services.push(this.temperatureService);

            this.timer_temp = setInterval(this.updateState.bind(this, loggingService, url, sensor.service, sensor.field), 1 * 6000);
        }

        return this.services;
    },
    getState: function (loggingService, url, servicetype, sensorfield, callback) {

        superagent.get(url).end(function (err, res) {
            res.body.forEach(function (element) {
                if (element["name"] == sensorfield) {
                    var reading = element["rawValue"];
                    //this.addHistoryCallback(loggingService, servicetype,sensorfield, reading);
                    callback(loggingService, servicetype,sensorfield, reading)
                }
            });
        });
    },
    updateState: function (loggingService, url, servicetype, sensorfield, callback) {

        this.getState(loggingService, url,servicetype, sensorfield , addHistoryCallback)
    },

};

addHistoryCallback = function(loggingService, servicetype,sensorfield, reading) {
    //if (err) return console.error(err);


    if (servicetype == "Temperature") {
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

