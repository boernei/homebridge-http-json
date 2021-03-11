var Service, Characteristic;
var superagent = require('superagent');

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    console.log("Hallo")
    homebridge.registerAccessory("homebridge-http-json", "http-json", HttpAccessory);
}

function HttpAccessory(log, config) {
    console.log("Init")
    this.log = log;

    this.url = config["url"];
    this.service = config["service"];
    this.name = config["name"];
    this.sensors = config["sensors"];
    console.log(this.url)
    console.log(this.sensors)
}

HttpAccessory.prototype = {
    
    getServices: function () {
        this.log("getServices")
        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Nuno Ferro")
            .setCharacteristic(Characteristic.Model, "HTTP JSON")
            .setCharacteristic(Characteristic.SerialNumber, "ACME#1")

        if (this.service == "Thermostat") {

            var services = [informationService];

            for (var i = this.sensors.length - 1; i >= 0; i--) {
                let sensor = this.sensors[i];
                let url = this.url;
                this.log("Setting up: " + sensor.name);

                newService = new Service[sensor.service](sensor.name);
                newService.getCharacteristic(Characteristic[sensor.caractheristic])
                    .on('get', function (callback) {
                        superagent.get(url).end(function (err, res) {
                            var found = false
                            res.body.forEach(function(element) {
                                console.log(element["name"]);
                                if (element["name"] == sensor.field) {
                                    callback(null, element["rawValue"]);
                                    found = true
                                }
                            });

                            if (!found) {
                                callback(null, null);
                            }

                        });
                    })
                services.push(newService);
            }

            return services;
        }
    }
};
