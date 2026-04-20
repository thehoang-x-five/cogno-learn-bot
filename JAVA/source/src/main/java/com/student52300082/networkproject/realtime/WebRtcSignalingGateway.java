package com.student52300082.networkproject.realtime;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Type;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

public final class WebRtcSignalingGateway {
    private final int httpPort;
    private final int wsPort;
    private HttpServer httpServer;
    private SignalingSocketServer socketServer;

    public WebRtcSignalingGateway(int httpPort, int wsPort) {
        this.httpPort = httpPort;
        this.wsPort = wsPort;
    }

    public synchronized void start() throws IOException {
        if (httpServer != null || socketServer != null) {
            return;
        }
        socketServer = new SignalingSocketServer(new InetSocketAddress(wsPort));
        socketServer.start();

        httpServer = HttpServer.create(new InetSocketAddress(httpPort), 0);
        httpServer.createContext("/", this::servePage);
        httpServer.setExecutor(Executors.newSingleThreadExecutor());
        httpServer.start();
    }

    public synchronized void stop() {
        if (httpServer != null) {
            httpServer.stop(0);
            httpServer = null;
        }
        if (socketServer != null) {
            try {
                socketServer.stop(1500);
            } catch (Exception ignored) {
            } finally {
                socketServer = null;
            }
        }
    }

    public String getClientUrl(String host, String user, String room) {
        return "http://" + host + ":" + httpPort + "/?user=" + encode(user) + "&room=" + encode(room);
    }

    private String encode(String value) {
        return value == null ? "" : value.replace(" ", "%20");
    }

    private void servePage(HttpExchange exchange) throws IOException {
        byte[] bytes = htmlPage().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "text/html; charset=UTF-8");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private String htmlPage() {
        return "<!doctype html><html><head><meta charset='utf-8'><title>Realtime WebRTC</title>"
            + "<style>body{font-family:Arial;background:#0e1b1a;color:#e7f3ef;margin:0;padding:16px}video{width:48%;background:#000;border-radius:8px}#log{height:180px;overflow:auto;background:#10221f;padding:8px;border-radius:8px}</style>"
            + "</head><body><h2>WebRTC Real Call</h2><div id='meta'></div><div style='display:flex;gap:2%'><video id='local' autoplay playsinline muted></video><video id='remote' autoplay playsinline></video></div>"
            + "<p><button id='start'>Start Camera</button> <button id='call'>Call Peer</button> <button id='hangup'>Hangup</button></p><pre id='log'></pre>"
            + "<script>"
            + "const p=new URLSearchParams(location.search);const user=p.get('user')||('User'+Math.floor(Math.random()*1000));const room=p.get('room')||'default';"
            + "const ws=new WebSocket('ws://'+location.hostname+':'+" + wsPort + ");"
            + "const log=(m)=>{const e=document.getElementById('log');e.textContent+=m+'\\n';e.scrollTop=e.scrollHeight;};"
            + "document.getElementById('meta').textContent='User: '+user+' | Room: '+room;"
            + "let pc,localStream,targetPeer='';"
            + "const config={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};"
            + "function send(o){ws.send(JSON.stringify(o));}"
            + "function ensurePc(){if(pc) return; pc=new RTCPeerConnection(config);"
            + "pc.onicecandidate=e=>{if(e.candidate&&targetPeer)send({type:'candidate',to:targetPeer,candidate:e.candidate});};"
            + "pc.ontrack=e=>{document.getElementById('remote').srcObject=e.streams[0];};"
            + "if(localStream){localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));}}"
            + "ws.onopen=()=>{send({type:'join',user,room});log('Connected signaling');};"
            + "ws.onmessage=async(ev)=>{const m=JSON.parse(ev.data);"
            + "if(m.type==='peers'){log('Peers: '+m.peers.join(', '));if(m.peers.length>0) targetPeer=m.peers[0];}"
            + "if(m.type==='peer-joined'){targetPeer=m.user;log('Peer joined: '+m.user);}"
            + "if(m.type==='offer'){targetPeer=m.from;ensurePc();await pc.setRemoteDescription(new RTCSessionDescription(m.offer));"
            + "const ans=await pc.createAnswer();await pc.setLocalDescription(ans);send({type:'answer',to:m.from,answer:ans});log('Answered '+m.from);}"
            + "if(m.type==='answer'){await pc.setRemoteDescription(new RTCSessionDescription(m.answer));log('Call connected');}"
            + "if(m.type==='candidate'&&pc){try{await pc.addIceCandidate(new RTCIceCandidate(m.candidate));}catch(err){log('ICE error '+err.message);}}"
            + "if(m.type==='hangup'){if(pc){pc.close();pc=null;}log('Peer hangup');}};"
            + "document.getElementById('start').onclick=async()=>{localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});document.getElementById('local').srcObject=localStream;if(pc){localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));}log('Camera started');};"
            + "document.getElementById('call').onclick=async()=>{if(!targetPeer){log('No peer in room');return;}ensurePc();const off=await pc.createOffer();await pc.setLocalDescription(off);send({type:'offer',to:targetPeer,offer:off});log('Calling '+targetPeer);};"
            + "document.getElementById('hangup').onclick=()=>{if(pc){pc.close();pc=null;}send({type:'hangup',to:targetPeer});log('Hangup');};"
            + "</script></body></html>";
    }

