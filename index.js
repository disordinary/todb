'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var Logs = require('append-log');

var Todb = function () {
	function Todb(path_to_db, cb) {
		var _this = this;

		_classCallCheck(this, Todb);

		this.path = path_to_db;
		if (!fs.existsSync(this.path)) {
			fs.mkdirSync(this.path);
		}
		this._kv = {};
		this._peiceTable;
		new Logs(path_to_db + '/change.log', function (err, _logs) {
			_this._logs = _logs;
			_this.readFromLogs(cb);
		});
	}

	_createClass(Todb, [{
		key: 'readFromLogs',
		value: function readFromLogs(cb) {
			var _this2 = this;

			var read = this._logs.readStream();
			read.on('data', function (log) {
				if (log) {
					var log = JSON.parse(log);

					if (log.verb == 'del') {
						delete _this2._kv[log.key];
					} else {
						_this2._kv[log.key] = { value: log.value };
					}
				}
			});
			read.on('error', function (error) {
				cb(error);
			});
			read.on('end', function () {
				cb(null, _this2);
			});
		}
	}, {
		key: 'put',
		value: function put(key, value, cb) {
			var _this3 = this;

			var putObject = { key: key, value: value, verb: 'put', cb: cb };
			this._logs.write(JSON.stringify(putObject), function (err) {
				if (!err) {
					_this3._kv[key] = putObject;
					return cb();
				}
				cb(err);
			});
			//	
		}
	}, {
		key: 'get',
		value: function get(key, cb) {
			var val = this._kv[key].value;
			if (val) {
				return cb(null, val);
			}
			cb(null, undefined);
		}
	}, {
		key: 'del',
		value: function del(key, cb) {
			var _this4 = this;

			var putObject = { key: key, verb: 'del', cb: cb };
			this._logs.write(JSON.stringify(putObject), function (err) {
				if (!err) {
					_this4._kv[key] = putObject;
				}
				putObject.cb(err);
			});
		}
	}, {
		key: 'close',
		value: function close() {
			//closes the db
			//fs.close( this._logs_fd );
			//fs.close( this._db_fd );
		}
	}]);

	return Todb;
}();

function pad(pad, str) {
	return (pad + str).slice(-pad.length);
}

module.exports = Todb;

