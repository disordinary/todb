"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var chunk_size = 512; //size in bytes of a chunk of db
var max_doc_size = 9; //max doc (key value pair) size of 99.99 MB
var byte_size_pad = Array(max_doc_size).fill().reduce(function (prev) {
	return prev = (prev || "") + "0";
}); //the padding string for they bytes, 8 0s

var Todb = function () {
	function Todb(path_to_db, cb) {
		var _this = this;

		_classCallCheck(this, Todb);

		this.path = path_to_db;
		this.queue = [];
		this._kv = {};
		this._db_fd;
		this._logs_fd;
		this._logs_fd_size;
		this.locked = true;

		this._loadDatabase(function (err) {
			_this._loadLogs(function (err) {
				cb(err, _this);
			});
		});
	}

	_createClass(Todb, [{
		key: "_loadDatabase",
		value: function _loadDatabase(cb) {
			cb();
		}
	}, {
		key: "_loadLogs",
		value: function _loadLogs(cb) {
			var _this2 = this;

			this.locked = true;
			fs.stat(this.path + '.log', function (err, stats) {
				if (err && err.code == 'ENOENT') {
					_this2._logs_fd_size = 0;
				} else {
					_this2._logs_fd_size = stats.size;
				}

				fs.open(_this2.path + '.log', 'a+', function (err, fd) {
					_this2._logs_fd = fd;

					//load log into memory
					_this2._logReadRecord(_this2._logs_fd, 0, function (err, record, offset) {
						//console.log( record.toString() );
						cb();
					});
				});

				_this2.locked = false;
			});
		}
	}, {
		key: "_logReadRecord",
		value: function _logReadRecord(fd, start, cb) {
			var _this3 = this;

			if (start === this._logs_fd_size) {
				return cb();
			}
			this._read(fd, start, max_doc_size - 1, function (err, offset, buffer) {
				_this3._read(fd, offset, +buffer.toString(), function (err, offset, buf) {
					//cb( err , buf , offset );
					//console.log( buf.toString());
					var record = JSON.parse(buf);
					switch (record.verb) {
						case "put":
							_this3._kv[record.key] = record.value;
							break;
						default:
							break;
					}
					_this3._logReadRecord(fd, offset, cb);
				});
			});
		}
	}, {
		key: "_read",
		value: function _read(fd, start, length, cb) {

			var buf = new Buffer(length);

			fs.read(fd, buf, 0, length, start, function (err, bytesRead, buffer) {
				cb(err, start + length, buffer);
			});
		}
	}, {
		key: "_processQueues",
		value: function _processQueues() {
			var _this4 = this;

			if (this.locked || this.queue.length === 0) return;

			this.locked = true;
			var item = this.queue[0];

			//if item is succesfully written to disk:
			var doc = JSON.stringify(item);
			var bytes = pad(byte_size_pad, Buffer.byteLength(doc));

			var output = new Buffer(bytes + doc);

			fs.write(this._logs_fd, output, 0, output.byteLength, function (err) {

				//two verbs, put and delete
				if (item.verb === "put") {
					_this4._kv[item.key] = item.value;
				} else {
					delete _this4._kv[item.key];
				}

				item.cb(err);
			});
			this.queue.shift();
			this.locked = false;
		}
	}, {
		key: "put",
		value: function put(key, value, cb) {
			this.queue.push({ key: key, value: value, verb: 'put', cb: cb });
			this._processQueues();
		}
	}, {
		key: "get",
		value: function get(key, cb) {
			var val = this._kv[key];
			if (val) {
				return cb(null, val);
			}
			//query made db
		}
	}, {
		key: "del",
		value: function del(key, cb) {
			this.queue.push({ key: key, verb: 'del', cb: cb });
		}
	}, {
		key: "close",
		value: function close() {
			//closes the db
			fs.close(this._logs_fd);
			//fs.close( this._db_fd );
		}
	}, {
		key: "locked",
		get: function get() {
			return this._locked;
		},
		set: function set(value) {
			if (value === false) {
				//when we unlock we immediately process the queue
				process.nextTick(this._processQueues.bind(this));
			}
			this._locked = value;
		}
	}]);

	return Todb;
}();

function pad(pad, str) {
	return (pad + str).slice(-pad.length);
}

module.exports = Todb;

