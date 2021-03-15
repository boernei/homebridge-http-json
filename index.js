var fs = require('fs');
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
    this.deviceType = config["service"] || this.accessory;
    this.services = [];
}

HttpAccessory.prototype = {
    identify: function(callback) {
        this.log("Identify requested!");
        callback(); // success
    },
    getServices: function () {
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Bernhard Hering")
            .setCharacteristic(Characteristic.Model, this.deviceType)
            .setCharacteristic(Characteristic.SerialNumber, this.name)

        this.services.push(informationService);

        for (var i = this.sensors.length - 1; i >= 0; i--) {
            let sensor = this.sensors[i];
            let url = this.url;
            this.log("Setting up: " + sensor.name);
            var temperatureService = new Service[sensor.service](sensor.name);

            temperatureService.log = this.log;

            var loggingService = new FakeGatoHistoryService('room', temperatureService, {
                size: 360 * 24 * 6,
                storage: 'fs'
            });

            temperatureService.getCharacteristic(Characteristic[sensor.caractheristic])
                .setProps({minValue: -10, maxValue: 100, minStep: 0.1})
                .on('get', this.getState.bind(this,temperatureService, loggingService, url, sensor.service, sensor.field));

            this.services.push(loggingService);
            this.services.push(temperatureService);

            this.timer_temp = setInterval(this.updateState.bind(this, temperatureService, loggingService, url, sensor.service, sensor.field), 1 * 60000);
        }

        return this.services;
    },
    getState: function (service, loggingService, url, servicetype, sensorfield, callback) {

        superagent.get(url).end(function (err, res) {
            if (res != null) {
                res.body.forEach(function (element) {
                    if (element["name"] == sensorfield) {
                        var reading = element["rawValue"];
                        callback(service, loggingService, servicetype,sensorfield, reading)
                    }
                });
            }
        });
    },
    updateState: function (service, loggingService, url, servicetype, sensorfield, callback) {

        this.getState(service,loggingService, url,servicetype, sensorfield , addHistoryCallback)
    },

};



addHistoryCallback = function(service, loggingService, servicetype,sensorfield, reading) {
    //if (err) return console.error(err);

    if (servicetype == "TemperatureSensor") {
        console.log("update service");
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(reading, null);
        loggingService.addEntry({
            time: Math.round(new Date().valueOf() / 1000),
            temp: reading,
            humidity: 0,
            ppm: 0
        })
    } else {
        service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(reading, null);
        loggingService.addEntry({
            time: Math.round(new Date().valueOf() / 1000),
            temp: 0,
            humidity: reading,
            ppm: 0
        })
    }
}