    private static final class SignalingSocketServer extends WebSocketServer {
        private final Gson gson = new Gson();
        private final Type mapType = new TypeToken<Map<String, Object>>() {}.getType();
        private final Map<String, WebSocket> users = new ConcurrentHashMap<String, WebSocket>();
        private final Map<WebSocket, String> socketUser = new ConcurrentHashMap<WebSocket, String>();
        private final Map<String, String> userRoom = new ConcurrentHashMap<String, String>();

        private SignalingSocketServer(InetSocketAddress address) {
            super(address);
        }

        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
        }

        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
            String user = socketUser.remove(conn);
            if (user != null) {
                users.remove(user);
                userRoom.remove(user);
            }
        }

        @Override
        public void onMessage(WebSocket conn, String message) {
            Map<String, Object> payload = gson.fromJson(message, mapType);
            String type = asString(payload.get("type"));
            if ("join".equals(type)) {
                String user = asString(payload.get("user"));
                String room = asString(payload.get("room"));
                users.put(user, conn);
                socketUser.put(conn, user);
                userRoom.put(user, room);
                List<String> peers = usersInRoom(room, user);
                sendTo(conn, mapOf("type", "peers", "peers", peers));
                broadcastToRoom(room, user, mapOf("type", "peer-joined", "user", user));
                return;
            }
            String to = asString(payload.get("to"));
            String from = socketUser.get(conn);
            if (to == null || from == null) {
                return;
            }
            WebSocket target = users.get(to);
            if (target == null) {
                return;
            }
            Map<String, Object> forward = new LinkedHashMap<String, Object>(payload);
            forward.put("from", from);
            sendTo(target, forward);
        }

        @Override
        public void onError(WebSocket conn, Exception ex) {
        }

        @Override
        public void onStart() {
        }

        private void broadcastToRoom(String room, String excludeUser, Map<String, Object> payload) {
            for (String user : userRoom.keySet()) {
                if (excludeUser != null && excludeUser.equals(user)) {
                    continue;
                }
                if (!room.equals(userRoom.get(user))) {
                    continue;
                }
                WebSocket socket = users.get(user);
                if (socket != null) {
                    sendTo(socket, payload);
                }
            }
        }

        private List<String> usersInRoom(String room, String excludeUser) {
            if (room == null) {
                return Collections.emptyList();
            }
            List<String> result = new ArrayList<String>();
            for (String user : userRoom.keySet()) {
                if (excludeUser != null && excludeUser.equals(user)) {
                    continue;
                }
                if (room.equals(userRoom.get(user))) {
                    result.add(user);
                }
            }
            Collections.sort(result);
            return result;
        }

        private void sendTo(WebSocket socket, Map<String, Object> payload) {
            socket.send(gson.toJson(payload));
        }

        private String asString(Object value) {
            return value == null ? null : String.valueOf(value);
        }

        private Map<String, Object> mapOf(Object... args) {
            Map<String, Object> map = new HashMap<String, Object>();
            for (int i = 0; i < args.length - 1; i += 2) {
                map.put(String.valueOf(args[i]), args[i + 1]);
            }
            return map;
        }
    }
}
