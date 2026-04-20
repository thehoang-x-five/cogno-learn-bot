package com.student52300082.networkproject.chat.tcp;

import java.awt.EventQueue;
import java.awt.Font;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
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

public class TcpChatServerFrame extends JFrame {
    private JTextField txtPort;
    private JTextField txtInputMessage;
    private JTextArea chattingHistory;

    private volatile boolean serverRunning = false;
    private ServerSocket serverSocket;
    private final ConcurrentHashMap<Integer, ClientHandler> clients = new ConcurrentHashMap<Integer, ClientHandler>();
    private final AtomicInteger clientIdSeq = new AtomicInteger(0);

    public static void main(String[] args) {
        EventQueue.invokeLater(() -> new TcpChatServerFrame().setVisible(true));
    }

    public TcpChatServerFrame() {
        UiTheme.prepareFrame(this);
        setTitle("TCP Chat Server");
        setFont(new Font("Times New Roman", Font.BOLD, 18));
        setBounds(100, 100, 490, 320);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        getContentPane().setLayout(null);

        JPanel contentPane = new JPanel();
        contentPane.setBorder(new EmptyBorder(5, 5, 5, 5));
        setContentPane(contentPane);
        contentPane.setLayout(null);

        JLabel lblPort = new JLabel("Port Number:");
        lblPort.setFont(new Font("Times New Roman", Font.BOLD, 16));
        lblPort.setBounds(39, 10, 105, 22);
        contentPane.add(lblPort);

        txtPort = new JTextField();
        txtPort.setText(String.valueOf(AppConfig.DEFAULT_TCP_CHAT_PORT));
        txtPort.setFont(new Font("Times New Roman", Font.PLAIN, 16));
        txtPort.setBounds(145, 8, 186, 25);
        contentPane.add(txtPort);

        JButton btnStart = new JButton("Start");
        btnStart.setFont(new Font("Times New Roman", Font.BOLD, 12));
        btnStart.setBounds(341, 10, 85, 26);
        btnStart.addActionListener(e -> startServer());
        contentPane.add(btnStart);

        JLabel lblChattingHistory = new JLabel("Chatting History");
        lblChattingHistory.setHorizontalAlignment(SwingConstants.CENTER);
        lblChattingHistory.setFont(new Font("Times New Roman", Font.BOLD, 16));
        lblChattingHistory.setBounds(98, 35, 259, 25);
        contentPane.add(lblChattingHistory);

        chattingHistory = new JTextArea();
        chattingHistory.setEditable(false);
        JScrollPane scrollPane = new JScrollPane(chattingHistory);
        scrollPane.setBounds(39, 60, 387, 151);
        contentPane.add(scrollPane);

        txtInputMessage = new JTextField();
        txtInputMessage.setFont(new Font("Times New Roman", Font.PLAIN, 14));
        txtInputMessage.setBounds(39, 221, 292, 32);
        txtInputMessage.addActionListener(e -> sendServerMessage());
        contentPane.add(txtInputMessage);

        JButton btnSend = new JButton("Send");
        btnSend.setFont(new Font("Times New Roman", Font.BOLD, 12));
        btnSend.setBounds(341, 221, 85, 32);
        btnSend.addActionListener(e -> sendServerMessage());
        contentPane.add(btnSend);

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                stopServer();
            }
        });

        UiTheme.styleTree(getContentPane());
        setLocationRelativeTo(null);
    }

    private void startServer() {
        if (serverRunning) {
            appendChat("Server is already running.");
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
            serverSocket = new ServerSocket(port);
            serverRunning = true;
            appendChat("Server started on port " + port);
            new Thread(this::acceptLoop, "tcp-chat-accept-thread").start();
        } catch (IOException ex) {
            JOptionPane.showMessageDialog(this, "Cannot start server: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void acceptLoop() {
        while (serverRunning) {
            try {
                Socket clientSocket = serverSocket.accept();
                int clientId = clientIdSeq.incrementAndGet();
                ClientHandler handler = new ClientHandler(clientId, clientSocket);
                clients.put(clientId, handler);
                appendChat("Client#" + clientId + " connected: " + clientSocket.getRemoteSocketAddress());
                broadcast("[System] Client#" + clientId + " joined.", clientId);
                new Thread(handler, "tcp-chat-client-" + clientId).start();
            } catch (IOException ex) {
                if (serverRunning) {
                    appendChat("Accept error: " + ex.getMessage());
                }
                break;
            }
        }
    }

    private void sendServerMessage() {
        String message = txtInputMessage.getText().trim();
        if (message.isEmpty()) {
            return;
        }
        appendChat("Server: " + message);
        broadcast("[Server] " + message, -1);
        txtInputMessage.setText("");
    }

    private void broadcast(String message, int excludeClientId) {
        for (ClientHandler clientHandler : clients.values()) {
            if (clientHandler.clientId == excludeClientId) {
                continue;
            }
            clientHandler.send(message);
        }
    }

    private void removeClient(int clientId) {
        ClientHandler clientHandler = clients.remove(clientId);
        if (clientHandler != null) {
            try { clientHandler.close(); } catch (Exception ignored) { }
            appendChat("Client#" + clientId + " disconnected.");
            broadcast("[System] Client#" + clientId + " left.", clientId);
        }
    }

    private void stopServer() {
        serverRunning = false;
        for (Integer clientId : clients.keySet()) {
            removeClient(clientId);
        }
        try { if (serverSocket != null && !serverSocket.isClosed()) serverSocket.close(); } catch (Exception ignored) { }
    }

    private void appendChat(String line) {
        SwingUtilities.invokeLater(() -> {
            chattingHistory.append(line + System.lineSeparator());
            chattingHistory.setCaretPosition(chattingHistory.getDocument().getLength());
        });
    }

    private class ClientHandler implements Runnable {
        private final int clientId;
        private final Socket socket;
        private DataInputStream dis;
        private DataOutputStream dos;
        private volatile boolean running = true;

        ClientHandler(int clientId, Socket socket) throws IOException {
            this.clientId = clientId;
            this.socket = socket;
            this.dis = new DataInputStream(socket.getInputStream());
            this.dos = new DataOutputStream(socket.getOutputStream());
        }

        @Override
        public void run() {
            try {
                while (running) {
                    String message = dis.readUTF();
                    if (message == null) {
                        break;
                    }
                    message = message.trim();
                    if ("exit".equalsIgnoreCase(message)) {
                        break;
                    }
                    appendChat("Client#" + clientId + ": " + message);
                    broadcast("[Client#" + clientId + "] " + message, clientId);
                }
            } catch (IOException ex) {
                appendChat("Client#" + clientId + " connection lost.");
            } finally {
                running = false;
                removeClient(clientId);
            }
        }

        void send(String message) {
            try {
                dos.writeUTF(message);
                dos.flush();
            } catch (IOException ex) {
                running = false;
                removeClient(clientId);
            }
        }

        void close() {
            running = false;
            try { if (dis != null) dis.close(); } catch (Exception ignored) { }
            try { if (dos != null) dos.close(); } catch (Exception ignored) { }
            try { if (socket != null && !socket.isClosed()) socket.close(); } catch (Exception ignored) { }
        }
    }
}
