// Regular expression for identifying &amp;key=value lists.
var paramsMatcher = /^(?:&[^=]+=[^&]*)+/;

var LOCATION = require('can-globals/location/location');
var canReflect = require("can-reflect");

var ObservationRecorder = require("can-observation-recorder");
var queues = require("can-queues");
var KeyTree = require("can-key-tree");
var SimpleObservable = require("can-simple-observable");

var domEvents = require("can-dom-events");

function getHash(root){
    var loc = LOCATION();
    return loc.href.split(root)[1] || "";
}

function HashchangeObservable() {
    var dispatchHandlers =  this.dispatchHandlers.bind(this);
    var self = this;
		this._value = "";
    this.handlers = new KeyTree([Object,Array],{
        onFirst: function(){
            self._value = getHash(self.root);
            domEvents.addEventListener(window, 'hashchange', dispatchHandlers);
        },
        onEmpty: function(){
            domEvents.removeEventListener(window, 'hashchange', dispatchHandlers);
        }
    });
}
HashchangeObservable.prototype = Object.create(SimpleObservable.prototype);
HashchangeObservable.constructor = HashchangeObservable;
canReflect.assign(HashchangeObservable.prototype,{
    // STUFF NEEDED FOR can-route integration
    paramsMatcher: paramsMatcher,
    querySeparator: "&",
    // don't greedily match slashes in routing rules
    matchSlashes: false,
    root: "#!",
    dispatchHandlers: function() {
        var old = this._value;
        this._value = getHash(this.root);
        if(old !== this._value) {
            queues.enqueueByQueue(this.handlers.getNode([]), this, [this._value, old]
                //!steal-remove-start
                /* jshint laxcomma: true */
                , null
                , [ canReflect.getName(this), "changed to", this._value, "from", old ]
                /* jshint laxcomma: false */
                //!steal-remove-end
            );
        }
    },
    get: function(){
        ObservationRecorder.add(this);
        return getHash(this.root);
    },
    set: function(path){
        var loc = LOCATION();
        if(!path && !loc.hash) {

        } else if(loc.hash !== "#" + path) {
            loc.hash = this.root.substring(1) + path;
        }
        return path;
    }
});

Object.defineProperty(HashchangeObservable.prototype, "value", {
	get: function(){
		return canReflect.getValue(this);
	},
	set: function(value){
		canReflect.setValue(this, value);
	}
});

canReflect.assignSymbols(HashchangeObservable.prototype,{
	"can.getValue": HashchangeObservable.prototype.get,
	"can.setValue": HashchangeObservable.prototype.set,
	"can.onValue": HashchangeObservable.prototype.on,
	"can.offValue": HashchangeObservable.prototype.off,
	"can.isMapLike": false,
	"can.valueHasDependencies": function(){
		return true;
	},
	//!steal-remove-start
	"can.getName": function() {
		return "HashchangeObservable<" + this._value + ">";
	},
	//!steal-remove-end
});

module.exports = HashchangeObservable;
