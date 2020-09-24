Module.register("MMM-TuyaSL", {

    // Default module config.
    defaults: {
      colour: false,
      updateInterval: 300 * 1000, // minimal is 5 minutes (300*1000 ms) => TUYA policy
      userName : 'a@b.com',
      password : 'xxx',
      countryCode: 'ID',
      bizType: 'smart_life',
      from: 'tuya',
      showOnlyOnline: false,
      showOnlyOn: false,
      showLabel: true,
      timeout: 3000,
      animationSpeed: 2.5 * 1000, // Speed of the update animation. (milliseconds)
    },

    getStyles: function () {
        return ["font-awesome.css", "MMM-TuyaSL.css"];
    },

    // Define required translations.
    getTranslations: function() {
      return {
        'en': 'translations/en.json',
        'id': 'translations/id.json'
      };
    },

    getCommands: function(commander) {
      commander.add({
        command: 'tuyasl',
        description: this.translate("TXT_TUYASL_DESC"),
        callback: 'cmd_tuyasl'
      });
    },

    cmd_tuyasl: function(command, handler) {
      var text = "*" + this.translate("TXT_TUYASL") + "*\n";
      if (this.devices) {
        for (var i = 0; i < this.devices.length; i++) {
          if (this.devices[i].type != 'scene') {
            text += "*" + this.devices[i].alias + "*: ";
            text += "`" + (this.devices[i].online ? this.translate("TXT_TUYASL_ONLINE") : this.translate("TXT_TUYASL_OFFLINE")) + "/" + (this.devices[i].on_off ? this.translate("TXT_TUYASL_ON") : this.translate("TXT_TUYASL_OFF")) + "`\n";
          }
        }
      }
      else {
        text = this.translate("NO_DATA") + "\n";
      }
      handler.reply("TEXT", text, {parse_mode:'Markdown'});
    },

    // Define start sequence.
    start: function () {
        var self = this;
        var devices = [];
        const DEFAULT_INTERVAL = 125;
        if (self.config.updateInterval < DEFAULT_INTERVAL*1000) self.config.updateInterval = DEFAULT_INTERVAL*1000; // minimal is 300*1000 ms

        //this.getLogin();
        this.getData();
        /*setInterval(() => {
          this.getData();
        }, self.config.updateInterval);*/
    },

    // Override dom generator.
    getDom: function () {
        var wrapper = document.createElement("div");
        var self = this;

        if (self.devices && self.devices.length > 0) {
          var table = document.createElement("table");
          table.classList.add("small", "table", "align-left");

          if (this.config.showLabel)
            table.appendChild(this.createLabelRow());

          for (var i = 0; i < self.devices.length; i++) {
            //console.log(`DEBUG: devices[i]-status: ${self.devices[i].alias}|${self.devices[i].type}|${self.devices[i].online}|${self.devices[i].on_off}`);
            if (self.config.showOnlyOnline) {
              if (self.devices[i].online) {
                if (self.config.showOnlyOn) {
                  if (self.devices[i].on_off) {
                    domAction(self.devices[i], self.config);
                  }
                }
                else {
                  domAction(self.devices[i], self.config);
                }
              }
            }
            else {
              domAction(self.devices[i], self.config);
            }
          }

          function domAction(device, config) {
            if (device.type != 'scene') {
              var row = document.createElement("tr");
              var room = document.createElement("td");
              console.debug(device.alias);
              room.innerHTML = device.alias;
              row.appendChild(room);
              var lightsallLabel = document.createElement("td");
              lightsallLabel.classList.add("centered");

              var lightstatus = document.createElement("i");
              //console.log(`DEBUG: device-status: ${device.alias}|${device.type}|${device.online}|${device.on_off}`);
              if (device.online) {
                lightstatus.classList.add("fa", device.on_off ? (device.type == "light" ? "fa-lightbulb-o" : "fa-toggle-on") : "fa-times");
              }
              else {
                lightstatus.classList.add("fa", "fa-unlink");
              }
              if (config.colour) {
                lightstatus.classList.add("lights-all-on");
              }
              lightsallLabel.appendChild(lightstatus);
              row.appendChild(lightsallLabel);
              table.appendChild(row);
            }
          }
          wrapper.appendChild(table);
        } else {
          wrapper.innerHTML = this.translate("NO_DATA");
          wrapper.className = "dimmed light small";
        }
        return wrapper;
    },

    createLabelRow: function () {

        var labelRow = document.createElement("tr");

        var roomiconlabel = document.createElement("th");
        var typeIcon = document.createElement("room");
        typeIcon.classList.add("fa", "fa-home");
        roomiconlabel.appendChild(typeIcon);
        labelRow.appendChild(roomiconlabel);

        var lightsonlabel = document.createElement("th");
        lightsonlabel.classList.add("centered");
        var typeIcon = document.createElement("lightson");
        //typeIcon.classList.add("fa", "fa-lightbulb-o");
        typeIcon.innerHTML = this.translate("LIGHTS_ON");
        lightsonlabel.appendChild(typeIcon);
        labelRow.appendChild(lightsonlabel);

        var lightsonlabel = document.createElement("th");
        lightsonlabel.classList.add("centered");

        return labelRow;
    },

    getLogin: function () {
      this.notificationReceived('TUYASL_NETWORK_LOGIN');
    },

    getData: function () {
      this.notificationReceived('TUYASL_NETWORK_SEARCH');
    },

    notificationReceived: function(notification, payload, sender) {
      console.log(this.name + " received " + notification + " notification");
      this.sendSocketNotification(notification, {config: this.config, payload: payload});
    },

    socketNotificationReceived: function(notification, payload) {
      var self = this;
      console.log(this.name + " received " + notification + " socket notification");
      if (notification == 'TUYASL_NETWORK_LOGIN_RESULT') {
        //console.log(`DEBUG: payload.loginData=${payload.loginData.success}|${payload.loginData.access_token}|${payload.loginData.expires_in}`);
        if (payload.loginData.success) {
          // try to getDeviceList
          //console.log('DEBUG: before sendSocketNotification(TUYASL_NETWORK_SEARCH)');
          self.sendSocketNotification('TUYASL_NETWORK_SEARCH', {config: this.config, payload: payload});
          //self.getData();
        }
        else {
          function retryLogin() {
            self.notificationReceived('TUYASL_NETWORK_LOGIN');
          }
          // retry login after some period
          //console.log('DEBUG: before retry login');
          setTimeout(retryLogin, self.config.timeout + 100);
        }
      }
      else if (notification == 'TUYASL_NETWORK_SEARCH_RESULT') {
        this.devices = payload.devices;
        this.updateDom(self.config.animationSpeed);

        function refreshDeviceList() {
          self.notificationReceived('TUYASL_NETWORK_SEARCH');
        }
        // retry login after some period
        //console.log('DEBUG: before refreshDeviceList');
        setTimeout(refreshDeviceList, self.config.updateInterval);
      }
    }
});
