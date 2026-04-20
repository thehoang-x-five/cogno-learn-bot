package com.student52300082.networkproject.chat.udp;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

public class UdpChatServerFrame extends JFrame {
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_UDP_CHAT_PORT), 6);
    private final JTextField txtMessage = new JTextField(28);
    private final JTextArea logArea = new JTextArea();
    private final Map<String, ClientInfo> clients = new ConcurrentHashMap<String, ClientInfo>();

    private DatagramSocket socket;
    private volatile boolean running;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new UdpChatServerFrame().setVisible(true));
    }

    public UdpChatServerFrame() {
        UiTheme.prepareFrame(this);
        setTitle("UDP Chat Server");
        setSize(560, 380);
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        setLayout(new BorderLayout(8, 8));

        JPanel topPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton btnStart = new JButton("Start");
        JButton btnStop = new JButton("Stop");
        topPanel.add(new JLabel("Port:"));
        topPanel.add(txtPort);
        topPanel.add(btnStart);
        topPanel.add(btnStop);
        add(topPanel, BorderLayout.NORTH);

        logArea.setEditable(false);
        add(new JScrollPane(logArea), BorderLayout.CENTER);

        JPanel bottomPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton btnSend = new JButton("Send to all");
        bottomPanel.add(new JLabel("Server message:"));
        bottomPanel.add(txtMessage);
        bottomPanel.add(btnSend);
        add(bottomPanel, BorderLayout.SOUTH);

        btnStart.addActionListener(e -> startServer());
        btnStop.addActionListener(e -> stopServer());
        btnSend.addActionListener(e -> sendServerMessage());
        txtMessage.addActionListener(e -> sendServerMessage());

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                stopServer();
            }
        });

        UiTheme.styleTree(getContentPane());
    }

    private void startServer() {
        if (running) {
            appendLog("UDP server is already running.");
            return;
        }

        int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        try {
            socket = new DatagramSocket(port);
            running = true;
            appendLog("UDP chat server started on port " + port);
            new Thread(this::receiveLoop, "udp-chat-server").start();
        } catch (IOException ex) {
            JOptionPane.showMessageDialog(this, "Cannot start UDP server: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void receiveLoop() {
        byte[] buffer = new byte[8192];
        while (running) {
            try {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);
                String message = new String(packet.getData(), packet.getOffset(), packet.getLength(), StandardCharsets.UTF_8);
                InetSocketAddress endpoint = new InetSocketAddress(packet.getAddress(), packet.getPort());
                handleMessage(endpoint, message);
            } catch (IOException ex) {
                if (running) {
                    appendLog("Receive error: " + ex.getMessage());
                }
            }
        }
    }

    private void handleMessage(InetSocketAddress endpoint, String rawMessage) {
        String key = endpointKey(endpoint);
        if (rawMessage.startsWith("JOIN|")) {
            String name = rawMessage.substring("JOIN|".length()).trim();
            if (name.isEmpty()) {
                name = key;
            }
            clients.put(key, new ClientInfo(name, endpoint));
            appendLog(name + " joined from " + key);
            sendTo(endpoint, "[System] Connected to UDP chat server.");
            broadcast("[System] " + name + " joined.", key);
            return;
        }

        if (rawMessage.startsWith("EXIT|")) {
            ClientInfo removed = clients.remove(key);
            String name = removed == null ? key : removed.name;
            appendLog(name + " left.");
            broadcast("[System] " + name + " left.", key);
            return;
        }

        if (rawMessage.startsWith("MSG|")) {
            ClientInfo client = clients.get(key);
            String name = client == null ? key : client.name;
            String text = rawMessage.substring("MSG|".length());
            appendLog(name + ": " + text);
            broadcast("[" + name + "] " + text, key);
        }
    }

    private void sendServerMessage() {
        String message = txtMessage.getText().trim();
        if (message.isEmpty()) {
            return;
        }
        appendLog("Server: " + message);
        broadcast("[Server] " + message, null);
        txtMessage.setText("");
    }

    private void broadcast(String message, String excludeKey) {
        for (Map.Entry<String, ClientInfo> entry : clients.entrySet()) {
            if (entry.getKey().equals(excludeKey)) {
                continue;
            }
            sendTo(entry.getValue().endpoint, message);
        }
    }

    private void sendTo(InetSocketAddress endpoint, String message) {
        if (socket == null || socket.isClosed()) {
            return;
        }
        try {
            byte[] data = message.getBytes(StandardCharsets.UTF_8);
            DatagramPacket packet = new DatagramPacket(data, data.length, endpoint.getAddress(), endpoint.getPort());
            socket.send(packet);
        } catch (IOException ex) {
            appendLog("Send error to " + endpoint + ": " + ex.getMessage());
        }
    }

    private void stopServer() {
        running = false;
        clients.clear();
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
        appendLog("UDP server stopped.");
    }

    private String endpointKey(InetSocketAddress endpoint) {
        return endpoint.getAddress().getHostAddress() + ":" + endpoint.getPort();
    }

    private void appendLog(String line) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(line + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }

    private static class ClientInfo {
        private final String name;
        private final InetSocketAddress endpoint;

        private ClientInfo(String name, InetSocketAddress endpoint) {
            this.name = name;
            this.endpoint = endpoint;
        }
    }
}
