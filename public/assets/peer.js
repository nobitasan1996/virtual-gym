! function o(s, a, u) {
    function c(t, e) {
        if (!a[t]) {
            if (!s[t]) {
                var i = "function" == typeof require && require;
                if (!e && i) return i(t, !0);
                if (p) return p(t, !0);
                var n = new Error("Cannot find module '" + t + "'");
                throw n.code = "MODULE_NOT_FOUND", n
            }
            var r = a[t] = {
                exports: {}
            };
            s[t][0].call(r.exports, function(e) {
                return c(s[t][1][e] || e)
            }, r, r.exports, o, s, a, u)
        }
        return a[t].exports
    }
    for (var p = "function" == typeof require && require, e = 0; e < u.length; e++) c(u[e]);
    return c
}({
    1: [function(e, t, i) {
        "use strict";
        Object.defineProperty(i, "__esModule", {
            value: !0
        }), i.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription, i.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection, i.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate
    }, {}],
    2: [function(e, t, i) {
        "use strict";
        Object.defineProperty(i, "__esModule", {
            value: !0
        });
        var a = e("./util"),
            n = e("eventemitter3"),
            r = e("./negotiator"),
            o = e("reliable");

        function s(e, t, i) {
            if (!(this instanceof s)) return new s(e, t, i);
            n.EventEmitter.call(this), this.options = a.util.extend({
                serialization: "binary",
                reliable: !1
            }, i), this.open = !1, this.type = "data", this.peer = e, this.provider = t, this.id = this.options.connectionId || s._idPrefix + a.util.randomToken(), this.label = this.options.label || this.id, this.metadata = this.options.metadata, this.serialization = this.options.serialization, this.reliable = this.options.reliable, this._buffer = [], this._buffering = !1, this.bufferSize = 0, this._chunkedData = {}, this.options._payload && (this._peerBrowser = this.options._payload.browser), r.Negotiator.startConnection(this, this.options._payload || {
                originator: !0
            })
        }
        i.DataConnection = s, a.util.inherits(s, n.EventEmitter), s._idPrefix = "dc_", s.prototype.initialize = function(e) {
            this._dc = this.dataChannel = e, this._configureDataChannel()
        }, s.prototype._configureDataChannel = function() {
            var t = this;
            a.util.supports.sctp && (this._dc.binaryType = "arraybuffer"), this._dc.onopen = function() {
                a.util.log("Data channel connection success"), t.open = !0, t.emit("open")
            }, !a.util.supports.sctp && this.reliable && (this._reliable = new o.Reliable(this._dc, a.util.debug)), this._reliable ? this._reliable.onmessage = function(e) {
                t.emit("data", e)
            } : this._dc.onmessage = function(e) {
                t._handleDataMessage(e)
            }, this._dc.onclose = function(e) {
                a.util.log("DataChannel closed for:", t.peer), t.close()
            }
        }, s.prototype._handleDataMessage = function(e) {
            var t = this,
                i = e.data,
                n = i.constructor;
            if ("binary" === this.serialization || "binary-utf8" === this.serialization) {
                if (n === Blob) return void a.util.blobToArrayBuffer(i, function(e) {
                    i = a.util.unpack(e), t.emit("data", i)
                });
                if (n === ArrayBuffer) i = a.util.unpack(i);
                else if (n === String) {
                    var r = a.util.binaryStringToArrayBuffer(i);
                    i = a.util.unpack(r)
                }
            } else "json" === this.serialization && (i = JSON.parse(i));
            if (i.__peerData) {
                var o = i.__peerData,
                    s = this._chunkedData[o] || {
                        data: [],
                        count: 0,
                        total: i.total
                    };
                return s.data[i.n] = i.data, s.count += 1, s.total === s.count && (delete this._chunkedData[o], i = new Blob(s.data), this._handleDataMessage({
                    data: i
                })), void(this._chunkedData[o] = s)
            }
            this.emit("data", i)
        }, s.prototype.close = function() {
            this.open && (this.open = !1, r.Negotiator.cleanup(this), this.emit("close"))
        }, s.prototype.send = function(e, t) {
            if (this.open)
                if (this._reliable) this._reliable.send(e);
                else {
                    var i = this;
                    if ("json" === this.serialization) this._bufferedSend(JSON.stringify(e));
                    else if ("binary" === this.serialization || "binary-utf8" === this.serialization) {
                        var n = a.util.pack(e);
                        if ((a.util.chunkedBrowsers[this._peerBrowser] || a.util.chunkedBrowsers[a.util.browser]) && !t && n.size > a.util.chunkedMTU) return void this._sendChunks(n);
                        a.util.supports.sctp ? a.util.supports.binaryBlob ? this._bufferedSend(n) : a.util.blobToArrayBuffer(n, function(e) {
                            i._bufferedSend(e)
                        }) : a.util.blobToBinaryString(n, function(e) {
                            i._bufferedSend(e)
                        })
                    } else this._bufferedSend(e)
                } else this.emit("error", new Error("Connection is not open. You should listen for the `open` event before sending messages."))
        }, s.prototype._bufferedSend = function(e) {
            !this._buffering && this._trySend(e) || (this._buffer.push(e), this.bufferSize = this._buffer.length)
        }, s.prototype._trySend = function(e) {
            try {
                this._dc.send(e)
            } catch (e) {
                this._buffering = !0;
                var t = this;
                return setTimeout(function() {
                    t._buffering = !1, t._tryBuffer()
                }, 100), !1
            }
            return !0
        }, s.prototype._tryBuffer = function() {
            if (0 !== this._buffer.length) {
                var e = this._buffer[0];
                this._trySend(e) && (this._buffer.shift(), this.bufferSize = this._buffer.length, this._tryBuffer())
            }
        }, s.prototype._sendChunks = function(e) {
            for (var t = a.util.chunk(e), i = 0, n = t.length; i < n; i += 1) {
                e = t[i];
                this.send(e, !0)
            }
        }, s.prototype.handleMessage = function(e) {
            var t = e.payload;
            switch (e.type) {
                case "ANSWER":
                    this._peerBrowser = t.browser, r.Negotiator.handleSDP(e.type, this, t.sdp);
                    break;
                case "CANDIDATE":
                    r.Negotiator.handleCandidate(this, t.candidate);
                    break;
                default:
                    a.util.warn("Unrecognized message type:", e.type, "from peer:", this.peer)
            }
        }
    }, {
        "./negotiator": 5,
        "./util": 8,
        eventemitter3: 9,
        reliable: 12
    }],
    3: [function(e, t, i) {
        "use strict";
        var n = this && this.__importDefault || function(e) {
            return e && e.__esModule ? e : {
                default: e
            }
        };
        Object.defineProperty(i, "__esModule", {
            value: !0
        });
        var r = e("./util"),
            o = e("./adapter"),
            s = e("./socket"),
            a = e("./mediaconnection"),
            u = e("./dataconnection"),
            c = e("./peer"),
            p = e("./negotiator"),
            l = n(e("js-binarypack"));
        window.Socket = s.Socket, window.MediaConnection = a.MediaConnection, window.DataConnection = u.DataConnection, window.Peer = c.Peer, window.RTCPeerConnection = o.RTCPeerConnection, window.RTCSessionDescription = o.RTCSessionDescription, window.RTCIceCandidate = o.RTCIceCandidate, window.Negotiator = p.Negotiator, window.util = r.util, window.BinaryPack = l.default, i.default = c.Peer
    }, {
        "./adapter": 1,
        "./dataconnection": 2,
        "./mediaconnection": 4,
        "./negotiator": 5,
        "./peer": 6,
        "./socket": 7,
        "./util": 8,
        "js-binarypack": 10
    }],
    4: [function(e, t, i) {
        "use strict";
        Object.defineProperty(i, "__esModule", {
            value: !0
        });
        var r = e("./util"),
            n = e("eventemitter3"),
            o = e("./negotiator");

        function s(e, t, i) {
            if (!(this instanceof s)) return new s(e, t, i);
            n.EventEmitter.call(this), this.options = r.util.extend({}, i), this.open = !1, this.type = "media", this.peer = e, this.provider = t, this.metadata = this.options.metadata, this.localStream = this.options._stream, this.id = this.options.connectionId || s._idPrefix + r.util.randomToken(), this.localStream && o.Negotiator.startConnection(this, {
                _stream: this.localStream,
                originator: !0
            })
        }
        i.MediaConnection = s, r.util.inherits(s, n.EventEmitter), s._idPrefix = "mc_", s.prototype.addStream = function(e) {
            r.util.log("Receiving stream", e), this.remoteStream = e, this.emit("stream", e)
        }, s.prototype.handleMessage = function(e) {
            var t = e.payload;
            switch (e.type) {
                case "ANSWER":
                    o.Negotiator.handleSDP(e.type, this, t.sdp), this.open = !0;
                    break;
                case "CANDIDATE":
                    o.Negotiator.handleCandidate(this, t.candidate);
                    break;
                default:
                    r.util.warn("Unrecognized message type:", e.type, "from peer:", this.peer)
            }
        }, s.prototype.answer = function(e) {
            if (this.localStream) r.util.warn("Local stream already exists on this MediaConnection. Are you answering a call twice?");
            else {
                this.options._payload._stream = e, this.localStream = e, o.Negotiator.startConnection(this, this.options._payload);
                for (var t = this.provider._getMessages(this.id), i = 0, n = t.length; i < n; i += 1) this.handleMessage(t[i]);
                this.open = !0
            }
        }, s.prototype.close = function() {
            this.open && (this.open = !1, o.Negotiator.cleanup(this), this.emit("close"))
        }
    }, {
        "./negotiator": 5,
        "./util": 8,
        eventemitter3: 9
    }],
    5: [function(e, t, o) {
        "use strict";
        Object.defineProperty(o, "__esModule", {
            value: !0
        });
        var s = e("./util"),
            r = e("./adapter");
        o.Negotiator = {
            pcs: {
                data: {},
                media: {}
            },
            queue: []
        }, o.Negotiator._idPrefix = "pc_", o.Negotiator.startConnection = function(e, t) {
            var i = o.Negotiator._getPeerConnection(e, t);
            if (e.pc = e.peerConnection = i, "media" === e.type && t._stream && i.addStream(t._stream), t.originator) {
                if ("data" === e.type) {
                    var n = {};
                    s.util.supports.sctp || (n = {
                        reliable: t.reliable
                    });
                    var r = i.createDataChannel(e.label, n);
                    e.initialize(r)
                }
                o.Negotiator._makeOffer(e)
            } else o.Negotiator.handleSDP("OFFER", e, t.sdp)
        }, o.Negotiator._getPeerConnection = function(e, t) {
            o.Negotiator.pcs[e.type] || s.util.error(e.type + " is not a valid connection type. Maybe you overrode the `type` property somewhere."), o.Negotiator.pcs[e.type][e.peer] || (o.Negotiator.pcs[e.type][e.peer] = {});
            var i;
            o.Negotiator.pcs[e.type][e.peer];
            return t.pc && (i = o.Negotiator.pcs[e.type][e.peer][t.pc]), i && "stable" === i.signalingState || (i = o.Negotiator._startPeerConnection(e)), i
        }, o.Negotiator._startPeerConnection = function(e) {
            s.util.log("Creating RTCPeerConnection.");
            var t = o.Negotiator._idPrefix + s.util.randomToken(),
                i = {};
            "data" !== e.type || s.util.supports.sctp ? "media" === e.type && (i = {
                optional: [{
                    DtlsSrtpKeyAgreement: !0
                }]
            }) : i = {
                optional: [{
                    RtpDataChannels: !0
                }]
            };
            var n = new r.RTCPeerConnection(e.provider.options.config, i);
            return o.Negotiator.pcs[e.type][e.peer][t] = n, o.Negotiator._setupListeners(e, n, t), n
        }, o.Negotiator._setupListeners = function(t, e, i) {
            var n = t.peer,
                r = t.id,
                o = t.provider;
            s.util.log("Listening for ICE candidates."), e.onicecandidate = function(e) {
                e.candidate && (s.util.log("Received ICE candidates for:", t.peer), o.socket.send({
                    type: "CANDIDATE",
                    payload: {
                        candidate: e.candidate,
                        type: t.type,
                        connectionId: t.id
                    },
                    dst: n
                }))
            }, e.oniceconnectionstatechange = function() {
                switch (e.iceConnectionState) {
                    case "failed":
                        s.util.log("iceConnectionState is disconnected, closing connections to " + n), t.emit("error", new Error("Negotiation of connection to " + n + " failed.")), t.close();
                        break;
                    case "disconnected":
                        s.util.log("iceConnectionState is disconnected, closing connections to " + n);
                        break;
                    case "completed":
                        e.onicecandidate = s.util.noop
                }
            }, e.onicechange = e.oniceconnectionstatechange, s.util.log("Listening for data channel"), e.ondatachannel = function(e) {
                s.util.log("Received data channel");
                var t = e.channel;
                o.getConnection(n, r).initialize(t)
            }, s.util.log("Listening for remote stream"), e.ontrack = function(e) {
                s.util.log("Received remote stream");
                var t = e.streams[0],
                    i = o.getConnection(n, r);
                "media" === i.type && i.addStream(t)
            }
        }, o.Negotiator.cleanup = function(e) {
            s.util.log("Cleaning up PeerConnection to " + e.peer);
            var t = e.pc;
            t && (t.readyState && "closed" !== t.readyState || "closed" !== t.signalingState) && (t.close(), e.pc = null)
        }, o.Negotiator._makeOffer = function(t) {
            var i = t.pc;
            i.createOffer(function(e) {
                s.util.log("Created offer."), !s.util.supports.sctp && "data" === t.type && t.reliable && (e.sdp = Reliable.higherBandwidthSDP(e.sdp)), i.setLocalDescription(e, function() {
                    s.util.log("Set localDescription: offer", "for:", t.peer), t.provider.socket.send({
                        type: "OFFER",
                        payload: {
                            sdp: e,
                            type: t.type,
                            label: t.label,
                            connectionId: t.id,
                            reliable: t.reliable,
                            serialization: t.serialization,
                            metadata: t.metadata,
                            browser: s.util.browser
                        },
                        dst: t.peer
                    })
                }, function(e) {
                    "OperationError: Failed to set local offer sdp: Called in wrong state: kHaveRemoteOffer" != e && (t.provider.emitError("webrtc", e), s.util.log("Failed to setLocalDescription, ", e))
                })
            }, function(e) {
                t.provider.emitError("webrtc", e), s.util.log("Failed to createOffer, ", e)
            }, t.options.constraints)
        }, o.Negotiator._makeAnswer = function(t) {
            var i = t.pc;
            i.createAnswer(function(e) {
                s.util.log("Created answer."), !s.util.supports.sctp && "data" === t.type && t.reliable && (e.sdp = Reliable.higherBandwidthSDP(e.sdp)), i.setLocalDescription(e, function() {
                    s.util.log("Set localDescription: answer", "for:", t.peer), t.provider.socket.send({
                        type: "ANSWER",
                        payload: {
                            sdp: e,
                            type: t.type,
                            connectionId: t.id,
                            browser: s.util.browser
                        },
                        dst: t.peer
                    })
                }, function(e) {
                    t.provider.emitError("webrtc", e), s.util.log("Failed to setLocalDescription, ", e)
                })
            }, function(e) {
                t.provider.emitError("webrtc", e), s.util.log("Failed to create answer, ", e)
            })
        }, o.Negotiator.handleSDP = function(e, t, i) {
            i = new r.RTCSessionDescription(i);
            var n = t.pc;
            s.util.log("Setting remote description", i), n.setRemoteDescription(i, function() {
                s.util.log("Set remoteDescription:", e, "for:", t.peer), "OFFER" === e && o.Negotiator._makeAnswer(t)
            }, function(e) {
                t.provider.emitError("webrtc", e), s.util.log("Failed to setRemoteDescription, ", e)
            })
        }, o.Negotiator.handleCandidate = function(e, t) {
            var i = t.candidate,
                n = t.sdpMLineIndex;
            e.pc.addIceCandidate(new r.RTCIceCandidate({
                sdpMLineIndex: n,
                candidate: i
            })), s.util.log("Added ICE candidate for:", e.peer)
        }
    }, {
        "./adapter": 1,
        "./util": 8
    }],
    6: [function(e, t, i) {
        "use strict";
        Object.defineProperty(i, "__esModule", {
            value: !0
        });
        var p = e("./util"),
            n = e("eventemitter3"),
            r = e("./socket"),
            l = e("./mediaconnection"),
            h = e("./dataconnection");

        function o(e, t) {
            if (!(this instanceof o)) return new o(e, t);
            n.EventEmitter.call(this), e && e.constructor == Object ? (t = e, e = void 0) : e && (e = e.toString()), (t = p.util.extend({
                debug: 0,
                host: p.util.CLOUD_HOST,
                port: p.util.CLOUD_PORT,
                path: "/",
                token: p.util.randomToken(),
                config: p.util.defaultConfig
            }, t)).key = "peerjs", "/" === (this.options = t).host && (t.host = window.location.hostname), "/" !== t.path[0] && (t.path = "/" + t.path), "/" !== t.path[t.path.length - 1] && (t.path += "/"), void 0 === t.secure && t.host !== p.util.CLOUD_HOST ? t.secure = p.util.isSecure() : t.host == p.util.CLOUD_HOST && (t.secure = !0), t.logFunction && p.util.setLogFunction(t.logFunction), p.util.setLogLevel(t.debug), p.util.supports.audioVideo || p.util.supports.data ? p.util.validateId(e) ? (this.destroyed = !1, this.disconnected = !1, this.open = !1, this.connections = {}, this._lostMessages = {}, this._initializeServerConnection(), e ? this._initialize(e) : this._retrieveId()) : this._delayedAbort("invalid-id", 'ID "' + e + '" is invalid') : this._delayedAbort("browser-incompatible", "The current browser does not support WebRTC")
        }
        i.Peer = o, p.util.inherits(o, n.EventEmitter), o.prototype._initializeServerConnection = function() {
            var t = this;
            this.socket = new r.Socket(this.options.secure, this.options.host, this.options.port, this.options.path, this.options.key, this.options.wsport), this.socket.on("message", function(e) {
                t._handleMessage(e)
            }), this.socket.on("error", function(e) {
                t._abort("socket-error", e)
            }), this.socket.on("disconnected", function() {
                t.disconnected || (t.emitError("network", "Lost connection to server."), t.disconnect())
            }), this.socket.on("close", function() {
                t.disconnected || t._abort("socket-closed", "Underlying socket is already closed.")
            })
        }, o.prototype._retrieveId = function(e) {
            var i = this,
                t = new XMLHttpRequest,
                n = (this.options.secure ? "https://" : "http://") + this.options.host + ":" + this.options.port + this.options.path + this.options.key + "/id";
            n += "?ts=" + (new Date).getTime() + Math.random(), t.open("get", n, !0), t.onerror = function(e) {
                p.util.error("Error retrieving ID", e);
                var t = "";
                "/" === i.options.path && i.options.host !== p.util.CLOUD_HOST && (t = " If you passed in a `path` to your self-hosted PeerServer, you'll also need to pass in that same path when creating a new Peer."), i._abort("server-error", "Could not get an ID from the server." + t)
            }, t.onreadystatechange = function() {
                4 === t.readyState && (200 === t.status ? i._initialize(t.responseText) : t.onerror())
            }, t.send(null)
        }, o.prototype._initialize = function(e) {
            this.id = e, this.socket.start(this.id, this.options.token)
        }, o.prototype._handleMessage = function(e) {
            var t, i = e.type,
                n = e.payload,
                r = e.src;
            switch (i) {
                case "OPEN":
                    this.emit("open", this.id), this.open = !0;
                    break;
                case "ERROR":
                    this._abort("server-error", n.msg);
                    break;
                case "ID-TAKEN":
                    this._abort("unavailable-id", "ID `" + this.id + "` is taken");
                    break;
                case "INVALID-KEY":
                    this._abort("invalid-key", 'API KEY "' + this.options.key + '" is invalid');
                    break;
                case "LEAVE":
                    p.util.log("Received leave message from", r), this._cleanupPeer(r);
                    break;
                case "EXPIRE":
                    this.emitError("peer-unavailable", "Could not connect to peer " + r);
                    break;
                case "OFFER":
                    var o = n.connectionId;
                    if ((t = this.getConnection(r, o)) && (t.close(), p.util.warn("Offer received for existing Connection ID:", o)), "media" === n.type) t = new l.MediaConnection(r, this, {
                        connectionId: o,
                        _payload: n,
                        metadata: n.metadata
                    }), this._addConnection(r, t), this.emit("call", t);
                    else {
                        if ("data" !== n.type) return void p.util.warn("Received malformed connection type:", n.type);
                        t = new h.DataConnection(r, this, {
                            connectionId: o,
                            _payload: n,
                            metadata: n.metadata,
                            label: n.label,
                            serialization: n.serialization,
                            reliable: n.reliable
                        }), this._addConnection(r, t), this.emit("connection", t)
                    }
                    for (var s = this._getMessages(o), a = 0, u = s.length; a < u; a += 1) t.handleMessage(s[a]);
                    break;
                default:
                    if (!n) return void p.util.warn("You received a malformed message from " + r + " of type " + i);
                    var c = n.connectionId;
                    (t = this.getConnection(r, c)) && t.pc ? t.handleMessage(e) : c ? this._storeMessage(c, e) : p.util.warn("You received an unrecognized message:", e)
            }
        }, o.prototype._storeMessage = function(e, t) {
            this._lostMessages[e] || (this._lostMessages[e] = []), this._lostMessages[e].push(t)
        }, o.prototype._getMessages = function(e) {
            var t = this._lostMessages[e];
            return t ? (delete this._lostMessages[e], t) : []
        }, o.prototype.connect = function(e, t) {
            if (this.disconnected) return p.util.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect, or call reconnect on this peer if you believe its ID to still be available."), void this.emitError("disconnected", "Cannot connect to new Peer after disconnecting from server.");
            var i = new h.DataConnection(e, this, t);
            return this._addConnection(e, i), i
        }, o.prototype.call = function(e, t, i) {
            if (this.disconnected) return p.util.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect."), void this.emitError("disconnected", "Cannot connect to new Peer after disconnecting from server.");
            if (t) {
                (i = i || {})._stream = t;
                var n = new l.MediaConnection(e, this, i);
                return this._addConnection(e, n), n
            }
            p.util.error("To call a peer, you must provide a stream from your browser's `getUserMedia`.")
        }, o.prototype._addConnection = function(e, t) {
            this.connections[e] || (this.connections[e] = []), this.connections[e].push(t)
        }, o.prototype.getConnection = function(e, t) {
            var i = this.connections[e];
            if (!i) return null;
            for (var n = 0, r = i.length; n < r; n++)
                if (i[n].id === t) return i[n];
            return null
        }, o.prototype._delayedAbort = function(e, t) {
            var i = this;
            p.util.setZeroTimeout(function() {
                i._abort(e, t)
            })
        }, o.prototype._abort = function(e, t) {
            p.util.error("Aborting!"), this._lastServerId ? this.disconnect() : this.destroy(), this.emitError(e, t)
        }, o.prototype.emitError = function(e, t) {
            p.util.error("Error:", t), "string" == typeof t && (t = new Error(t)), t.type = e, this.emit("error", t)
        }, o.prototype.destroy = function() {
            this.destroyed || (this._cleanup(), this.disconnect(), this.destroyed = !0)
        }, o.prototype._cleanup = function() {
            if (this.connections)
                for (var e = Object.keys(this.connections), t = 0, i = e.length; t < i; t++) this._cleanupPeer(e[t]);
            this.emit("close")
        }, o.prototype._cleanupPeer = function(e) {
            for (var t = this.connections[e], i = 0, n = t.length; i < n; i += 1) t[i].close()
        }, o.prototype.disconnect = function() {
            var e = this;
            p.util.setZeroTimeout(function() {
                e.disconnected || (e.disconnected = !0, e.open = !1, e.socket && e.socket.close(), e.emit("disconnected", e.id), e._lastServerId = e.id, e.id = null)
            })
        }, o.prototype.reconnect = function() {
            if (this.disconnected && !this.destroyed) p.util.log("Attempting reconnection to server with ID " + this._lastServerId), this.disconnected = !1, this._initializeServerConnection(), this._initialize(this._lastServerId);
            else {
                if (this.destroyed) throw new Error("This peer cannot reconnect to the server. It has already been destroyed.");
                if (this.disconnected || this.open) throw new Error("Peer " + this.id + " cannot reconnect because it is not disconnected from the server!");
                p.util.error("In a hurry? We're still trying to make the initial connection!")
            }
        }, o.prototype.listAllPeers = function(t) {
            t = t || function() {};
            var i = this,
                n = new XMLHttpRequest,
                e = (this.options.secure ? "https://" : "http://") + this.options.host + ":" + this.options.port + this.options.path + this.options.key + "/peers";
            e += "?ts=" + (new Date).getTime() + Math.random(), n.open("get", e, !0), n.onerror = function(e) {
                i._abort("server-error", "Could not get peers from the server."), t([])
            }, n.onreadystatechange = function() {
                if (4 === n.readyState) {
                    if (401 === n.status) {
                        var e = "";
                        throw e = i.options.host !== p.util.CLOUD_HOST ? "It looks like you're using the cloud server. You can email team@peerjs.com to enable peer listing for your API key." : "You need to enable `allow_discovery` on your self-hosted PeerServer to use this feature.", t([]), new Error("It doesn't look like you have permission to list peers IDs. " + e)
                    }
                    200 !== n.status ? t([]) : t(JSON.parse(n.responseText))
                }
            }, n.send(null)
        }
    }, {
        "./dataconnection": 2,
        "./mediaconnection": 4,
        "./socket": 7,
        "./util": 8,
        eventemitter3: 9
    }],
    7: [function(e, t, i) {
        "use strict";
        Object.defineProperty(i, "__esModule", {
            value: !0
        });
        var o = e("./util"),
            u = e("eventemitter3");

        function c(e, t, i, n, r, o) {
            if (!(this instanceof c)) return new c(e, t, i, n, r, o);
            o = o || i, u.EventEmitter.call(this), this.disconnected = !1, this._queue = [];
            var s = e ? "https://" : "http://",
                a = e ? "wss://" : "ws://";
            this._httpUrl = s + t + ":" + i + n + r, this._wsUrl = a + t + ":" + o + n + "peerjs?key=" + r
        }
        i.Socket = c, o.util.inherits(c, u.EventEmitter), c.prototype.start = function(e, t) {
            this.id = e, this._httpUrl += "/" + e + "/" + t, this._wsUrl += "&id=" + e + "&token=" + t, this._startXhrStream(), this._startWebSocket()
        }, c.prototype._startWebSocket = function(e) {
            var i = this;
            this._socket || (this._socket = new WebSocket(this._wsUrl), this._socket.onmessage = function(t) {
                try {
                    var e = JSON.parse(t.data)
                } catch (e) {
                    return void o.util.log("Invalid server message", t.data)
                }
                i.emit("message", e)
            }, this._socket.onclose = function(e) {
                o.util.log("Socket closed."), i.disconnected = !0, i.emit("disconnected")
            }, this._socket.onopen = function() {
                i._timeout && (clearTimeout(i._timeout), setTimeout(function() {
                    i._http.abort(), i._http = null
                }, 5e3)), i._sendQueuedMessages(), o.util.log("Socket open")
            })
        }, c.prototype._startXhrStream = function(e) {
            try {
                var t = this;
                this._http = new XMLHttpRequest, this._http._index = 1, this._http._streamIndex = e || 0, this._http.open("post", this._httpUrl + "/id?i=" + this._http._streamIndex, !0), this._http.onerror = function() {
                    clearTimeout(t._timeout), t.emit("disconnected")
                }, this._http.onreadystatechange = function() {
                    2 == this.readyState && this.old ? (this.old.abort(), delete this.old) : 2 < this.readyState && 200 === this.status && this.responseText && t._handleStream(this)
                }, this._http.send(null), this._setHTTPTimeout()
            } catch (e) {
                o.util.log("XMLHttpRequest not available; defaulting to WebSockets")
            }
        }, c.prototype._handleStream = function(t) {
            var e = t.responseText.split("\n");
            if (t._buffer)
                for (; 0 < t._buffer.length;) {
                    var i = t._buffer.shift(),
                        n = e[i];
                    try {
                        n = JSON.parse(n)
                    } catch (e) {
                        t._buffer.shift(i);
                        break
                    }
                    this.emit("message", n)
                }
            var r = e[t._index];
            if (r)
                if (t._index += 1, t._index === e.length) t._buffer || (t._buffer = []), t._buffer.push(t._index - 1);
                else {
                    try {
                        r = JSON.parse(r)
                    } catch (e) {
                        return void o.util.log("Invalid server message", r)
                    }
                    this.emit("message", r)
                }
        }, c.prototype._setHTTPTimeout = function() {
            var t = this;
            this._timeout = setTimeout(function() {
                var e = t._http;
                t._wsOpen() ? e.abort() : (t._startXhrStream(e._streamIndex + 1), t._http.old = e)
            }, 25e3)
        }, c.prototype._wsOpen = function() {
            return this._socket && 1 == this._socket.readyState
        }, c.prototype._sendQueuedMessages = function() {
            for (var e = 0, t = this._queue.length; e < t; e += 1) this.send(this._queue[e])
        }, c.prototype.send = function(e) {
            if (!this.disconnected)
                if (this.id)
                    if (e.type) {
                        var t = JSON.stringify(e);
                        if (this._wsOpen()) this._socket.send(t);
                        else {
                            var i = new XMLHttpRequest,
                                n = this._httpUrl + "/" + e.type.toLowerCase();
                            i.open("post", n, !0), i.setRequestHeader("Content-Type", "application/json"), i.send(t)
                        }
                    } else this.emit("error", "Invalid message");
            else this._queue.push(e)
        }, c.prototype.close = function() {
            !this.disconnected && this._wsOpen() && (this._socket.close(), this.disconnected = !0)
        }
    }, {
        "./util": 8,
        eventemitter3: 9
    }],
    8: [function(e, t, c) {
        "use strict";
        var i = this && this.__importDefault || function(e) {
            return e && e.__esModule ? e : {
                default: e
            }
        };
        Object.defineProperty(c, "__esModule", {
            value: !0
        });
        var u = {
                iceServers: [{
                    urls: "stun:stun.l.google.com:19302"
                }]
            },
            p = 1,
            n = i(e("js-binarypack")),
            l = e("./adapter");
        c.util = {
            noop: function() {},
            CLOUD_HOST: "0.peerjs.com",
            CLOUD_PORT: 443,
            chunkedBrowsers: {
                Chrome: 1
            },
            chunkedMTU: 16300,
            logLevel: 0,
            setLogLevel: function(e) {
                var t = parseInt(e, 10);
                isNaN(parseInt(e, 10)) ? c.util.logLevel = e ? 3 : 0 : c.util.logLevel = t, c.util.log = c.util.warn = c.util.error = c.util.noop, 0 < c.util.logLevel && (c.util.error = c.util._printWith("ERROR")), 1 < c.util.logLevel && (c.util.warn = c.util._printWith("WARNING")), 2 < c.util.logLevel && (c.util.log = c.util._print)
            },
            setLogFunction: function(e) {
                e.constructor !== Function ? c.util.warn("The log function you passed in is not a function. Defaulting to regular logs.") : c.util._print = e
            },
            _printWith: function(t) {
                return function() {
                    var e = Array.prototype.slice.call(arguments);
                    e.unshift(t), c.util._print.apply(c.util, e)
                }
            },
            _print: function() {
                var e = !1,
                    t = Array.prototype.slice.call(arguments);
                t.unshift("PeerJS: ");
                for (var i = 0, n = t.length; i < n; i++) t[i] instanceof Error && (t[i] = "(" + t[i].name + ") " + t[i].message, e = !0);
                e ? console.error.apply(console, t) : console.log.apply(console, t)
            },
            defaultConfig: u,
            browser: window.mozRTCPeerConnection ? "Firefox" : window.webkitRTCPeerConnection ? "Chrome" : window.RTCPeerConnection ? "Supported" : "Unsupported",
            supports: function() {
                if (void 0 === l.RTCPeerConnection) return {};
                var e, t, i = !0,
                    n = !0,
                    r = !1,
                    o = !1,
                    s = !!window.webkitRTCPeerConnection;
                try {
                    e = new l.RTCPeerConnection(u, {
                        optional: [{
                            RtpDataChannels: !0
                        }]
                    })
                } catch (e) {
                    n = i = !1
                }
                if (i) try {
                    t = e.createDataChannel("_PEERJSTEST")
                } catch (e) {
                    i = !1
                }
                if (i) {
                    try {
                        t.binaryType = "blob", r = !0
                    } catch (e) {}
                    var a = new l.RTCPeerConnection(u, {});
                    try {
                        o = a.createDataChannel("_PEERJSRELIABLETEST", {}).reliable
                    } catch (e) {}
                    a.close()
                }
                return n && (n = !!e.addStream), e && e.close(), {
                    audioVideo: n,
                    data: i,
                    binaryBlob: r,
                    binary: o,
                    reliable: o,
                    sctp: o,
                    onnegotiationneeded: s
                }
            }(),
            validateId: function(e) {
                return !e || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(e)
            },
            validateKey: function(e) {
                return !e || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(e)
            },
            debug: !1,
            inherits: function(e, t) {
                e.super_ = t, e.prototype = Object.create(t.prototype, {
                    constructor: {
                        value: e,
                        enumerable: !1,
                        writable: !0,
                        configurable: !0
                    }
                })
            },
            extend: function(e, t) {
                for (var i in t) t.hasOwnProperty(i) && (e[i] = t[i]);
                return e
            },
            pack: n.default.pack,
            unpack: n.default.unpack,
            log: function() {
                if (c.util.debug) {
                    var e = !1,
                        t = Array.prototype.slice.call(arguments);
                    t.unshift("PeerJS: ");
                    for (var i = 0, n = t.length; i < n; i++) t[i] instanceof Error && (t[i] = "(" + t[i].name + ") " + t[i].message, e = !0);
                    e ? console.error.apply(console, t) : console.log.apply(console, t)
                }
            },
            setZeroTimeout: function(t) {
                var i = [],
                    n = "zero-timeout-message";

                function e(e) {
                    e.source == t && e.data == n && (e.stopPropagation && e.stopPropagation(), i.length && i.shift()())
                }
                return t.addEventListener ? t.addEventListener("message", e, !0) : t.attachEvent && t.attachEvent("onmessage", e),
                    function(e) {
                        i.push(e), t.postMessage(n, "*")
                    }
            }(window),
            chunk: function(e) {
                for (var t, i = [], n = e.size, r = t = 0, o = Math.ceil(n / c.util.chunkedMTU); r < n;) {
                    var s = Math.min(n, r + c.util.chunkedMTU),
                        a = e.slice(r, s),
                        u = {
                            __peerData: p,
                            n: t,
                            data: a,
                            total: o
                        };
                    i.push(u), r = s, t += 1
                }
                return p += 1, i
            },
            blobToArrayBuffer: function(e, t) {
                var i = new FileReader;
                i.onload = function(e) {
                    t(e.target.result)
                }, i.readAsArrayBuffer(e)
            },
            blobToBinaryString: function(e, t) {
                var i = new FileReader;
                i.onload = function(e) {
                    t(e.target.result)
                }, i.readAsBinaryString(e)
            },
            binaryStringToArrayBuffer: function(e) {
                for (var t = new Uint8Array(e.length), i = 0; i < e.length; i++) t[i] = 255 & e.charCodeAt(i);
                return t.buffer
            },
            randomToken: function() {
                return Math.random().toString(36).substr(2)
            },
            isSecure: function() {
                return "https:" === location.protocol
            }
        }
    }, {
        "./adapter": 1,
        "js-binarypack": 10
    }],
    9: [function(e, t, i) {
        "use strict";

        function r(e, t, i) {
            this.fn = e, this.context = t, this.once = i || !1
        }

        function n() {}
        n.prototype._events = void 0, n.prototype.listeners = function(e) {
            if (!this._events || !this._events[e]) return [];
            if (this._events[e].fn) return [this._events[e].fn];
            for (var t = 0, i = this._events[e].length, n = new Array(i); t < i; t++) n[t] = this._events[e][t].fn;
            return n
        }, n.prototype.emit = function(e, t, i, n, r, o) {
            if (!this._events || !this._events[e]) return !1;
            var s, a, u = this._events[e],
                c = arguments.length;
            if ("function" == typeof u.fn) {
                switch (u.once && this.removeListener(e, u.fn, !0), c) {
                    case 1:
                        return u.fn.call(u.context), !0;
                    case 2:
                        return u.fn.call(u.context, t), !0;
                    case 3:
                        return u.fn.call(u.context, t, i), !0;
                    case 4:
                        return u.fn.call(u.context, t, i, n), !0;
                    case 5:
                        return u.fn.call(u.context, t, i, n, r), !0;
                    case 6:
                        return u.fn.call(u.context, t, i, n, r, o), !0
                }
                for (a = 1, s = new Array(c - 1); a < c; a++) s[a - 1] = arguments[a];
                u.fn.apply(u.context, s)
            } else {
                var p, l = u.length;
                for (a = 0; a < l; a++) switch (u[a].once && this.removeListener(e, u[a].fn, !0), c) {
                    case 1:
                        u[a].fn.call(u[a].context);
                        break;
                    case 2:
                        u[a].fn.call(u[a].context, t);
                        break;
                    case 3:
                        u[a].fn.call(u[a].context, t, i);
                        break;
                    default:
                        if (!s)
                            for (p = 1, s = new Array(c - 1); p < c; p++) s[p - 1] = arguments[p];
                        u[a].fn.apply(u[a].context, s)
                }
            }
            return !0
        }, n.prototype.on = function(e, t, i) {
            var n = new r(t, i || this);
            return this._events || (this._events = {}), this._events[e] ? this._events[e].fn ? this._events[e] = [this._events[e], n] : this._events[e].push(n) : this._events[e] = n, this
        }, n.prototype.once = function(e, t, i) {
            var n = new r(t, i || this, !0);
            return this._events || (this._events = {}), this._events[e] ? this._events[e].fn ? this._events[e] = [this._events[e], n] : this._events[e].push(n) : this._events[e] = n, this
        }, n.prototype.removeListener = function(e, t, i) {
            if (!this._events || !this._events[e]) return this;
            var n = this._events[e],
                r = [];
            if (t && (n.fn && (n.fn !== t || i && !n.once) && r.push(n), !n.fn))
                for (var o = 0, s = n.length; o < s; o++)(n[o].fn !== t || i && !n[o].once) && r.push(n[o]);
            return r.length ? this._events[e] = 1 === r.length ? r[0] : r : delete this._events[e], this
        }, n.prototype.removeAllListeners = function(e) {
            return this._events && (e ? delete this._events[e] : this._events = {}), this
        }, n.prototype.off = n.prototype.removeListener, n.prototype.addListener = n.prototype.on, n.prototype.setMaxListeners = function() {
            return this
        }, ((n.EventEmitter = n).EventEmitter2 = n).EventEmitter3 = n, t.exports = n
    }, {}],
    10: [function(e, t, i) {
        var n = e("./bufferbuilder").BufferBuilder,
            r = e("./bufferbuilder").binaryFeatures,
            o = {
                unpack: function(e) {
                    return new s(e).unpack()
                },
                pack: function(e) {
                    var t = new a;
                    return t.pack(e), t.getBuffer()
                }
            };

        function s(e) {
            this.index = 0, this.dataBuffer = e, this.dataView = new Uint8Array(this.dataBuffer), this.length = this.dataBuffer.byteLength
        }

        function a() {
            this.bufferBuilder = new n
        }

        function u(e) {
            var t = e.charCodeAt(0);
            return t <= 2047 ? "00" : t <= 65535 ? "000" : t <= 2097151 ? "0000" : t <= 67108863 ? "00000" : "000000"
        }
        t.exports = o, s.prototype.unpack = function() {
            var e, t = this.unpack_uint8();
            if (t < 128) return t;
            if ((224 ^ t) < 32) return (224 ^ t) - 32;
            if ((e = 160 ^ t) <= 15) return this.unpack_raw(e);
            if ((e = 176 ^ t) <= 15) return this.unpack_string(e);
            if ((e = 144 ^ t) <= 15) return this.unpack_array(e);
            if ((e = 128 ^ t) <= 15) return this.unpack_map(e);
            switch (t) {
                case 192:
                    return null;
                case 193:
                    return;
                case 194:
                    return !1;
                case 195:
                    return !0;
                case 202:
                    return this.unpack_float();
                case 203:
                    return this.unpack_double();
                case 204:
                    return this.unpack_uint8();
                case 205:
                    return this.unpack_uint16();
                case 206:
                    return this.unpack_uint32();
                case 207:
                    return this.unpack_uint64();
                case 208:
                    return this.unpack_int8();
                case 209:
                    return this.unpack_int16();
                case 210:
                    return this.unpack_int32();
                case 211:
                    return this.unpack_int64();
                case 212:
                case 213:
                case 214:
                case 215:
                    return;
                case 216:
                    return e = this.unpack_uint16(), this.unpack_string(e);
                case 217:
                    return e = this.unpack_uint32(), this.unpack_string(e);
                case 218:
                    return e = this.unpack_uint16(), this.unpack_raw(e);
                case 219:
                    return e = this.unpack_uint32(), this.unpack_raw(e);
                case 220:
                    return e = this.unpack_uint16(), this.unpack_array(e);
                case 221:
                    return e = this.unpack_uint32(), this.unpack_array(e);
                case 222:
                    return e = this.unpack_uint16(), this.unpack_map(e);
                case 223:
                    return e = this.unpack_uint32(), this.unpack_map(e)
            }
        }, s.prototype.unpack_uint8 = function() {
            var e = 255 & this.dataView[this.index];
            return this.index++, e
        }, s.prototype.unpack_uint16 = function() {
            var e = this.read(2),
                t = 256 * (255 & e[0]) + (255 & e[1]);
            return this.index += 2, t
        }, s.prototype.unpack_uint32 = function() {
            var e = this.read(4),
                t = 256 * (256 * (256 * e[0] + e[1]) + e[2]) + e[3];
            return this.index += 4, t
        }, s.prototype.unpack_uint64 = function() {
            var e = this.read(8),
                t = 256 * (256 * (256 * (256 * (256 * (256 * (256 * e[0] + e[1]) + e[2]) + e[3]) + e[4]) + e[5]) + e[6]) + e[7];
            return this.index += 8, t
        }, s.prototype.unpack_int8 = function() {
            var e = this.unpack_uint8();
            return e < 128 ? e : e - 256
        }, s.prototype.unpack_int16 = function() {
            var e = this.unpack_uint16();
            return e < 32768 ? e : e - 65536
        }, s.prototype.unpack_int32 = function() {
            var e = this.unpack_uint32();
            return e < Math.pow(2, 31) ? e : e - Math.pow(2, 32)
        }, s.prototype.unpack_int64 = function() {
            var e = this.unpack_uint64();
            return e < Math.pow(2, 63) ? e : e - Math.pow(2, 64)
        }, s.prototype.unpack_raw = function(e) {
            if (this.length < this.index + e) throw new Error("BinaryPackFailure: index is out of range " + this.index + " " + e + " " + this.length);
            var t = this.dataBuffer.slice(this.index, this.index + e);
            return this.index += e, t
        }, s.prototype.unpack_string = function(e) {
            for (var t, i, n = this.read(e), r = 0, o = ""; r < e;)(t = n[r]) < 128 ? (o += String.fromCharCode(t), r++) : (192 ^ t) < 32 ? (i = (192 ^ t) << 6 | 63 & n[r + 1], o += String.fromCharCode(i), r += 2) : (i = (15 & t) << 12 | (63 & n[r + 1]) << 6 | 63 & n[r + 2], o += String.fromCharCode(i), r += 3);
            return this.index += e, o
        }, s.prototype.unpack_array = function(e) {
            for (var t = new Array(e), i = 0; i < e; i++) t[i] = this.unpack();
            return t
        }, s.prototype.unpack_map = function(e) {
            for (var t = {}, i = 0; i < e; i++) {
                var n = this.unpack(),
                    r = this.unpack();
                t[n] = r
            }
            return t
        }, s.prototype.unpack_float = function() {
            var e = this.unpack_uint32(),
                t = (e >> 23 & 255) - 127;
            return (0 == e >> 31 ? 1 : -1) * (8388607 & e | 8388608) * Math.pow(2, t - 23)
        }, s.prototype.unpack_double = function() {
            var e = this.unpack_uint32(),
                t = this.unpack_uint32(),
                i = (e >> 20 & 2047) - 1023;
            return (0 == e >> 31 ? 1 : -1) * ((1048575 & e | 1048576) * Math.pow(2, i - 20) + t * Math.pow(2, i - 52))
        }, s.prototype.read = function(e) {
            var t = this.index;
            if (t + e <= this.length) return this.dataView.subarray(t, t + e);
            throw new Error("BinaryPackFailure: read index out of range")
        }, a.prototype.getBuffer = function() {
            return this.bufferBuilder.getBuffer()
        }, a.prototype.pack = function(e) {
            var t = typeof e;
            if ("string" == t) this.pack_string(e);
            else if ("number" == t) Math.floor(e) === e ? this.pack_integer(e) : this.pack_double(e);
            else if ("boolean" == t) !0 === e ? this.bufferBuilder.append(195) : !1 === e && this.bufferBuilder.append(194);
            else if ("undefined" == t) this.bufferBuilder.append(192);
            else {
                if ("object" != t) throw new Error('Type "' + t + '" not yet supported');
                if (null === e) this.bufferBuilder.append(192);
                else {
                    var i = e.constructor;
                    if (i == Array) this.pack_array(e);
                    else if (i == Blob || i == File) this.pack_bin(e);
                    else if (i == ArrayBuffer) r.useArrayBufferView ? this.pack_bin(new Uint8Array(e)) : this.pack_bin(e);
                    else if ("BYTES_PER_ELEMENT" in e) r.useArrayBufferView ? this.pack_bin(new Uint8Array(e.buffer)) : this.pack_bin(e.buffer);
                    else if (i == Object) this.pack_object(e);
                    else if (i == Date) this.pack_string(e.toString());
                    else {
                        if ("function" != typeof e.toBinaryPack) throw new Error('Type "' + i.toString() + '" not yet supported');
                        this.bufferBuilder.append(e.toBinaryPack())
                    }
                }
            }
            this.bufferBuilder.flush()
        }, a.prototype.pack_bin = function(e) {
            var t = e.length || e.byteLength || e.size;
            if (t <= 15) this.pack_uint8(160 + t);
            else if (t <= 65535) this.bufferBuilder.append(218), this.pack_uint16(t);
            else {
                if (!(t <= 4294967295)) throw new Error("Invalid length");
                this.bufferBuilder.append(219), this.pack_uint32(t)
            }
            this.bufferBuilder.append(e)
        }, a.prototype.pack_string = function(e) {
            var t, i = 600 < (t = e).length ? new Blob([t]).size : t.replace(/[^\u0000-\u007F]/g, u).length;
            if (i <= 15) this.pack_uint8(176 + i);
            else if (i <= 65535) this.bufferBuilder.append(216), this.pack_uint16(i);
            else {
                if (!(i <= 4294967295)) throw new Error("Invalid length");
                this.bufferBuilder.append(217), this.pack_uint32(i)
            }
            this.bufferBuilder.append(e)
        }, a.prototype.pack_array = function(e) {
            var t = e.length;
            if (t <= 15) this.pack_uint8(144 + t);
            else if (t <= 65535) this.bufferBuilder.append(220), this.pack_uint16(t);
            else {
                if (!(t <= 4294967295)) throw new Error("Invalid length");
                this.bufferBuilder.append(221), this.pack_uint32(t)
            }
            for (var i = 0; i < t; i++) this.pack(e[i])
        }, a.prototype.pack_integer = function(e) {
            if (-32 <= e && e <= 127) this.bufferBuilder.append(255 & e);
            else if (0 <= e && e <= 255) this.bufferBuilder.append(204), this.pack_uint8(e);
            else if (-128 <= e && e <= 127) this.bufferBuilder.append(208), this.pack_int8(e);
            else if (0 <= e && e <= 65535) this.bufferBuilder.append(205), this.pack_uint16(e);
            else if (-32768 <= e && e <= 32767) this.bufferBuilder.append(209), this.pack_int16(e);
            else if (0 <= e && e <= 4294967295) this.bufferBuilder.append(206), this.pack_uint32(e);
            else if (-2147483648 <= e && e <= 2147483647) this.bufferBuilder.append(210), this.pack_int32(e);
            else if (-0x8000000000000000 <= e && e <= 0x8000000000000000) this.bufferBuilder.append(211), this.pack_int64(e);
            else {
                if (!(0 <= e && e <= 0x10000000000000000)) throw new Error("Invalid integer");
                this.bufferBuilder.append(207), this.pack_uint64(e)
            }
        }, a.prototype.pack_double = function(e) {
            var t = 0;
            e < 0 && (t = 1, e = -e);
            var i = Math.floor(Math.log(e) / Math.LN2),
                n = e / Math.pow(2, i) - 1,
                r = Math.floor(n * Math.pow(2, 52)),
                o = Math.pow(2, 32),
                s = t << 31 | i + 1023 << 20 | r / o & 1048575,
                a = r % o;
            this.bufferBuilder.append(203), this.pack_int32(s), this.pack_int32(a)
        }, a.prototype.pack_object = function(e) {
            var t = Object.keys(e).length;
            if (t <= 15) this.pack_uint8(128 + t);
            else if (t <= 65535) this.bufferBuilder.append(222), this.pack_uint16(t);
            else {
                if (!(t <= 4294967295)) throw new Error("Invalid length");
                this.bufferBuilder.append(223), this.pack_uint32(t)
            }
            for (var i in e) e.hasOwnProperty(i) && (this.pack(i), this.pack(e[i]))
        }, a.prototype.pack_uint8 = function(e) {
            this.bufferBuilder.append(e)
        }, a.prototype.pack_uint16 = function(e) {
            this.bufferBuilder.append(e >> 8), this.bufferBuilder.append(255 & e)
        }, a.prototype.pack_uint32 = function(e) {
            var t = 4294967295 & e;
            this.bufferBuilder.append((4278190080 & t) >>> 24), this.bufferBuilder.append((16711680 & t) >>> 16), this.bufferBuilder.append((65280 & t) >>> 8), this.bufferBuilder.append(255 & t)
        }, a.prototype.pack_uint64 = function(e) {
            var t = e / Math.pow(2, 32),
                i = e % Math.pow(2, 32);
            this.bufferBuilder.append((4278190080 & t) >>> 24), this.bufferBuilder.append((16711680 & t) >>> 16), this.bufferBuilder.append((65280 & t) >>> 8), this.bufferBuilder.append(255 & t), this.bufferBuilder.append((4278190080 & i) >>> 24), this.bufferBuilder.append((16711680 & i) >>> 16), this.bufferBuilder.append((65280 & i) >>> 8), this.bufferBuilder.append(255 & i)
        }, a.prototype.pack_int8 = function(e) {
            this.bufferBuilder.append(255 & e)
        }, a.prototype.pack_int16 = function(e) {
            this.bufferBuilder.append((65280 & e) >> 8), this.bufferBuilder.append(255 & e)
        }, a.prototype.pack_int32 = function(e) {
            this.bufferBuilder.append(e >>> 24 & 255), this.bufferBuilder.append((16711680 & e) >>> 16), this.bufferBuilder.append((65280 & e) >>> 8), this.bufferBuilder.append(255 & e)
        }, a.prototype.pack_int64 = function(e) {
            var t = Math.floor(e / Math.pow(2, 32)),
                i = e % Math.pow(2, 32);
            this.bufferBuilder.append((4278190080 & t) >>> 24), this.bufferBuilder.append((16711680 & t) >>> 16), this.bufferBuilder.append((65280 & t) >>> 8), this.bufferBuilder.append(255 & t), this.bufferBuilder.append((4278190080 & i) >>> 24), this.bufferBuilder.append((16711680 & i) >>> 16), this.bufferBuilder.append((65280 & i) >>> 8), this.bufferBuilder.append(255 & i)
        }
    }, {
        "./bufferbuilder": 11
    }],
    11: [function(e, t, i) {
        var n = {};
        n.useBlobBuilder = function() {
            try {
                return new Blob([]), !1
            } catch (e) {
                return !0
            }
        }(), n.useArrayBufferView = !n.useBlobBuilder && function() {
            try {
                return 0 === new Blob([new Uint8Array([])]).size
            } catch (e) {
                return !0
            }
        }(), t.exports.binaryFeatures = n;
        var r = t.exports.BlobBuilder;

        function o() {
            this._pieces = [], this._parts = []
        }
        "undefined" != typeof window && (r = t.exports.BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder || window.BlobBuilder), o.prototype.append = function(e) {
            "number" == typeof e ? this._pieces.push(e) : (this.flush(), this._parts.push(e))
        }, o.prototype.flush = function() {
            if (0 < this._pieces.length) {
                var e = new Uint8Array(this._pieces);
                n.useArrayBufferView || (e = e.buffer), this._parts.push(e), this._pieces = []
            }
        }, o.prototype.getBuffer = function() {
            if (this.flush(), n.useBlobBuilder) {
                for (var e = new r, t = 0, i = this._parts.length; t < i; t++) e.append(this._parts[t]);
                return e.getBlob()
            }
            return new Blob(this._parts)
        }, t.exports.BufferBuilder = o
    }, {}],
    12: [function(e, t, i) {
        var c = e("./util");

        function n(e, t) {
            if (!(this instanceof n)) return new n(e);
            this._dc = e, c.debug = t, this._outgoing = {}, this._incoming = {}, this._received = {}, this._window = 1e3, this._mtu = 500, this._interval = 0, this._count = 0, this._queue = [], this._setupDC()
        }
        n.prototype.send = function(e) {
            var t = c.pack(e);
            t.size < this._mtu ? this._handleSend(["no", t]) : (this._outgoing[this._count] = {
                ack: 0,
                chunks: this._chunk(t)
            }, c.debug && (this._outgoing[this._count].timer = new Date), this._sendWindowedChunks(this._count), this._count += 1)
        }, n.prototype._setupInterval = function() {
            var n = this;
            this._timeout = setInterval(function() {
                var e = n._queue.shift();
                if (e._multiple)
                    for (var t = 0, i = e.length; t < i; t += 1) n._intervalSend(e[t]);
                else n._intervalSend(e)
            }, this._interval)
        }, n.prototype._intervalSend = function(e) {
            var t = this;
            e = c.pack(e), c.blobToBinaryString(e, function(e) {
                t._dc.send(e)
            }), 0 === t._queue.length && (clearTimeout(t._timeout), t._timeout = null)
        }, n.prototype._processAcks = function() {
            for (var e in this._outgoing) this._outgoing.hasOwnProperty(e) && this._sendWindowedChunks(e)
        }, n.prototype._handleSend = function(e) {
            for (var t = !0, i = 0, n = this._queue.length; i < n; i += 1) {
                var r = this._queue[i];
                r === e ? t = !1 : r._multiple && -1 !== r.indexOf(e) && (t = !1)
            }
            t && (this._queue.push(e), this._timeout || this._setupInterval())
        }, n.prototype._setupDC = function() {
            var n = this;
            this._dc.onmessage = function(e) {
                var t = e.data;
                if (t.constructor === String) {
                    var i = c.binaryStringToArrayBuffer(t);
                    t = c.unpack(i), n._handleMessage(t)
                }
            }
        }, n.prototype._handleMessage = function(e) {
            var t, i = e[1],
                n = this._incoming[i],
                r = this._outgoing[i];
            switch (e[0]) {
                case "no":
                    var o = i;
                    o && this.onmessage(c.unpack(o));
                    break;
                case "end":
                    if (t = n, this._received[i] = e[2], !t) break;
                    this._ack(i);
                    break;
                case "ack":
                    if (t = r) {
                        var s = e[2];
                        t.ack = Math.max(s, t.ack), t.ack >= t.chunks.length ? (c.log("Time: ", new Date - t.timer), delete this._outgoing[i]) : this._processAcks()
                    }
                    break;
                case "chunk":
                    if (!(t = n)) {
                        if (!0 === this._received[i]) break;
                        t = {
                            ack: ["ack", i, 0],
                            chunks: []
                        }, this._incoming[i] = t
                    }
                    var a = e[2],
                        u = e[3];
                    t.chunks[a] = new Uint8Array(u), a === t.ack[2] && this._calculateNextAck(i), this._ack(i);
                    break;
                default:
                    this._handleSend(e)
            }
        }, n.prototype._chunk = function(e) {
            for (var t = [], i = e.size, n = 0; n < i;) {
                var r = Math.min(i, n + this._mtu),
                    o = {
                        payload: e.slice(n, r)
                    };
                t.push(o), n = r
            }
            return c.log("Created", t.length, "chunks."), t
        }, n.prototype._ack = function(e) {
            var t = this._incoming[e].ack;
            this._received[e] === t[2] && (this._complete(e), this._received[e] = !0), this._handleSend(t)
        }, n.prototype._calculateNextAck = function(e) {
            for (var t = this._incoming[e], i = t.chunks, n = 0, r = i.length; n < r; n += 1)
                if (void 0 === i[n]) return void(t.ack[2] = n);
            t.ack[2] = i.length
        }, n.prototype._sendWindowedChunks = function(e) {
            c.log("sendWindowedChunks for: ", e);
            for (var t = this._outgoing[e], i = t.chunks, n = [], r = Math.min(t.ack + this._window, i.length), o = t.ack; o < r; o += 1) i[o].sent && o !== t.ack || (i[o].sent = !0, n.push(["chunk", e, o, i[o].payload]));
            t.ack + this._window >= i.length && n.push(["end", e, i.length]), n._multiple = !0, this._handleSend(n)
        }, n.prototype._complete = function(e) {
            c.log("Completed called for", e);
            var t = this,
                i = this._incoming[e].chunks,
                n = new Blob(i);
            c.blobToArrayBuffer(n, function(e) {
                t.onmessage(c.unpack(e))
            }), delete this._incoming[e]
        }, n.higherBandwidthSDP = function(e) {
            var t = navigator.appVersion.match(/Chrome\/(.*?) /);
            if (t && (t = parseInt(t[1].split(".").shift())) < 31) {
                var i = e.split("b=AS:30");
                if (1 < i.length) return i[0] + "b=AS:102400" + i[1]
            }
            return e
        }, n.prototype.onmessage = function(e) {}, t.exports.Reliable = n
    }, {
        "./util": 13
    }],
    13: [function(e, t, i) {
        var n = e("js-binarypack"),
            r = {
                debug: !1,
                inherits: function(e, t) {
                    e.super_ = t, e.prototype = Object.create(t.prototype, {
                        constructor: {
                            value: e,
                            enumerable: !1,
                            writable: !0,
                            configurable: !0
                        }
                    })
                },
                extend: function(e, t) {
                    for (var i in t) t.hasOwnProperty(i) && (e[i] = t[i]);
                    return e
                },
                pack: n.pack,
                unpack: n.unpack,
                log: function() {
                    if (r.debug) {
                        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
                        e.unshift("Reliable: "), console.log.apply(console, e)
                    }
                },
                setZeroTimeout: function(t) {
                    var i = [],
                        n = "zero-timeout-message";

                    function e(e) {
                        e.source == t && e.data == n && (e.stopPropagation && e.stopPropagation(), i.length && i.shift()())
                    }
                    return t.addEventListener ? t.addEventListener("message", e, !0) : t.attachEvent && t.attachEvent("onmessage", e),
                        function(e) {
                            i.push(e), t.postMessage(n, "*")
                        }
                }(this),
                blobToArrayBuffer: function(e, t) {
                    var i = new FileReader;
                    i.onload = function(e) {
                        t(e.target.result)
                    }, i.readAsArrayBuffer(e)
                },
                blobToBinaryString: function(e, t) {
                    var i = new FileReader;
                    i.onload = function(e) {
                        t(e.target.result)
                    }, i.readAsBinaryString(e)
                },
                binaryStringToArrayBuffer: function(e) {
                    for (var t = new Uint8Array(e.length), i = 0; i < e.length; i++) t[i] = 255 & e.charCodeAt(i);
                    return t.buffer
                },
                randomToken: function() {
                    return Math.random().toString(36).substr(2)
                }
            };
        t.exports = r
    }, {
        "js-binarypack": 10
    }]
}, {}, [3]);