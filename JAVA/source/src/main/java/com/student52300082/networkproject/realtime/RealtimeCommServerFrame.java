package com.student52300082.networkproject.realtime;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JList;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.ListSelectionModel;
import javax.swing.SwingUtilities;

public class RealtimeCommServerFrame extends JFrame {
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_REALTIME_PORT), 7);
    private final JTextArea logArea = UiTheme.logArea();
    private final DefaultListModel<String> onlineUsersModel = new DefaultListModel<String>();
    private final DefaultListModel<String> roomModel = new DefaultListModel<String>();
    private final JLabel lblStatus = UiTheme.subtitle("Server stopped");

    private final ConcurrentHashMap<String, ClientConnection> clients = new ConcurrentHashMap<String, ClientConnection>();
    private final ConcurrentHashMap<String, RoomInfo> rooms = new ConcurrentHashMap<String, RoomInfo>();
    private final AtomicInteger guestSequence = new AtomicInteger(0);
    private final Object stateLock = new Object();

    private volatile boolean running;
    private ServerSocket serverSocket;
    private WebRtcSignalingGateway webRtcGateway;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new RealtimeCommServerFrame().setVisible(true));
    }

    public RealtimeCommServerFrame() {
        UiTheme.prepareFrame(this);
        setTitle("Realtime Communication Server");
        setSize(980, 700);
        setMinimumSize(new Dimension(920, 640));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        JPanel page = UiTheme.page(18, 20, 20, 20);
        page.add(UiTheme.gradientHeader(
            "Realtime Communication Hub",
            "Live chat, group chat, one-to-one voice call and group call relay"
        ), BorderLayout.NORTH);

        JPanel controlCard = UiTheme.card();
        controlCard.setLayout(new BorderLayout(10, 10));

        JPanel topBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        topBar.setBackground(UiTheme.SURFACE);
        JButton btnStart = UiTheme.primaryButton("Start Server");
        JButton btnStop = UiTheme.secondaryButton("Stop");
        topBar.add(UiTheme.title("Server Control"));
        topBar.add(new JLabel("Port"));
        topBar.add(txtPort);
        topBar.add(btnStart);
        topBar.add(btnStop);

        JPanel statusBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        statusBar.setBackground(UiTheme.SURFACE);
        statusBar.add(UiTheme.subtitle("Status:"));
        statusBar.add(lblStatus);

        controlCard.add(topBar, BorderLayout.NORTH);
        controlCard.add(statusBar, BorderLayout.SOUTH);

        JList<String> userList = createInfoList(onlineUsersModel);
        JList<String> roomList = createInfoList(roomModel);

        JPanel usersCard = titledListCard("Online Users", userList);
        JPanel roomsCard = titledListCard("Active Rooms", roomList);
        JPanel sidePanel = new JPanel(new GridLayout(2, 1, 10, 10));
        sidePanel.setBackground(UiTheme.BACKGROUND);
        sidePanel.add(usersCard);
        sidePanel.add(roomsCard);

        JPanel logCard = UiTheme.card();
        logCard.add(UiTheme.title("Server Event Log"), BorderLayout.NORTH);
        logCard.add(UiTheme.scroll(logArea), BorderLayout.CENTER);

        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, sidePanel, logCard);
        splitPane.setResizeWeight(0.28);
        splitPane.setBorder(null);
        splitPane.setOpaque(false);
        splitPane.setBackground(UiTheme.BACKGROUND);

        JPanel body = new JPanel(new BorderLayout(12, 12));
        body.setBackground(UiTheme.BACKGROUND);
        body.add(controlCard, BorderLayout.NORTH);
        body.add(splitPane, BorderLayout.CENTER);
        page.add(body, BorderLayout.CENTER);

        btnStart.addActionListener(e -> startServer());
        btnStop.addActionListener(e -> stopServer());

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                stopServer();
            }
        });

        setContentPane(page);
        UiTheme.styleTree(getContentPane());
    }

    public void loadDemoStateForScreenshot() {
        lblStatus.setText("Listening on port " + AppConfig.DEFAULT_REALTIME_PORT);
        onlineUsersModel.clear();
        onlineUsersModel.addElement("Van");
        onlineUsersModel.addElement("Linh");
        onlineUsersModel.addElement("Minh");
        roomModel.clear();
        roomModel.addElement("mobile-team (3)");
        roomModel.addElement("demo-room (2)");
        logArea.setText(
            "Realtime server started on port " + AppConfig.DEFAULT_REALTIME_PORT + System.lineSeparator()
            + "Van connected from /127.0.0.1:55120" + System.lineSeparator()
            + "Linh connected from /127.0.0.1:55121" + System.lineSeparator()
            + "Minh connected from /127.0.0.1:55122" + System.lineSeparator()
            + "Van joined room mobile-team" + System.lineSeparator()
            + "Linh joined room mobile-team" + System.lineSeparator()
            + "Minh joined room mobile-team" + System.lineSeparator()
            + "Van -> Linh [DM]: Can you review the socket flow?" + System.lineSeparator()
            + "[mobile-team] Linh: Group chat is online." + System.lineSeparator()
            + "Private call started between Van and Linh" + System.lineSeparator()
            + "Group call started in room mobile-team with 3 participants"
        );
    }

    public void startServerForDemo(int port) {
        txtPort.setText(String.valueOf(port));
        startServer();
    }

    private JList<String> createInfoList(DefaultListModel<String> model) {
        JList<String> list = new JList<String>(model);
        list.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        list.setFont(UiTheme.MONO_FONT);
        list.setBackground(UiTheme.SURFACE);
        list.setForeground(UiTheme.INK);
        return list;
    }

    private JPanel titledListCard(String title, JList<String> list) {
        JPanel card = UiTheme.card();
        card.add(UiTheme.title(title), BorderLayout.NORTH);
        JScrollPane scrollPane = UiTheme.scroll(list);
        scrollPane.getViewport().setBackground(UiTheme.SURFACE);
        card.add(scrollPane, BorderLayout.CENTER);
        return card;
    }

    private void startServer() {
        if (running) {
            appendLog("Realtime server is already running.");
            return;
        }

        final int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        try {
            serverSocket = new ServerSocket(port);
            webRtcGateway = new WebRtcSignalingGateway(AppConfig.DEFAULT_WEBRTC_HTTP_PORT, AppConfig.DEFAULT_WEBRTC_WS_PORT);
            webRtcGateway.start();
            running = true;
            lblStatus.setText("Listening on port " + port);
            appendLog("Realtime server started on port " + port);
            appendLog("WebRTC signaling ready at http://localhost:" + AppConfig.DEFAULT_WEBRTC_HTTP_PORT);
            new Thread(this::acceptLoop, "realtime-server-accept").start();
        } catch (IOException ex) {
            if (webRtcGateway != null) {
                webRtcGateway.stop();
                webRtcGateway = null;
            }
            JOptionPane.showMessageDialog(this, "Cannot start server: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket socket = serverSocket.accept();
                ClientConnection connection = new ClientConnection(socket);
                new Thread(connection, "realtime-client-" + socket.getPort()).start();
            } catch (IOException ex) {
                if (running) {
                    appendLog("Accept error: " + ex.getMessage());
                }
            }
        }
    }

    private void stopServer() {
        if (!running) {
            return;
        }
        running = false;
        appendLog("Stopping realtime server...");

        List<ClientConnection> snapshot = new ArrayList<ClientConnection>(clients.values());
        for (ClientConnection connection : snapshot) {
            connection.sendSystemMessage("Server is shutting down.");
            connection.close();
        }
        clients.clear();
        rooms.clear();
        refreshPresenceModels();

        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (IOException ignored) {
        }
        if (webRtcGateway != null) {
            webRtcGateway.stop();
            webRtcGateway = null;
        }

        lblStatus.setText("Server stopped");
        appendLog("Realtime server stopped.");
    }

    public String getWebRtcUrl(String host, String user, String room) {
        if (webRtcGateway == null) {
            return null;
        }
        return webRtcGateway.getClientUrl(host, user, room);
    }

    private void registerClient(ClientConnection connection, String requestedName) {
        String assignedName;
        synchronized (stateLock) {
            String baseName = normalizeName(requestedName, "User");
            assignedName = createUniqueUserName(baseName);
            connection.userName = assignedName;
            clients.put(assignedName, connection);
        }

        connection.sendWelcome(assignedName);
        connection.sendSystemMessage("Connected to realtime server as " + assignedName + ".");
        appendLog(assignedName + " connected from " + connection.socket.getRemoteSocketAddress());
        broadcastSystemMessage(assignedName + " is online.", assignedName);
        broadcastPresence();
    }

    private void unregisterClient(ClientConnection connection, String reason) {
        boolean removed;
        synchronized (stateLock) {
            removed = connection.userName != null && clients.remove(connection.userName, connection);
        }
        if (!removed) {
            connection.closeResources();
            return;
        }

        endCallFor(connection, reason == null ? connection.userName + " left the call." : reason);
        leaveRoomInternal(connection, false);
        appendLog(connection.userName + " disconnected.");
        broadcastSystemMessage(connection.userName + " went offline.", connection.userName);
        broadcastPresence();
        connection.closeResources();
    }

    private void broadcastPresence() {
        List<String> users = new ArrayList<String>(clients.keySet());
        Collections.sort(users);

        TreeMap<String, Integer> roomSummary = new TreeMap<String, Integer>();
        for (RoomInfo roomInfo : rooms.values()) {
            roomSummary.put(roomInfo.name, Integer.valueOf(roomInfo.members.size()));
        }

        for (ClientConnection connection : clients.values()) {
            connection.sendUserList(users);
            connection.sendRoomList(roomSummary);
        }
        refreshPresenceModels(users, roomSummary);
    }

    private void refreshPresenceModels(List<String> users, TreeMap<String, Integer> roomsMap) {
        final List<String> usersSnapshot = new ArrayList<String>(users);
        final TreeMap<String, Integer> roomsSnapshot = new TreeMap<String, Integer>(roomsMap);
        SwingUtilities.invokeLater(() -> {
            onlineUsersModel.clear();
            for (String user : usersSnapshot) {
                onlineUsersModel.addElement(user);
            }
            roomModel.clear();
            for (String roomName : roomsSnapshot.keySet()) {
                roomModel.addElement(roomName + " (" + roomsSnapshot.get(roomName) + ")");
            }
        });
    }

    private void refreshPresenceModels() {
        List<String> users = new ArrayList<String>(clients.keySet());
        Collections.sort(users);
        TreeMap<String, Integer> roomSummary = new TreeMap<String, Integer>();
        for (RoomInfo roomInfo : rooms.values()) {
            roomSummary.put(roomInfo.name, Integer.valueOf(roomInfo.members.size()));
        }
        refreshPresenceModels(users, roomSummary);
    }

    private void handleDirectMessage(ClientConnection sender, String targetName, String message) {
        if (message.trim().isEmpty()) {
            return;
        }
        ClientConnection target = clients.get(targetName);
        if (target == null) {
            sender.sendError("User " + targetName + " is not online.");
            return;
        }
        target.sendDirectMessage(sender.userName, message);
        sender.sendSystemMessage("Direct message delivered to " + targetName + ".");
        appendLog(sender.userName + " -> " + targetName + " [DM]: " + message);
    }

    private void joinRoom(ClientConnection connection, String requestedRoomName) {
        String roomName = normalizeRoomName(requestedRoomName);
        if (roomName.isEmpty()) {
            connection.sendError("Room name cannot be empty.");
            return;
        }

        if (connection.isInCall()) {
            endCallFor(connection, connection.userName + " changed room and the call ended.");
        }

        synchronized (stateLock) {
            if (roomName.equals(connection.roomName)) {
                connection.sendSystemMessage("Already inside room " + roomName + ".");
                return;
            }
        }

        leaveRoomInternal(connection, true);

        synchronized (stateLock) {
            RoomInfo roomInfo = rooms.get(roomName);
            if (roomInfo == null) {
                roomInfo = new RoomInfo(roomName);
                rooms.put(roomName, roomInfo);
            }
            roomInfo.members.add(connection.userName);
            connection.roomName = roomName;
        }

        connection.sendRoomJoined(roomName);
        appendLog(connection.userName + " joined room " + roomName);
        broadcastRoomMessage(roomName, "System", connection.userName + " joined the room.", null);
        broadcastPresence();
    }

    private void leaveRoomInternal(ClientConnection connection, boolean notifyClient) {
        String previousRoom;
        synchronized (stateLock) {
            previousRoom = connection.roomName;
        }
        if (previousRoom == null || previousRoom.trim().isEmpty()) {
            return;
        }

        if (connection.isInGroupCall(previousRoom)) {
            endCallFor(connection, connection.userName + " left room " + previousRoom + " and ended the group call.");
        }

        boolean roomRemoved = false;
        synchronized (stateLock) {
            RoomInfo roomInfo = rooms.get(previousRoom);
            if (roomInfo != null) {
                roomInfo.members.remove(connection.userName);
                if (roomInfo.members.isEmpty()) {
                    rooms.remove(previousRoom);
                    roomRemoved = true;
                }
            }
            connection.roomName = null;
        }

        if (notifyClient) {
            connection.sendRoomLeft(previousRoom);
        }
        if (!roomRemoved) {
            broadcastRoomMessage(previousRoom, "System", connection.userName + " left the room.", null);
        }
        appendLog(connection.userName + " left room " + previousRoom);
        broadcastPresence();
    }

    private void handleRoomMessage(ClientConnection sender, String message) {
        if (message.trim().isEmpty()) {
            return;
        }
        String roomName = sender.roomName;
        if (roomName == null || roomName.trim().isEmpty()) {
            sender.sendError("Join a room before sending group chat messages.");
            return;
        }
        broadcastRoomMessage(roomName, sender.userName, message, null);
        appendLog("[" + roomName + "] " + sender.userName + ": " + message);
    }

    private void broadcastRoomMessage(String roomName, String fromUser, String message, String excludeUser) {
        RoomInfo roomInfo = rooms.get(roomName);
        if (roomInfo == null) {
            return;
        }
        List<String> members = new ArrayList<String>(roomInfo.members);
        Collections.sort(members);
        for (String memberName : members) {
            if (memberName.equals(excludeUser)) {
                continue;
            }
            ClientConnection member = clients.get(memberName);
            if (member != null) {
                member.sendRoomMessage(roomName, fromUser, message);
            }
        }
    }

    private void startPrivateCall(ClientConnection caller, String targetName) {
        startPrivateCall(caller, targetName, RealtimeProtocol.CALL_MODE_PRIVATE, "Private call");
    }

    private void startPrivateVideoCall(ClientConnection caller, String targetName) {
        startPrivateCall(caller, targetName, RealtimeProtocol.CALL_MODE_PRIVATE_VIDEO, "Video call");
    }

    private void startPrivateCall(ClientConnection caller, String targetName, String mode, String labelPrefix) {
        if (targetName == null || targetName.trim().isEmpty()) {
            caller.sendError("Select a user before starting " + labelPrefix.toLowerCase() + ".");
            return;
        }
        ClientConnection target = clients.get(targetName.trim());
        if (target == null) {
            caller.sendError("User " + targetName + " is not online.");
            return;
        }
        if (target == caller) {
            caller.sendError("Private call requires another user.");
            return;
        }

        synchronized (stateLock) {
            if (caller.isInCall()) {
                caller.sendError("End the current call before starting a new one.");
                return;
            }
            if (target.isInCall()) {
                caller.sendError(target.userName + " is already busy in another call.");
                return;
            }
            caller.callMode = mode;
            caller.callPeer = target.userName;
            caller.callRoom = null;
            target.callMode = mode;
            target.callPeer = caller.userName;
            target.callRoom = null;
        }

        caller.sendCallStarted(mode, labelPrefix + " with " + target.userName);
        target.sendCallStarted(mode, labelPrefix + " with " + caller.userName);
        appendLog(labelPrefix + " started between " + caller.userName + " and " + target.userName);
    }

    private void startGroupCall(ClientConnection initiator) {
        String roomName = initiator.roomName;
        if (roomName == null || roomName.trim().isEmpty()) {
            initiator.sendError("Join a room before starting a group call.");
            return;
        }

        RoomInfo roomInfo = rooms.get(roomName);
        if (roomInfo == null) {
            initiator.sendError("Room " + roomName + " does not exist anymore.");
            return;
        }

        List<ClientConnection> participants = new ArrayList<ClientConnection>();
        for (String memberName : roomInfo.members) {
            ClientConnection participant = clients.get(memberName);
            if (participant != null) {
                participants.add(participant);
            }
        }

        if (participants.size() < 2) {
            initiator.sendError("Group call needs at least 2 users in the room.");
            return;
        }

        boolean alreadyActive = true;
        synchronized (stateLock) {
            for (ClientConnection participant : participants) {
                if (!participant.isInGroupCall(roomName)) {
                    alreadyActive = false;
                }
                if (participant.isInCall() && !participant.isInGroupCall(roomName)) {
                    initiator.sendError(participant.userName + " is busy in another call.");
                    return;
                }
            }
            if (alreadyActive) {
                initiator.sendSystemMessage("Group call is already active in room " + roomName + ".");
                return;
            }
            for (ClientConnection participant : participants) {
                participant.callMode = RealtimeProtocol.CALL_MODE_GROUP;
                participant.callPeer = null;
                participant.callRoom = roomName;
            }
        }

        for (ClientConnection participant : participants) {
            participant.sendCallStarted(
                RealtimeProtocol.CALL_MODE_GROUP,
                "Group call in " + roomName + " (" + participants.size() + " users)"
            );
        }
        appendLog("Group call started in room " + roomName + " with " + participants.size() + " participants");
    }

    private void endCallFor(ClientConnection requester, String reason) {
        if (!requester.isInCall()) {
            return;
        }

        LinkedHashSet<ClientConnection> affected = new LinkedHashSet<ClientConnection>();
        synchronized (stateLock) {
            if (RealtimeProtocol.CALL_MODE_PRIVATE.equals(requester.callMode)
                || RealtimeProtocol.CALL_MODE_PRIVATE_VIDEO.equals(requester.callMode)) {
                ClientConnection peer = clients.get(requester.callPeer);
                clearCallState(requester);
                affected.add(requester);
                if (peer != null && peer.isInPrivateCallWith(requester.userName)) {
                    clearCallState(peer);
                    affected.add(peer);
                }
            } else if (RealtimeProtocol.CALL_MODE_GROUP.equals(requester.callMode)) {
                String roomName = requester.callRoom;
                RoomInfo roomInfo = rooms.get(roomName);
                if (roomInfo != null) {
                    for (String memberName : roomInfo.members) {
                        ClientConnection participant = clients.get(memberName);
                        if (participant != null && participant.isInGroupCall(roomName)) {
                            clearCallState(participant);
                            affected.add(participant);
                        }
                    }
                }
                clearCallState(requester);
                affected.add(requester);
            }
        }

        for (ClientConnection participant : affected) {
            participant.sendCallEnded(reason);
        }
        appendLog(reason);
    }

    private void routeAudioFrame(ClientConnection sender, byte[] audio) {
        if (!sender.isInCall() || audio == null || audio.length == 0) {
            return;
        }

        if (RealtimeProtocol.CALL_MODE_PRIVATE.equals(sender.callMode)
            || RealtimeProtocol.CALL_MODE_PRIVATE_VIDEO.equals(sender.callMode)) {
            ClientConnection peer = clients.get(sender.callPeer);
            if (peer != null && peer.isInPrivateCallWith(sender.userName)) {
                peer.sendAudioFrame(sender.userName, audio);
            }
            return;
        }

        if (RealtimeProtocol.CALL_MODE_GROUP.equals(sender.callMode)) {
            RoomInfo roomInfo = rooms.get(sender.callRoom);
            if (roomInfo == null) {
                return;
            }
            for (String memberName : roomInfo.members) {
                if (memberName.equals(sender.userName)) {
                    continue;
                }
                ClientConnection participant = clients.get(memberName);
                if (participant != null && participant.isInGroupCall(sender.callRoom)) {
                    participant.sendAudioFrame(sender.userName, audio);
                }
            }
        }
    }

    private void clearCallState(ClientConnection connection) {
        connection.callMode = RealtimeProtocol.CALL_MODE_NONE;
        connection.callPeer = null;
        connection.callRoom = null;
    }

    private void routeVideoFrame(ClientConnection sender, byte[] payload) {
        if (!RealtimeProtocol.CALL_MODE_PRIVATE_VIDEO.equals(sender.callMode)
            || payload == null
            || payload.length == 0) {
            return;
        }
        ClientConnection peer = clients.get(sender.callPeer);
        if (peer != null && peer.isInPrivateCallWith(sender.userName)) {
            peer.sendVideoFrame(sender.userName, payload);
        }
    }

    private void broadcastSystemMessage(String message, String excludeUser) {
        for (ClientConnection connection : clients.values()) {
            if (connection.userName != null && connection.userName.equals(excludeUser)) {
                continue;
            }
            connection.sendSystemMessage(message);
        }
    }

    private void appendLog(String line) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(line + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }

    private String normalizeName(String value, String fallbackPrefix) {
        String cleaned = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (cleaned.isEmpty()) {
            cleaned = fallbackPrefix + guestSequence.incrementAndGet();
        }
        if (cleaned.length() > 24) {
            cleaned = cleaned.substring(0, 24);
        }
        return cleaned;
    }

    private String createUniqueUserName(String baseName) {
        String candidate = baseName;
        int suffix = 1;
        while (clients.containsKey(candidate)) {
            candidate = baseName + "_" + suffix;
            suffix++;
        }
        return candidate;
    }

    private String normalizeRoomName(String roomName) {
        String cleaned = roomName == null ? "" : roomName.trim().replaceAll("\\s+", "-");
        if (cleaned.length() > 24) {
            cleaned = cleaned.substring(0, 24);
        }
        return cleaned;
    }

    private interface PacketWriter {
        void write(DataOutputStream outputStream) throws IOException;
    }

    private final class ClientConnection implements Runnable {
        private final Socket socket;
        private final DataInputStream inputStream;
        private final DataOutputStream outputStream;
        private final Object sendLock = new Object();
        private volatile boolean connected = true;

        private String userName;
        private String roomName;
        private String callMode = RealtimeProtocol.CALL_MODE_NONE;
        private String callPeer;
        private String callRoom;

        private ClientConnection(Socket socket) throws IOException {
            this.socket = socket;
            this.inputStream = new DataInputStream(new BufferedInputStream(socket.getInputStream()));
            this.outputStream = new DataOutputStream(new BufferedOutputStream(socket.getOutputStream()));
        }

        @Override
        public void run() {
            try {
                String helloType = inputStream.readUTF();
                if (!RealtimeProtocol.HELLO.equals(helloType)) {
                    throw new IOException("Expected HELLO message.");
                }
                registerClient(this, inputStream.readUTF());

                while (connected && running) {
                    String messageType = inputStream.readUTF();
                    if (RealtimeProtocol.DIRECT_MESSAGE.equals(messageType)) {
                        handleDirectMessage(this, inputStream.readUTF(), inputStream.readUTF());
                    } else if (RealtimeProtocol.JOIN_ROOM.equals(messageType)) {
                        joinRoom(this, inputStream.readUTF());
                    } else if (RealtimeProtocol.LEAVE_ROOM.equals(messageType)) {
                        leaveRoomInternal(this, true);
                    } else if (RealtimeProtocol.ROOM_MESSAGE.equals(messageType)) {
                        handleRoomMessage(this, inputStream.readUTF());
                    } else if (RealtimeProtocol.PRIVATE_CALL_START.equals(messageType)) {
                        startPrivateCall(this, inputStream.readUTF());
                    } else if (RealtimeProtocol.PRIVATE_VIDEO_CALL_START.equals(messageType)) {
                        startPrivateVideoCall(this, inputStream.readUTF());
                    } else if (RealtimeProtocol.GROUP_CALL_START.equals(messageType)) {
                        startGroupCall(this);
                    } else if (RealtimeProtocol.CALL_END.equals(messageType)) {
                        endCallFor(this, this.userName + " ended the call.");
                    } else if (RealtimeProtocol.AUDIO_FRAME.equals(messageType)) {
                        int length = inputStream.readInt();
                        if (length > 0 && length <= RealtimeProtocol.AUDIO_FRAME_SIZE * 4) {
                            byte[] audio = new byte[length];
                            inputStream.readFully(audio);
                            routeAudioFrame(this, audio);
                        }
                    } else if (RealtimeProtocol.VIDEO_FRAME.equals(messageType)) {
                        int length = inputStream.readInt();
                        if (length > 0 && length <= RealtimeProtocol.VIDEO_MAX_FRAME_BYTES) {
                            byte[] payload = new byte[length];
                            inputStream.readFully(payload);
                            routeVideoFrame(this, payload);
                        }
                    } else {
                        sendError("Unsupported command: " + messageType);
                    }
                }
            } catch (IOException ex) {
                if (connected && userName != null) {
                    appendLog("Connection closed for " + userName + ": " + ex.getMessage());
                }
            } finally {
                connected = false;
                unregisterClient(this, userName == null ? "Client disconnected before login." : userName + " disconnected.");
            }
        }

        private boolean isInCall() {
            return !RealtimeProtocol.CALL_MODE_NONE.equals(callMode);
        }

        private boolean isInPrivateCallWith(String otherUser) {
            return (RealtimeProtocol.CALL_MODE_PRIVATE.equals(callMode)
                || RealtimeProtocol.CALL_MODE_PRIVATE_VIDEO.equals(callMode))
                && otherUser != null
                && otherUser.equals(callPeer);
        }

        private boolean isInGroupCall(String room) {
            return RealtimeProtocol.CALL_MODE_GROUP.equals(callMode) && room != null && room.equals(callRoom);
        }

        private void sendWelcome(final String assignedName) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.WELCOME);
                output.writeUTF(assignedName);
            });
        }

        private void sendSystemMessage(final String message) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.SYSTEM_MESSAGE);
                output.writeUTF(message);
            });
        }

        private void sendError(final String message) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.ERROR);
                output.writeUTF(message);
            });
        }

        private void sendUserList(final List<String> users) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.USER_LIST);
                output.writeInt(users.size());
                for (String user : users) {
                    output.writeUTF(user);
                }
            });
        }

        private void sendRoomList(final TreeMap<String, Integer> roomSummary) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.ROOM_LIST);
                output.writeInt(roomSummary.size());
                for (String room : roomSummary.keySet()) {
                    output.writeUTF(room);
                    output.writeInt(roomSummary.get(room).intValue());
                }
            });
        }

        private void sendRoomJoined(final String room) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.ROOM_JOINED);
                output.writeUTF(room);
            });
        }

        private void sendRoomLeft(final String room) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.ROOM_LEFT);
                output.writeUTF(room);
            });
        }

        private void sendDirectMessage(final String fromUser, final String message) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.DIRECT_MESSAGE);
                output.writeUTF(fromUser);
                output.writeUTF(message);
            });
        }

        private void sendRoomMessage(final String room, final String fromUser, final String message) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.ROOM_MESSAGE);
                output.writeUTF(room);
                output.writeUTF(fromUser);
                output.writeUTF(message);
            });
        }

        private void sendCallStarted(final String mode, final String label) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.CALL_STARTED);
                output.writeUTF(mode);
                output.writeUTF(label);
            });
        }

        private void sendCallEnded(final String reason) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.CALL_ENDED);
                output.writeUTF(reason);
            });
        }

        private void sendAudioFrame(final String fromUser, final byte[] audio) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.AUDIO_FRAME);
                output.writeUTF(fromUser);
                output.writeInt(audio.length);
                output.write(audio);
            });
        }

        private void sendVideoFrame(final String fromUser, final byte[] payload) {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.VIDEO_FRAME);
                output.writeUTF(fromUser);
                output.writeInt(payload.length);
                output.write(payload);
            });
        }

        private void sendPacket(PacketWriter writer) {
            synchronized (sendLock) {
                if (!connected) {
                    return;
                }
                try {
                    writer.write(outputStream);
                    outputStream.flush();
                } catch (IOException ex) {
                    connected = false;
                    close();
                }
            }
        }

        private void close() {
            connected = false;
            closeResources();
        }

        private void closeResources() {
            try {
                inputStream.close();
            } catch (Exception ignored) {
            }
            try {
                outputStream.close();
            } catch (Exception ignored) {
            }
            try {
                socket.close();
            } catch (Exception ignored) {
            }
        }
    }

    private static final class RoomInfo {
        private final String name;
        private final Set<String> members = Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>());

        private RoomInfo(String name) {
            this.name = name;
        }
    }
}
