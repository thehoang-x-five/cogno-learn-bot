package com.student52300082.networkproject.chat.tcp;

import java.awt.EventQueue;
import java.awt.Font;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Socket;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.border.EmptyBorder;
import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

public class TcpChatClientFrame extends JFrame implements Runnable {
    private JTextField txtPort;
    private JTextField txtMessage;
    private JTextArea chattingHistory;
    private JTextField txtServerName;

    private Socket socket;
    private DataOutputStream dataOutputStream;
    private DataInputStream dataInputStream;
    private volatile boolean running = false;

    public static void main(String[] args) {
        EventQueue.invokeLater(() -> new TcpChatClientFrame().setVisible(true));
    }

    public TcpChatClientFrame() {
        UiTheme.prepareFrame(this);
        setTitle("TCP Chat Client");
        setFont(new Font("Times New Roman", Font.BOLD, 18));
        setBounds(100, 100, 490, 320);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        getContentPane().setLayout(null);

        JPanel contentPane = new JPanel();
        contentPane.setBorder(new EmptyBorder(5, 5, 5, 5));
        setContentPane(contentPane);
        contentPane.setLayout(null);

        JLabel lblServerName = new JLabel("Server Name:");
        lblServerName.setFont(new Font("Times New Roman", Font.BOLD, 16));
        lblServerName.setBounds(20, 12, 100, 25);
        contentPane.add(lblServerName);

        txtServerName = new JTextField();
        txtServerName.setText("localhost");
        txtServerName.setFont(new Font("Times New Roman", Font.PLAIN, 16));
        txtServerName.setBounds(118, 9, 100, 28);
        contentPane.add(txtServerName);

        JLabel lblPort = new JLabel("Port No:");
        lblPort.setFont(new Font("Times New Roman", Font.BOLD, 16));
        lblPort.setBounds(240, 11, 66, 25);
        contentPane.add(lblPort);

        txtPort = new JTextField();
        txtPort.setText(String.valueOf(AppConfig.DEFAULT_TCP_CHAT_PORT));
        txtPort.setFont(new Font("Times New Roman", Font.PLAIN, 16));
        txtPort.setBounds(308, 9, 70, 28);
        contentPane.add(txtPort);

        JButton btnStart = new JButton("Start");
        btnStart.setFont(new Font("Times New Roman", Font.BOLD, 12));
        btnStart.setBounds(387, 10, 75, 28);
        btnStart.addActionListener(e -> startClient());
        contentPane.add(btnStart);

        JLabel lblChattingHistory = new JLabel("Chatting History");
        lblChattingHistory.setHorizontalAlignment(SwingConstants.CENTER);
        lblChattingHistory.setFont(new Font("Times New Roman", Font.BOLD, 16));
        lblChattingHistory.setBounds(110, 45, 240, 25);
        contentPane.add(lblChattingHistory);

        chattingHistory = new JTextArea();
        chattingHistory.setEditable(false);
        JScrollPane scrollPane = new JScrollPane(chattingHistory);
        scrollPane.setBounds(39, 71, 387, 150);
        contentPane.add(scrollPane);

        txtMessage = new JTextField();
        txtMessage.setFont(new Font("Times New Roman", Font.PLAIN, 14));
        txtMessage.setBounds(39, 231, 311, 32);
        txtMessage.addActionListener(e -> sendMessage());
        contentPane.add(txtMessage);

        JButton btnSend = new JButton("Send");
        btnSend.setFont(new Font("Times New Roman", Font.BOLD, 12));
        btnSend.setBounds(360, 231, 66, 32);
        btnSend.addActionListener(e -> sendMessage());
        contentPane.add(btnSend);

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                closeClient();
            }
        });

        UiTheme.styleTree(getContentPane());
        setLocationRelativeTo(null);
    }

    private void startClient() {
        if (running) {
            appendChat("Client is already connected.");
            return;
        }

        int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        String host = txtServerName.getText().trim();
        if (host.isEmpty()) {
            host = "localhost";
        }

        try {
            socket = new Socket(host, port);
            dataOutputStream = new DataOutputStream(socket.getOutputStream());
            dataInputStream = new DataInputStream(socket.getInputStream());
            running = true;
            appendChat("Connected to server " + host + ":" + port);
            new Thread(this, "tcp-chat-client-receiver").start();
        } catch (IOException ex) {
            JOptionPane.showMessageDialog(this, "Cannot connect to server: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void sendMessage() {
        if (!running || socket == null || socket.isClosed()) {
            appendChat("Not connected. Click Start first.");
            return;
        }

        String message = txtMessage.getText().trim();
        if (message.isEmpty()) {
            return;
        }

        try {
            dataOutputStream.writeUTF(message);
            dataOutputStream.flush();
            appendChat("Me: " + message);
            txtMessage.setText("");
            if ("exit".equalsIgnoreCase(message)) {
                closeClient();
            }
        } catch (IOException ex) {
            appendChat("Send failed: " + ex.getMessage());
            closeClient();
        }
    }

    @Override
    public void run() {
        try {
            while (running && socket != null && !socket.isClosed()) {
                String message = dataInputStream.readUTF();
                appendChat(message);
            }
        } catch (IOException ex) {
            if (running) {
                appendChat("Disconnected from server.");
            }
        } finally {
            closeClient();
        }
    }

    private void appendChat(String line) {
        SwingUtilities.invokeLater(() -> {
            chattingHistory.append(line + System.lineSeparator());
            chattingHistory.setCaretPosition(chattingHistory.getDocument().getLength());
        });
    }

    private void closeClient() {
        running = false;
        try { if (dataInputStream != null) dataInputStream.close(); } catch (Exception ignored) { }
        try { if (dataOutputStream != null) dataOutputStream.close(); } catch (Exception ignored) { }
        try { if (socket != null && !socket.isClosed()) socket.close(); } catch (Exception ignored) { }
    }
}
