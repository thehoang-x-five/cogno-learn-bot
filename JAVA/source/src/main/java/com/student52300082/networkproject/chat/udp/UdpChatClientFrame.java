package com.student52300082.networkproject.chat.udp;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

public class UdpChatClientFrame extends JFrame {
    private final JTextField txtHost = new JTextField(AppConfig.DEFAULT_HOST, 12);
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_UDP_CHAT_PORT), 6);
    private final JTextField txtName = new JTextField("Client", 10);
    private final JTextField txtMessage = new JTextField(30);
    private final JTextArea chatArea = new JTextArea();

    private DatagramSocket socket;
    private InetAddress serverAddress;
    private int serverPort;
    private volatile boolean running;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new UdpChatClientFrame().setVisible(true));
    }

    public UdpChatClientFrame() {
        UiTheme.prepareFrame(this);
        setTitle("UDP Chat Client");
        setSize(600, 400);
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        setLayout(new BorderLayout(8, 8));

        JPanel topPanel = new JPanel(new GridLayout(2, 1));
        JPanel connectionPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton btnConnect = new JButton("Connect");
        JButton btnDisconnect = new JButton("Disconnect");
        connectionPanel.add(new JLabel("Host:"));
        connectionPanel.add(txtHost);
        connectionPanel.add(new JLabel("Port:"));
        connectionPanel.add(txtPort);
        connectionPanel.add(new JLabel("Name:"));
        connectionPanel.add(txtName);
        connectionPanel.add(btnConnect);
        connectionPanel.add(btnDisconnect);
        topPanel.add(connectionPanel);
        add(topPanel, BorderLayout.NORTH);

        chatArea.setEditable(false);
        add(new JScrollPane(chatArea), BorderLayout.CENTER);

        JPanel bottomPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton btnSend = new JButton("Send");
        bottomPanel.add(new JLabel("Message:"));
        bottomPanel.add(txtMessage);
        bottomPanel.add(btnSend);
        add(bottomPanel, BorderLayout.SOUTH);

        btnConnect.addActionListener(e -> connect());
        btnDisconnect.addActionListener(e -> disconnect());
        btnSend.addActionListener(e -> sendChatMessage());
        txtMessage.addActionListener(e -> sendChatMessage());

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                disconnect();
            }
        });

        UiTheme.styleTree(getContentPane());
    }

    private void connect() {
        if (running) {
            appendChat("Client is already connected.");
            return;
        }

        try {
            serverAddress = InetAddress.getByName(txtHost.getText().trim());
            serverPort = Integer.parseInt(txtPort.getText().trim());
            socket = new DatagramSocket();
            running = true;
            new Thread(this::receiveLoop, "udp-chat-client").start();
            sendRaw("JOIN|" + txtName.getText().trim());
            appendChat("Connected to UDP server " + serverAddress.getHostAddress() + ":" + serverPort);
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Cannot connect: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            disconnect();
        }
    }

    private void receiveLoop() {
        byte[] buffer = new byte[8192];
        while (running) {
            try {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);
                String message = new String(packet.getData(), packet.getOffset(), packet.getLength(), StandardCharsets.UTF_8);
                appendChat(message);
            } catch (IOException ex) {
                if (running) {
                    appendChat("Receive error: " + ex.getMessage());
                }
            }
        }
    }

    private void sendChatMessage() {
        if (!running) {
            appendChat("Not connected. Click Connect first.");
            return;
        }
        String message = txtMessage.getText().trim();
        if (message.isEmpty()) {
            return;
        }
        sendRaw("MSG|" + message);
        appendChat("Me: " + message);
        txtMessage.setText("");
    }

    private void sendRaw(String message) {
        if (socket == null || socket.isClosed()) {
            return;
        }
        try {
            byte[] data = message.getBytes(StandardCharsets.UTF_8);
            DatagramPacket packet = new DatagramPacket(data, data.length, serverAddress, serverPort);
            socket.send(packet);
        } catch (IOException ex) {
            appendChat("Send error: " + ex.getMessage());
        }
    }

    private void disconnect() {
        if (running) {
            sendRaw("EXIT|");
        }
        running = false;
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
    }

    private void appendChat(String line) {
        SwingUtilities.invokeLater(() -> {
            chatArea.append(line + System.lineSeparator());
            chatArea.setCaretPosition(chatArea.getDocument().getLength());
        });
    }
}
