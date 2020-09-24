/* Magic Mirror
 * Node Helper: MMM-TuyaSL
 *
 * By Slamet PS/slametps@gmail.com
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
const axios = require('axios');
const qs = require('qs');
const fs = require('fs');

//let logLevel;
//let client;
var arrDevices = [];
var arrDevicesItem;
var accessToken;
var loginDataResult = {success: false};
var regionTuya;

module.exports = NodeHelper.create({
	// Subclass start method.
	start: function() {
		console.log("Starting node_helper.js for MMM-TuyaSL.");
    regionTuya = 'eu';
	},

  dump: function(v, s) {
    s = s || 1;
    var t = '';
    switch (typeof v) {
      case "object":
        t += "\n";
        for (var i in v) {
          t += Array(s).join(" ")+i+": ";
          t += this.dump(v[i], s+3);
        }
        break;
      default: //number, string, boolean, null, undefined
        t += v+" ("+typeof v+")\n";
        break;
    }
    return t;
  },

  login: function (config, params) {
    //console.log('DEBUG: Login to TUYA...');
    that = this;
    //console.log(`config.userName : ${config.userName}`);
    //console.log(`config.password : ${config.password}`);
    //console.log(`config.timeout  : ${config.timeout}`);

    try {
      async function loginTuya() {
        //console.log('DEBUG: here');
        //console.log(`DEBUG: config.userName : ${config.userName}`);
        //console.log(`DEBUG: config.password : ${config.password}`);
        //console.log(`DEBUG: config.timeout  : ${config.timeout}`);
        let configAx = {
          headers: {"Content-type" : "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0"},
          responseType: "json",
          timeout: config.timeout
        };

        let paramsAx = {
          "userName": config.userName,
		      "password": config.password,
		      "countryCode": config.countryCode,
		      "bizType": config.bizType,
		      "from": config.from
        };

        try {
          let res = await axios.post('https://px1.tuyaeu.com/homeassistant/auth.do', qs.stringify(paramsAx), configAx);

          // debugging
          //console.log('DEBUG: after request for login');
          //console.log(`DEBUG: Status code: ${res.status}`);
          //console.log(`DEBUG: Status text: ${res.statusText}`);
          //console.log(`DEBUG: data       : ${res.data}`);

          if (res.status == '200') {
            // check is response is expected (accessToken)
            if (res.data.responseStatus) {
              // got failed response
              console.log(`ERROR: Got unsuccessful response (${res.data.errorMsg})`);
            }
            else {
              // assume it is a successful response
              // debugging
              //console.log('DEBUG: before assignment');
              //console.log(`DEBUG: success data (accessToken  = [${res.data.access_token}])`);
              //console.log(`DEBUG: success data (refreshToken = [${res.data.refresh_token}])`);
              //console.log(`DEBUG: success data (tokenType    = [${res.data.token_type}])`);
              //console.log(`DEBUG: success data (expiresIn    = [${res.data.expires_in}])`);

              // save the response
              loginDataResult = {
                "access_token": res.data.access_token,
                "refresh_token": res.data.refresh_token,
                "token_type": res.data.token_type,
                "expires_in": res.data.expires_in,
                "success": true
              }

              // debugging
              //console.log('DEBUG: after assignment');
              //console.log(`DEBUG: success data (accessToken  = [${loginDataResult.access_token}])`);
              //console.log(`DEBUG: success data (refreshToken = [${loginDataResult.refresh_token}])`);
              //console.log(`DEBUG: success data (tokenType    = [${loginDataResult.token_type}])`);
              //console.log(`DEBUG: success data (expiresIn    = [${loginDataResult.expires_in}])`);

              // save accessToken to file
              try {
                fs.writeFileSync('/tmp/mmm-tuyasl-token.txt', loginDataResult.access_token);
                //console.log('DEBUG: write accessToken [' + loginDataResult.access_token + '] succesfully');
              }
              catch (e) {
                console.log('ERROR: ', e.stack);
              }
            }
          }
          else {
            // http response is invalid
            console.log(`ERROR: HTTP response is not successfull (${res.status}:${res.statusText})`);
          }
        }
        catch(e) {
          console.log('ERROR: ', e.stack);
        }

      }

      loginTuya();

    }
    catch (e) {
      console.log('ERROR: ', e.stack);
    }
  },

  search: function (config, params) {
    console.log('Getting device list...');
    // clear-up arrDevices
    while (arrDevices.length > 0) {
      arrDevices.pop();
    }
    that = this;

    // get saved accessToken
    try {
      var data = fs.readFileSync('/tmp/mmm-tuyasl-token.txt', 'ascii');
      that.accessToken = data.toString().replace(/\r?\n|\r/g, "");
      //console.log('DEBUG: read accessToken ['+that.accessToken+']');
    }
    catch (e) {
      console.log('ERROR:', e.stack);
    }

    //console.log('DEBUG: saved accessToken ['+that.accessToken+']');

    try {
      async function getDeviceList() {
        let configAx = {
          headers: {"Content-type" : "application/json", "User-Agent": "Mozilla/5.0"},
          responseType: "json",
          timeout: config.timeout
        };

        //console.log('DEBUG: accessToken ['+that.accessToken+']');
        let params = '{"header": {"name": "Discovery", "namespace": "discovery", "payloadVersion": 1}, "payload": {"accessToken": "' + that.accessToken + '"}}';

        try {
          let res = await axios.post('https://px1.tuya' + regionTuya + '.com/homeassistant/skill', params, configAx);
          console.log(`DEBUG: regionTuya     : ${regionTuya}`);
          if (regionTuya == 'eu') regionTuya = 'us';
          else if (regionTuya == 'us') regionTuya = 'cn';
          else if (regionTuya == 'cn') regionTuya = 'eu';

          //console.log(`DEBUG: Status code    : ${res.status}`);
          //console.log(`DEBUG: Status text    : ${res.statusText}`);
          //console.log(`DEBUG: Request method : ${res.request.method}`);
          //console.log(`DEBUG: Path           : ${res.request.path}`);
          //console.log(`DEBUG: Date           : ${res.headers.date}`);
          //console.log(`DEBUG: Data           : ${res.data}`);
          //console.log(`DEBUG: config         : ${res.config}`);
          //console.log('Data.request: ' + this.dump(res.request));
          //console.log(`Data: ` + (${res.data}).toSource());
          //console.log(`DEBUG: Data.code      : ${res.data.header.code}`);
          //console.log(`DEBUG: Data.payloadVersion: ${res.data.header.payloadVersion}`);

          if ("header" in res.data && "code" in res.data.header && res.data.header.code === 'SUCCESS') {
            try {
              function myDeviceItem(value, index, array) {
                deviceOnline = value.data.online;
                //deviceOnline = (value.data.online === "false" ? false : value.data.online);
                deviceState = (value.data.state == "true" ? true : (value.data.state == "false" ? false : value.data.state));
                arrDevicesItem = {alias:value.name, type:value.dev_type, online:deviceOnline, on_off:deviceState};
                arrDevices.push(arrDevicesItem);
              }

              res.data.payload.devices.forEach(myDeviceItem);
              console.log(`DEBUG: Number of Devices = ${arrDevices.length}`);
              //console.log(`DEBUG: Device-List ${that.dump(arrDevices)}`);
            }
            catch (e) {
              console.log('ERROR: ' + e.stack);
            }
          }
          else {
            console.log(`ERROR: getDeviceList is failed (${res.data.header.code})`);
            // notif to retry login (and get new accessToken)
            if (res.data.header.code == 'InvalidAccessTokenError') {
              that.sendSocketNotification('TUYASL_NETWORK_LOGIN_RESULT', {loginData: {success:false}});
            }
          }
        }
        catch (e) {
          console.log('ERROR: ' + e.stack);
        }
      }

      getDeviceList();

    } catch (e) {
      console.log('ERROR: ' + e.stack);
    }
  },

	socketNotificationReceived: function(notification, payload) {
    console.log(this.name + " node helper received a socket notification: " + notification + " - Payload: " + payload);
    if (notification == "TUYASL_NETWORK_LOGIN") {
      //console.log("DEBUG: TuyaSL NETWORK LOGIN");
      this.login(payload.config, {});
      var that = this;

      function sendInfoLogin() {
        that.sendSocketNotification('TUYASL_NETWORK_LOGIN_RESULT', {loginData: loginDataResult});
      }

      setTimeout(sendInfoLogin, payload.config.timeout + 100);
      //console.log("DEBUG: TuyaSL LOGIN END");
    }
    else if (notification == "TUYASL_NETWORK_SEARCH") {
      //console.log("DEBUG: TuyaSL SEARCH BEGIN");
      this.search(payload.config, {});
      var that = this;

      function sendInfo() {
        if (arrDevices.length >= 1) {
          //console.log("DEBUG: 1-PRINT OUTPUT LENGTH = " + arrDevices.length);
          arrDevices.sort(function(a, b) {
            var x = a.alias.toLowerCase();
            var y = b.alias.toLowerCase();
            if (x < y) {return -1;}
            if (x > y) {return 1;}
          });
          //console.log("DEBUG: arrDevices = [" + this.dump(arrDevices) + "]");
          //console.log("DEBUG: 2-PRINT OUTPUT LENGTH = " + arrDevices.length);
        }
        that.sendSocketNotification('TUYASL_NETWORK_SEARCH_RESULT', {devices: arrDevices});
      }

      setTimeout(sendInfo, payload.config.timeout + 100);
      //console.log('DEBUG: ' + payload.config.timeout + " ms -> CHECK arrDevices-" + arrDevices.length);
      //console.log("DEBUG: TuyaSL SEARCH END");
    }
	},
});
