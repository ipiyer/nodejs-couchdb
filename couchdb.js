var request = require('request');
var fs = require('fs');

CouchDB = module.exports = function(server){
    this.server = server || 'http://127.0.0.1:5984';
    
    var that = this;
    
    // FIX ME: it shouldn't return anything.

    var getDB = function(db){
        if (!db){
            return false
        }
        
        this.db = that.server + "/" + db;
        var that1 = this;

        request.get({uri: this.db}, function(err, res, body){
            if(err){
                return false;
            }

            body = JSON.parse(body);
            
            if (body.error){
                return {"error": db + " not exist"}
            }
        });
    }

    getDB.prototype = {
        parse : function(callback) {
            var that = this;
            return function(err, res, body) {
                if (typeof body == "string") {
                    body = JSON.parse(body);
                }
                else if (!body) {
                    body = {}
                }
                if (!err) {
                    if (body.error) {
                        err = new Error(body.reason);
                        err.error = body.error;
                        err.reason = body.reason;
                        err.statusCode = res.statusCode;
                    } else if (res.headers['etag']) {
                        body._rev = res.headers['etag'].slice(1, -1);
                    }
                }
                callback && callback(err, body);
            }
        },
        get : function(uri, callback) {
            request.get({
                uri: this.db + uri
            }, this.parse(callback));
        },
        put : function(uri, callback) {
            request.put({
                uri: this.db + uri
            }, this.parse(callback));
        },
        del : function(uri, callback) {
            request.del({
                uri: this.db + uri
            }, this.parse(callback));
        },
        putDesignDocs : function(files, callback) {
            callback = callback || function() {};

            var remaining = files.length;
            var put = function(id, doc) {
                if (!id) return callback(new Error('Document _id required.'));
                doc = typeof doc === 'string' ? doc : JSON.stringify(doc);
                request.put({
                    uri: this.db + '/' + id,
                    body: doc
                }, function(err, res) {
                    remaining--;
                    if (err) return callback(err);
                    if (!remaining) return callback(err, res);
                });
            }.bind(this);

            files.forEach(function(file) {
                if (typeof file === 'string') {
                    fs.readFile(file, 'utf8', function(err, data) {
                        if (err) return callback(err);
                        var id = data.match(/.*"_id".*?:.*?"(.*?)".*/)[1];
                        put(id, data);
                    });
                } else {
                    put(file._id, file);
                }
            }.bind(this));
        }

    }
    return getDB;
}

