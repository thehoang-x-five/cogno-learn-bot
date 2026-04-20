package com.student52300082.networkproject.realtime;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Graphics2D;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.Rectangle;
import java.awt.Robot;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.image.BufferedImage;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Socket;
import java.util.Arrays;
import javax.imageio.ImageIO;
import javax.swing.BorderFactory;
import javax.swing.ImageIcon;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.SourceDataLine;
import javax.sound.sampled.TargetDataLine;
import javax.swing.DefaultComboBoxModel;
import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JList;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTabbedPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.ListSelectionModel;
import javax.swing.SwingUtilities;

public class RealtimeCommClientFrame extends JFrame {
    private final JTextField txtHost = new JTextField(AppConfig.DEFAULT_HOST, 12);
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_REALTIME_PORT), 7);
    private final JTextField txtUserName = new JTextField("Van", 10);
    private final JTextField txtDirectMessage = new JTextField(24);
    private final JTextField txtRoomName = new JTextField("mobile-team", 12);
    private final JTextField txtRoomMessage = new JTextField(24);
    private final JTextArea logArea = UiTheme.logArea();
    private final JTextArea directInboxArea = UiTheme.logArea();
    private final JTextArea roomInboxArea = UiTheme.logArea();
    private final DefaultListModel<String> onlineUsersModel = new DefaultListModel<String>();
    private final DefaultListModel<String> roomListModel = new DefaultListModel<String>();
    private final DefaultComboBoxModel<String> directTargetModel = new DefaultComboBoxModel<String>();
    private final JComboBox<String> cboDirectTarget = new JComboBox<String>(directTargetModel);
    private final JLabel lblUserValue = UiTheme.subtitle("-");
    private final JLabel lblRoomValue = UiTheme.subtitle("No room");
    private final JLabel lblCallValue = UiTheme.subtitle("No active call");

    private Socket socket;
    private DataInputStream inputStream;
    private DataOutputStream outputStream;
    private final Object sendLock = new Object();
    private volatile boolean running;

    private String currentUserName;
    private String currentRoomName;
    private String callMode = RealtimeProtocol.CALL_MODE_NONE;
    private boolean microphoneMuted;
    private long lastAudioLogAt;

    private TargetDataLine microphoneLine;
    private SourceDataLine speakerLine;
    private Thread audioCaptureThread;
    private Thread videoCaptureThread;
    private volatile boolean videoStreaming;

    private JButton btnConnect;
    private JButton btnDisconnect;
    private JButton btnJoinRoom;
    private JButton btnLeaveRoom;
    private JButton btnSendDirect;
    private JButton btnSendRoom;
    private JButton btnPrivateCall;
    private JButton btnVideoCall;
    private JButton btnGroupCall;
    private JButton btnEndCall;
    private JButton btnMute;
    private JLabel lblLocalVideo;
    private JLabel lblRemoteVideo;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new RealtimeCommClientFrame().setVisible(true));
    }

    public RealtimeCommClientFrame() {
        UiTheme.prepareFrame(this);
        setTitle("Realtime Communication Client");
        setSize(1040, 760);
        setMinimumSize(new Dimension(960, 700));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        JPanel page = UiTheme.page(18, 20, 20, 20);
        page.add(UiTheme.gradientHeader(
            "Realtime Communication Client",
            "Direct live chat, room chat, one-to-one call and room group call"
        ), BorderLayout.NORTH);

        JPanel connectionCard = UiTheme.card();
        connectionCard.setLayout(new BorderLayout(10, 10));
        JPanel connectionRow = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        connectionRow.setBackground(UiTheme.SURFACE);
        btnConnect = UiTheme.primaryButton("Connect");
        btnDisconnect = UiTheme.secondaryButton("Disconnect");
        connectionRow.add(UiTheme.title("Connection"));
        connectionRow.add(new JLabel("Host"));
        connectionRow.add(txtHost);
        connectionRow.add(new JLabel("Port"));
        connectionRow.add(txtPort);
        connectionRow.add(new JLabel("Name"));
        connectionRow.add(txtUserName);
        connectionRow.add(btnConnect);
        connectionRow.add(btnDisconnect);
        connectionCard.add(connectionRow, BorderLayout.CENTER);

        JPanel statusCard = UiTheme.card();
        JPanel statusGrid = new JPanel(new GridLayout(1, 3, 10, 10));
        statusGrid.setBackground(UiTheme.SURFACE);
        statusGrid.add(statusItem("Connected as", lblUserValue));
        statusGrid.add(statusItem("Current room", lblRoomValue));
        statusGrid.add(statusItem("Call status", lblCallValue));
        statusCard.add(statusGrid, BorderLayout.CENTER);

        JPanel topPanel = new JPanel(new BorderLayout(12, 12));
        topPanel.setBackground(UiTheme.BACKGROUND);
        topPanel.add(connectionCard, BorderLayout.NORTH);
        topPanel.add(statusCard, BorderLayout.SOUTH);

        JList<String> onlineUsersList = createInfoList(onlineUsersModel);
        JList<String> roomsList = createInfoList(roomListModel);
        onlineUsersList.addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting() && onlineUsersList.getSelectedValue() != null) {
                cboDirectTarget.setSelectedItem(onlineUsersList.getSelectedValue());
            }
        });
        roomsList.addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting() && roomsList.getSelectedValue() != null) {
                String selected = roomsList.getSelectedValue();
                int separatorIndex = selected.indexOf(" (");
                txtRoomName.setText(separatorIndex > 0 ? selected.substring(0, separatorIndex) : selected);
            }
        });

        JPanel usersCard = titledListCard("Online Users", onlineUsersList);
        JPanel roomsCard = titledListCard("Rooms", roomsList);
        JPanel sidePanel = new JPanel(new GridLayout(2, 1, 10, 10));
        sidePanel.setBackground(UiTheme.BACKGROUND);
        sidePanel.add(usersCard);
        sidePanel.add(roomsCard);

        JPanel logCard = UiTheme.card();
        logCard.add(UiTheme.title("Message Monitor"), BorderLayout.NORTH);
        JTabbedPane monitorTabs = new JTabbedPane();
        monitorTabs.setFont(UiTheme.BODY_FONT);
        monitorTabs.addTab("Activity", UiTheme.scroll(logArea));
        monitorTabs.addTab("Direct Inbox", UiTheme.scroll(directInboxArea));
        monitorTabs.addTab("Room Inbox", UiTheme.scroll(roomInboxArea));
        logCard.add(monitorTabs, BorderLayout.CENTER);

        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, sidePanel, logCard);
        splitPane.setResizeWeight(0.28);
        splitPane.setBorder(null);
        splitPane.setOpaque(false);
        splitPane.setBackground(UiTheme.BACKGROUND);

        JPanel directChatCard = UiTheme.card();
        directChatCard.add(UiTheme.title("Live Chat"), BorderLayout.NORTH);
        JPanel directChatRow = new JPanel(new GridBagLayout());
        directChatRow.setBackground(UiTheme.SURFACE);
        GridBagConstraints dmGc = new GridBagConstraints();
        dmGc.gridx = 0;
        dmGc.gridy = 0;
        dmGc.insets = new java.awt.Insets(0, 0, 8, 8);
        dmGc.anchor = GridBagConstraints.WEST;
        btnSendDirect = UiTheme.primaryButton("Send DM");
        btnPrivateCall = UiTheme.secondaryButton("Start Call");
        btnVideoCall = UiTheme.secondaryButton("Video Call");
        directChatRow.add(new JLabel("Target"), dmGc);
        dmGc.gridx = 1;
        directChatRow.add(cboDirectTarget, dmGc);
        dmGc.gridx = 0;
        dmGc.gridy = 1;
        dmGc.insets = new java.awt.Insets(0, 0, 0, 8);
        directChatRow.add(new JLabel("Message"), dmGc);
        dmGc.gridx = 1;
        dmGc.weightx = 1.0;
        dmGc.fill = GridBagConstraints.HORIZONTAL;
        directChatRow.add(txtDirectMessage, dmGc);
        dmGc.gridx = 2;
        dmGc.weightx = 0.0;
        dmGc.fill = GridBagConstraints.NONE;
        directChatRow.add(btnSendDirect, dmGc);
        dmGc.gridx = 3;
        directChatRow.add(btnPrivateCall, dmGc);
        dmGc.gridx = 4;
        directChatRow.add(btnVideoCall, dmGc);
        directChatCard.add(directChatRow, BorderLayout.CENTER);

        JPanel groupChatCard = UiTheme.card();
        groupChatCard.add(UiTheme.title("Group Chat"), BorderLayout.NORTH);
        JPanel groupChatRow = new JPanel(new GridBagLayout());
        groupChatRow.setBackground(UiTheme.SURFACE);
        GridBagConstraints roomGc = new GridBagConstraints();
        roomGc.gridx = 0;
        roomGc.gridy = 0;
        roomGc.insets = new java.awt.Insets(0, 0, 8, 8);
        roomGc.anchor = GridBagConstraints.WEST;
        btnJoinRoom = UiTheme.primaryButton("Join Room");
        btnLeaveRoom = UiTheme.secondaryButton("Leave Room");
        btnSendRoom = UiTheme.primaryButton("Send Room");
        btnGroupCall = UiTheme.secondaryButton("Group Call");
        groupChatRow.add(new JLabel("Room"), roomGc);
        roomGc.gridx = 1;
        groupChatRow.add(txtRoomName, roomGc);
        roomGc.gridx = 2;
        groupChatRow.add(btnJoinRoom, roomGc);
        roomGc.gridx = 3;
        groupChatRow.add(btnLeaveRoom, roomGc);
        roomGc.gridx = 0;
        roomGc.gridy = 1;
        roomGc.insets = new java.awt.Insets(0, 0, 0, 8);
        groupChatRow.add(new JLabel("Message"), roomGc);
        roomGc.gridx = 1;
        roomGc.weightx = 1.0;
        roomGc.fill = GridBagConstraints.HORIZONTAL;
        groupChatRow.add(txtRoomMessage, roomGc);
        roomGc.gridx = 2;
        roomGc.weightx = 0.0;
        roomGc.fill = GridBagConstraints.NONE;
        groupChatRow.add(btnSendRoom, roomGc);
        roomGc.gridx = 3;
        groupChatRow.add(btnGroupCall, roomGc);
        groupChatCard.add(groupChatRow, BorderLayout.CENTER);

        JPanel callCard = UiTheme.card();
        callCard.add(UiTheme.title("Call Controls"), BorderLayout.NORTH);
        JPanel callRow = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        callRow.setBackground(UiTheme.SURFACE);
        btnMute = UiTheme.secondaryButton("Mute Mic");
        btnEndCall = UiTheme.accentButton("End Call");
        callRow.add(UiTheme.subtitle("Audio call + video call demo (screen-frame relay via server)."));
        callRow.add(btnMute);
        callRow.add(btnEndCall);
        callCard.add(callRow, BorderLayout.NORTH);

        JPanel videoPanel = new JPanel(new GridLayout(1, 2, 10, 0));
        videoPanel.setBackground(UiTheme.SURFACE);
        lblLocalVideo = createVideoLabel("Local Preview");
        lblRemoteVideo = createVideoLabel("Remote Preview");
        videoPanel.add(wrapVideoCard("Local", lblLocalVideo));
        videoPanel.add(wrapVideoCard("Remote", lblRemoteVideo));
        callCard.add(videoPanel, BorderLayout.CENTER);

        JPanel actionPanel = new JPanel(new GridLayout(3, 1, 10, 10));
        actionPanel.setBackground(UiTheme.BACKGROUND);
        actionPanel.add(directChatCard);
        actionPanel.add(groupChatCard);
        actionPanel.add(callCard);

        JPanel body = new JPanel(new BorderLayout(12, 12));
        body.setBackground(UiTheme.BACKGROUND);
        body.add(topPanel, BorderLayout.NORTH);
        body.add(splitPane, BorderLayout.CENTER);
        body.add(actionPanel, BorderLayout.SOUTH);

        page.add(body, BorderLayout.CENTER);
        setContentPane(page);

        btnConnect.addActionListener(e -> connectToServer());
        btnDisconnect.addActionListener(e -> disconnectFromServer("Disconnected from realtime server."));
        btnJoinRoom.addActionListener(e -> joinRoom());
        btnLeaveRoom.addActionListener(e -> leaveRoom());
        btnSendDirect.addActionListener(e -> sendDirectMessage());
        btnSendRoom.addActionListener(e -> sendRoomMessage());
        btnPrivateCall.addActionListener(e -> startPrivateCall());
        btnVideoCall.addActionListener(e -> startVideoCall());
        btnGroupCall.addActionListener(e -> startGroupCall());
        btnEndCall.addActionListener(e -> endCall());
        btnMute.addActionListener(e -> toggleMute());
        txtDirectMessage.addActionListener(e -> sendDirectMessage());
        txtRoomMessage.addActionListener(e -> sendRoomMessage());

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                disconnectFromServer(null);
            }
        });

        UiTheme.styleTree(getContentPane());
        cboDirectTarget.setFont(UiTheme.BODY_FONT);
        cboDirectTarget.setBackground(UiTheme.SURFACE);
        cboDirectTarget.setForeground(UiTheme.INK);
        cboDirectTarget.addActionListener(e -> updateControlState());
        updateControlState();
    }

    public void loadDemoStateForScreenshot() {
        currentUserName = "Van";
        currentRoomName = "mobile-team";
        callMode = RealtimeProtocol.CALL_MODE_GROUP;
        microphoneMuted = false;
        lblUserValue.setText(currentUserName);
        lblRoomValue.setText(currentRoomName);
        lblCallValue.setText("Group call in mobile-team (3 users)");
        directTargetModel.removeAllElements();
        directTargetModel.addElement("Linh");
        directTargetModel.addElement("Minh");
        cboDirectTarget.setSelectedItem("Linh");
        onlineUsersModel.clear();
        onlineUsersModel.addElement("Linh");
        onlineUsersModel.addElement("Minh");
        roomListModel.clear();
        roomListModel.addElement("mobile-team (3)");
        roomListModel.addElement("demo-room (2)");
        txtDirectMessage.setText("Please verify the audio relay.");
        txtRoomName.setText("mobile-team");
        txtRoomMessage.setText("Group call is stable on localhost.");
        logArea.setText(
            "Connected as Van to localhost:" + AppConfig.DEFAULT_REALTIME_PORT + System.lineSeparator()
            + "[System] Connected to realtime server as Van." + System.lineSeparator()
            + "[DM to Linh] Please verify the audio relay." + System.lineSeparator()
            + "[DM from Linh] Audio packets are arriving correctly." + System.lineSeparator()
            + "[mobile-team][Van] Group chat is live." + System.lineSeparator()
            + "[mobile-team][Minh] Ready for the group demo." + System.lineSeparator()
            + "[System] Group call in mobile-team (3 users)" + System.lineSeparator()
            + "[Audio] Streaming microphone frames..." + System.lineSeparator()
            + "[Audio] Receiving voice from Linh" + System.lineSeparator()
            + "[Audio] Receiving voice from Minh"
        );
        directInboxArea.setText(
            "[DM from Linh] Audio packets are arriving correctly." + System.lineSeparator()
            + "[DM from Minh] Da xac nhan call ben client em."
        );
        roomInboxArea.setText(
            "[mobile-team][Minh] Ready for the group demo." + System.lineSeparator()
            + "[mobile-team][Linh] Group call status: stable."
        );
        lblLocalVideo.setText("Local Preview");
        lblRemoteVideo.setText("Remote Preview");
        lblLocalVideo.setIcon(null);
        lblRemoteVideo.setIcon(null);
        updateControlState();
    }

    public void connectForDemo(String host, int port, String userName, int x, int y) {
        txtHost.setText(host);
        txtPort.setText(String.valueOf(port));
        txtUserName.setText(userName);
        setLocation(x, y);
        connectToServer();
    }

    private JLabel createVideoLabel(String text) {
        JLabel label = new JLabel(text, JLabel.CENTER);
        label.setOpaque(true);
        label.setBackground(UiTheme.CONSOLE);
        label.setForeground(UiTheme.CONSOLE_TEXT);
        label.setFont(UiTheme.BODY_FONT);
        label.setPreferredSize(new Dimension(220, 150));
        label.setBorder(BorderFactory.createLineBorder(UiTheme.LINE));
        return label;
    }

    private JPanel wrapVideoCard(String title, JLabel videoLabel) {
        JPanel panel = UiTheme.card();
        panel.add(UiTheme.subtitle(title), BorderLayout.NORTH);
        panel.add(videoLabel, BorderLayout.CENTER);
        return panel;
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

    private JPanel statusItem(String title, JLabel valueLabel) {
        JPanel panel = new JPanel(new BorderLayout(2, 2));
        panel.setBackground(UiTheme.SURFACE);
        panel.add(UiTheme.subtitle(title), BorderLayout.NORTH);
        panel.add(valueLabel, BorderLayout.CENTER);
        return panel;
    }

    private void connectToServer() {
        if (running) {
            appendLog("[System] Already connected.");
            return;
        }

        final int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        String host = txtHost.getText().trim();
        if (host.isEmpty()) {
            host = AppConfig.DEFAULT_HOST;
        }

        String requestedName = txtUserName.getText().trim();
        if (requestedName.isEmpty()) {
            requestedName = "User";
        }

        try {
            socket = new Socket(host, port);
            inputStream = new DataInputStream(new BufferedInputStream(socket.getInputStream()));
            outputStream = new DataOutputStream(new BufferedOutputStream(socket.getOutputStream()));

            synchronized (sendLock) {
                outputStream.writeUTF(RealtimeProtocol.HELLO);
                outputStream.writeUTF(requestedName);
                outputStream.flush();
            }

            String responseType = inputStream.readUTF();
            if (!RealtimeProtocol.WELCOME.equals(responseType)) {
                throw new IOException("Unexpected response from server.");
            }

            currentUserName = inputStream.readUTF();
            running = true;
            appendLog("[System] Connected as " + currentUserName + " to " + host + ":" + port);
            refreshStatusLabels();
            updateControlState();
            new Thread(this::receiveLoop, "realtime-client-receiver").start();
        } catch (IOException ex) {
            disconnectFromServer(null);
            JOptionPane.showMessageDialog(this, "Cannot connect: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void receiveLoop() {
        try {
            while (running && socket != null && !socket.isClosed()) {
                String messageType = inputStream.readUTF();
                if (RealtimeProtocol.SYSTEM_MESSAGE.equals(messageType)) {
                    appendLog("[System] " + inputStream.readUTF());
                } else if (RealtimeProtocol.ERROR.equals(messageType)) {
                    appendLog("[Error] " + inputStream.readUTF());
                } else if (RealtimeProtocol.USER_LIST.equals(messageType)) {
                    updateUsersFromServer();
                } else if (RealtimeProtocol.ROOM_LIST.equals(messageType)) {
                    updateRoomsFromServer();
                } else if (RealtimeProtocol.ROOM_JOINED.equals(messageType)) {
                    currentRoomName = inputStream.readUTF();
                    appendLog("[System] Joined room " + currentRoomName + ".");
                    refreshStatusLabels();
                } else if (RealtimeProtocol.ROOM_LEFT.equals(messageType)) {
                    String roomName = inputStream.readUTF();
                    currentRoomName = null;
                    appendLog("[System] Left room " + roomName + ".");
                    refreshStatusLabels();
                } else if (RealtimeProtocol.DIRECT_MESSAGE.equals(messageType)) {
                    String fromUser = inputStream.readUTF();
                    String message = inputStream.readUTF();
                    appendLog("[DM from " + fromUser + "] " + message);
                    appendDirectInbox("[DM from " + fromUser + "] " + message);
                } else if (RealtimeProtocol.ROOM_MESSAGE.equals(messageType)) {
                    String roomName = inputStream.readUTF();
                    String fromUser = inputStream.readUTF();
                    String message = inputStream.readUTF();
                    appendLog("[" + roomName + "][" + fromUser + "] " + message);
                    appendRoomInbox("[" + roomName + "][" + fromUser + "] " + message);
                } else if (RealtimeProtocol.CALL_STARTED.equals(messageType)) {
                    startCallSession(inputStream.readUTF(), inputStream.readUTF());
                } else if (RealtimeProtocol.CALL_ENDED.equals(messageType)) {
                    finishCallSession(inputStream.readUTF());
                } else if (RealtimeProtocol.AUDIO_FRAME.equals(messageType)) {
                    String fromUser = inputStream.readUTF();
                    int length = inputStream.readInt();
                    if (length > 0 && length <= RealtimeProtocol.AUDIO_FRAME_SIZE * 4) {
                        byte[] audio = new byte[length];
                        inputStream.readFully(audio);
                        playIncomingAudio(fromUser, audio);
                    }
                } else if (RealtimeProtocol.VIDEO_FRAME.equals(messageType)) {
                    String fromUser = inputStream.readUTF();
                    int length = inputStream.readInt();
                    if (length > 0 && length <= RealtimeProtocol.VIDEO_MAX_FRAME_BYTES) {
                        byte[] payload = new byte[length];
                        inputStream.readFully(payload);
                        playIncomingVideoFrame(fromUser, payload);
                    }
                }
            }
        } catch (IOException ex) {
            if (running) {
                disconnectFromServer("Connection lost: " + ex.getMessage());
            }
        }
    }

    private void updateUsersFromServer() throws IOException {
        final int count = inputStream.readInt();
        final String[] users = new String[count];
        for (int i = 0; i < count; i++) {
            users[i] = inputStream.readUTF();
        }
        SwingUtilities.invokeLater(() -> {
            onlineUsersModel.clear();
            directTargetModel.removeAllElements();
            for (String user : users) {
                if (user.equals(currentUserName)) {
                    continue;
                }
                onlineUsersModel.addElement(user);
                directTargetModel.addElement(user);
            }
            if (directTargetModel.getSize() > 0 && cboDirectTarget.getSelectedItem() == null) {
                cboDirectTarget.setSelectedIndex(0);
            }
            updateControlState();
        });
    }

    private void updateRoomsFromServer() throws IOException {
        final int count = inputStream.readInt();
        final String[] rooms = new String[count];
        for (int i = 0; i < count; i++) {
            rooms[i] = inputStream.readUTF() + " (" + inputStream.readInt() + ")";
        }
        SwingUtilities.invokeLater(() -> {
            roomListModel.clear();
            for (String room : rooms) {
                roomListModel.addElement(room);
            }
            updateControlState();
        });
    }

    private void sendDirectMessage() {
        if (!running) {
            appendLog("[System] Connect before sending messages.");
            return;
        }
        Object targetObject = cboDirectTarget.getSelectedItem();
        if (targetObject == null) {
            appendLog("[System] No target user selected.");
            return;
        }
        String message = txtDirectMessage.getText().trim();
        if (message.isEmpty()) {
            return;
        }
        try {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.DIRECT_MESSAGE);
                output.writeUTF(targetObject.toString());
                output.writeUTF(message);
            });
            appendLog("[DM to " + targetObject + "] " + message);
            appendDirectInbox("[DM to " + targetObject + "] " + message);
            txtDirectMessage.setText("");
        } catch (IOException ex) {
            disconnectFromServer("Send failed: " + ex.getMessage());
        }
    }

    private void joinRoom() {
        if (!running) {
            appendLog("[System] Connect before joining a room.");
            return;
        }
        String roomName = txtRoomName.getText().trim();
        if (roomName.isEmpty()) {
            appendLog("[System] Room name cannot be empty.");
            return;
        }
        try {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.JOIN_ROOM);
                output.writeUTF(roomName);
            });
        } catch (IOException ex) {
            disconnectFromServer("Join room failed: " + ex.getMessage());
        }
    }

    private void leaveRoom() {
        if (!running) {
            return;
        }
        if (currentRoomName == null || currentRoomName.trim().isEmpty()) {
            appendLog("[System] You are not inside any room.");
            return;
        }
        try {
            sendPacket(output -> output.writeUTF(RealtimeProtocol.LEAVE_ROOM));
        } catch (IOException ex) {
            disconnectFromServer("Leave room failed: " + ex.getMessage());
        }
    }

    private void sendRoomMessage() {
        if (!running) {
            appendLog("[System] Connect before using group chat.");
            return;
        }
        String message = txtRoomMessage.getText().trim();
        if (message.isEmpty()) {
            return;
        }
        if (currentRoomName == null || currentRoomName.trim().isEmpty()) {
            appendLog("[System] Join a room before sending group messages.");
            return;
        }
        try {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.ROOM_MESSAGE);
                output.writeUTF(message);
            });
            appendLog("[" + currentRoomName + "][Me] " + message);
            appendRoomInbox("[" + currentRoomName + "][Me] " + message);
            txtRoomMessage.setText("");
        } catch (IOException ex) {
            disconnectFromServer("Group message failed: " + ex.getMessage());
        }
    }

    private void startPrivateCall() {
        if (!running) {
            appendLog("[System] Connect before starting a call.");
            return;
        }
        Object targetObject = cboDirectTarget.getSelectedItem();
        if (targetObject == null) {
            appendLog("[System] Choose a target user first.");
            return;
        }
        try {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.PRIVATE_CALL_START);
                output.writeUTF(targetObject.toString());
            });
        } catch (IOException ex) {
            disconnectFromServer("Start call failed: " + ex.getMessage());
        }
    }

    private void startVideoCall() {
        if (!running) {
            appendLog("[System] Connect before starting a video call.");
            return;
        }
        Object targetObject = cboDirectTarget.getSelectedItem();
        if (targetObject == null) {
            appendLog("[System] Choose a target user first.");
            return;
        }
        try {
            sendPacket(output -> {
                output.writeUTF(RealtimeProtocol.PRIVATE_VIDEO_CALL_START);
                output.writeUTF(targetObject.toString());
            });
        } catch (IOException ex) {
            disconnectFromServer("Start video call failed: " + ex.getMessage());
        }
    }

    private void startGroupCall() {
        if (!running) {
            appendLog("[System] Connect before starting a group call.");
            return;
        }
        if (currentRoomName == null || currentRoomName.trim().isEmpty()) {
            appendLog("[System] Join a room before starting a group call.");
            return;
        }
        try {
            sendPacket(output -> output.writeUTF(RealtimeProtocol.GROUP_CALL_START));
        } catch (IOException ex) {
            disconnectFromServer("Group call failed: " + ex.getMessage());
        }
    }

    private void endCall() {
        if (!running || RealtimeProtocol.CALL_MODE_NONE.equals(callMode)) {
            appendLog("[System] There is no active call.");
            return;
        }
        try {
            sendPacket(output -> output.writeUTF(RealtimeProtocol.CALL_END));
        } catch (IOException ex) {
            disconnectFromServer("End call failed: " + ex.getMessage());
        }
    }

    private void toggleMute() {
        if (RealtimeProtocol.CALL_MODE_NONE.equals(callMode)) {
            appendLog("[System] Start a call before toggling microphone state.");
            return;
        }
        microphoneMuted = !microphoneMuted;
        btnMute.setText(microphoneMuted ? "Unmute Mic" : "Mute Mic");
        appendLog(microphoneMuted ? "[Audio] Microphone muted." : "[Audio] Microphone unmuted.");
    }

    private void startCallSession(String newCallMode, String label) {
        callMode = newCallMode;
        microphoneMuted = false;
        btnMute.setText("Mute Mic");
        lblCallValue.setText(label);
        appendLog("[System] " + label);
        updateControlState();
        tryOpenSpeaker();
        tryOpenMicrophone();
        startAudioCaptureThread();
        if (RealtimeProtocol.CALL_MODE_PRIVATE_VIDEO.equals(newCallMode)) {
            startVideoCaptureThread();
        } else {
            clearVideoPreviews();
        }
    }

    private void finishCallSession(String reason) {
        stopAudioResources();
        stopVideoCaptureThread();
        callMode = RealtimeProtocol.CALL_MODE_NONE;
        microphoneMuted = false;
        lblCallValue.setText("No active call");
        btnMute.setText("Mute Mic");
        appendLog("[System] " + reason);
        clearVideoPreviews();
        updateControlState();
    }

    private void tryOpenMicrophone() {
        if (microphoneLine != null && microphoneLine.isOpen()) {
            return;
        }
        try {
            AudioFormat format = createAudioFormat();
            DataLine.Info info = new DataLine.Info(TargetDataLine.class, format);
            if (!AudioSystem.isLineSupported(info)) {
                appendLog("[Audio] Microphone line is not supported on this device.");
                return;
            }
            microphoneLine = (TargetDataLine) AudioSystem.getLine(info);
            microphoneLine.open(format);
            microphoneLine.start();
            appendLog("[Audio] Microphone ready.");
        } catch (LineUnavailableException ex) {
            appendLog("[Audio] Cannot open microphone: " + ex.getMessage());
        }
    }

    private void tryOpenSpeaker() {
        if (speakerLine != null && speakerLine.isOpen()) {
            return;
        }
        try {
            AudioFormat format = createAudioFormat();
            DataLine.Info info = new DataLine.Info(SourceDataLine.class, format);
            if (!AudioSystem.isLineSupported(info)) {
                appendLog("[Audio] Speaker line is not supported on this device.");
                return;
            }
            speakerLine = (SourceDataLine) AudioSystem.getLine(info);
            speakerLine.open(format);
            speakerLine.start();
            appendLog("[Audio] Speaker ready.");
        } catch (LineUnavailableException ex) {
            appendLog("[Audio] Cannot open speaker: " + ex.getMessage());
        }
    }

    private void startAudioCaptureThread() {
        if (microphoneLine == null || !microphoneLine.isOpen()) {
            return;
        }
        if (audioCaptureThread != null && audioCaptureThread.isAlive()) {
            return;
        }
        audioCaptureThread = new Thread(() -> {
            byte[] buffer = new byte[RealtimeProtocol.AUDIO_FRAME_SIZE];
            while (running && !RealtimeProtocol.CALL_MODE_NONE.equals(callMode) && microphoneLine != null && microphoneLine.isOpen()) {
                int bytesRead = microphoneLine.read(buffer, 0, buffer.length);
                if (bytesRead <= 0) {
                    continue;
                }
                if (microphoneMuted) {
                    continue;
                }
                final byte[] payload = Arrays.copyOf(buffer, bytesRead);
                try {
                    sendPacket(output -> {
                        output.writeUTF(RealtimeProtocol.AUDIO_FRAME);
                        output.writeInt(payload.length);
                        output.write(payload);
                    });
                } catch (IOException ex) {
                    disconnectFromServer("Audio stream stopped: " + ex.getMessage());
                    break;
                }
            }
        }, "realtime-audio-capture");
        audioCaptureThread.setDaemon(true);
        audioCaptureThread.start();
    }

    private void playIncomingAudio(String fromUser, byte[] audio) {
        if (speakerLine == null || !speakerLine.isOpen()) {
            return;
        }
        speakerLine.write(audio, 0, audio.length);
        if (audio.length > 0) {
            appendAudioHint(fromUser);
        }
    }

    private void appendAudioHint(String fromUser) {
        SwingUtilities.invokeLater(() -> {
            long now = System.currentTimeMillis();
            if (now - lastAudioLogAt < 1500L) {
                return;
            }
            lastAudioLogAt = now;
            String marker = "[Audio] Receiving voice from " + fromUser;
            logArea.append(marker + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }

    private void stopAudioResources() {
        Thread captureThread = audioCaptureThread;
        audioCaptureThread = null;
        if (captureThread != null) {
            captureThread.interrupt();
        }
        if (microphoneLine != null) {
            if (microphoneLine.isRunning()) {
                microphoneLine.stop();
            }
            microphoneLine.close();
            microphoneLine = null;
        }
        if (speakerLine != null) {
            if (speakerLine.isRunning()) {
                speakerLine.drain();
                speakerLine.stop();
            }
            speakerLine.close();
            speakerLine = null;
        }
    }

    private void startVideoCaptureThread() {
        if (videoCaptureThread != null && videoCaptureThread.isAlive()) {
            return;
        }
        videoStreaming = true;
        videoCaptureThread = new Thread(() -> {
            try {
                Robot robot = new Robot();
                Rectangle captureArea = new Rectangle(360, 240);
                while (running && videoStreaming && RealtimeProtocol.CALL_MODE_PRIVATE_VIDEO.equals(callMode)) {
                    BufferedImage image = robot.createScreenCapture(captureArea);
                    updateLocalPreview(image);
                    byte[] payload = encodeVideoFrame(image);
                    if (payload.length > 0) {
                        sendPacket(output -> {
                            output.writeUTF(RealtimeProtocol.VIDEO_FRAME);
                            output.writeInt(payload.length);
                            output.write(payload);
                        });
                    }
                    Thread.sleep(RealtimeProtocol.VIDEO_FRAME_INTERVAL_MS);
                }
            } catch (Exception ex) {
                if (running && RealtimeProtocol.CALL_MODE_PRIVATE_VIDEO.equals(callMode)) {
                    appendLog("[Video] Video stream stopped: " + ex.getMessage());
                }
            }
        }, "realtime-video-capture");
        videoCaptureThread.setDaemon(true);
        videoCaptureThread.start();
        appendLog("[Video] Video call demo stream started.");
    }

    private void stopVideoCaptureThread() {
        videoStreaming = false;
        Thread captureThread = videoCaptureThread;
        videoCaptureThread = null;
        if (captureThread != null) {
            captureThread.interrupt();
        }
    }

    private byte[] encodeVideoFrame(BufferedImage image) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", output);
            byte[] payload = output.toByteArray();
            if (payload.length > RealtimeProtocol.VIDEO_MAX_FRAME_BYTES) {
                return new byte[0];
            }
            return payload;
        } catch (IOException ex) {
            return new byte[0];
        }
    }

    private void playIncomingVideoFrame(String fromUser, byte[] payload) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(payload));
            if (image == null) {
                return;
            }
            SwingUtilities.invokeLater(() -> {
                lblRemoteVideo.setText("Remote: " + fromUser);
                lblRemoteVideo.setIcon(new ImageIcon(scaleVideoPreview(image)));
            });
        } catch (IOException ex) {
            appendLog("[Video] Cannot decode remote frame: " + ex.getMessage());
        }
    }

    private void updateLocalPreview(BufferedImage image) {
        SwingUtilities.invokeLater(() -> {
            lblLocalVideo.setText("Local Preview");
            lblLocalVideo.setIcon(new ImageIcon(scaleVideoPreview(image)));
        });
    }

    private Image scaleVideoPreview(BufferedImage image) {
        return image.getScaledInstance(220, 150, Image.SCALE_SMOOTH);
    }

    private void clearVideoPreviews() {
        SwingUtilities.invokeLater(() -> {
            lblLocalVideo.setIcon(null);
            lblRemoteVideo.setIcon(null);
            lblLocalVideo.setText("Local Preview");
            lblRemoteVideo.setText("Remote Preview");
        });
    }

    private AudioFormat createAudioFormat() {
        return new AudioFormat(
            RealtimeProtocol.AUDIO_SAMPLE_RATE,
            RealtimeProtocol.AUDIO_SAMPLE_SIZE_BITS,
            RealtimeProtocol.AUDIO_CHANNELS,
            true,
            false
        );
    }

    private void disconnectFromServer(String message) {
        boolean wasConnected = running || socket != null;
        running = false;
        stopAudioResources();
        stopVideoCaptureThread();
        callMode = RealtimeProtocol.CALL_MODE_NONE;
        currentRoomName = null;
        lastAudioLogAt = 0L;

        try {
            if (inputStream != null) {
                inputStream.close();
            }
        } catch (Exception ignored) {
        }
        try {
            if (outputStream != null) {
                outputStream.close();
            }
        } catch (Exception ignored) {
        }
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (Exception ignored) {
        }

        socket = null;
        inputStream = null;
        outputStream = null;
        currentUserName = null;
        lblUserValue.setText("-");
        lblRoomValue.setText("No room");
        lblCallValue.setText("No active call");
        onlineUsersModel.clear();
        roomListModel.clear();
        directTargetModel.removeAllElements();
        directInboxArea.setText("");
        roomInboxArea.setText("");
        clearVideoPreviews();
        updateControlState();

        if (wasConnected && message != null && !message.trim().isEmpty()) {
            appendLog("[System] " + message);
        }
    }

    private void refreshStatusLabels() {
        lblUserValue.setText(currentUserName == null ? "-" : currentUserName);
        lblRoomValue.setText(currentRoomName == null ? "No room" : currentRoomName);
        if (RealtimeProtocol.CALL_MODE_NONE.equals(callMode)) {
            lblCallValue.setText("No active call");
        }
    }

    private void updateControlState() {
        boolean connected = running;
        boolean hasDirectTarget = cboDirectTarget.getSelectedItem() != null;
        boolean inRoom = currentRoomName != null && !currentRoomName.trim().isEmpty();
        boolean inCall = !RealtimeProtocol.CALL_MODE_NONE.equals(callMode);
        btnConnect.setEnabled(!connected);
        btnDisconnect.setEnabled(connected);
        btnJoinRoom.setEnabled(connected);
        btnLeaveRoom.setEnabled(connected && inRoom);
        btnSendDirect.setEnabled(connected && hasDirectTarget);
        btnSendRoom.setEnabled(connected && inRoom);
        btnPrivateCall.setEnabled(connected && hasDirectTarget && !inCall);
        btnVideoCall.setEnabled(connected && hasDirectTarget && !inCall);
        btnGroupCall.setEnabled(connected && inRoom && !inCall);
        btnMute.setEnabled(connected && inCall && microphoneLine != null && microphoneLine.isOpen());
        btnEndCall.setEnabled(connected && inCall);
        refreshStatusLabels();
    }

    private void appendLog(String line) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(line + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }

    private void appendDirectInbox(String line) {
        SwingUtilities.invokeLater(() -> {
            directInboxArea.append(line + System.lineSeparator());
            directInboxArea.setCaretPosition(directInboxArea.getDocument().getLength());
        });
    }

    private void appendRoomInbox(String line) {
        SwingUtilities.invokeLater(() -> {
            roomInboxArea.append(line + System.lineSeparator());
            roomInboxArea.setCaretPosition(roomInboxArea.getDocument().getLength());
        });
    }

    private void sendPacket(PacketWriter writer) throws IOException {
        synchronized (sendLock) {
            if (!running || outputStream == null) {
                throw new IOException("Not connected.");
            }
            writer.write(outputStream);
            outputStream.flush();
        }
    }

    private interface PacketWriter {
        void write(DataOutputStream outputStream) throws IOException;
    }
}
