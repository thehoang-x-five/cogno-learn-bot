package com.student52300082.networkproject.file.udp;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

public class UdpFileReceiverFrame extends JFrame {
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_UDP_FILE_PORT), 6);
    private final JTextField txtSaveDir = new JTextField(defaultSaveDir().getAbsolutePath(), 32);
    private final JTextArea logArea = new JTextArea();
    private final Map<String, TransferState> transfers = new ConcurrentHashMap<String, TransferState>();

    private DatagramSocket socket;
    private volatile boolean running;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new UdpFileReceiverFrame().setVisible(true));
    }

    public UdpFileReceiverFrame() {
        UiTheme.prepareFrame(this);
        setTitle("UDP File Receiver");
        setSize(800, 560);
        setMinimumSize(new Dimension(740, 500));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        JPanel page = UiTheme.page(16, 18, 18, 18);
        page.add(UiTheme.gradientHeader(
            "UDP File Receiver",
            "Receive UDP chunks, acknowledge each packet, and rebuild the file."
        ), BorderLayout.NORTH);

        JPanel content = new JPanel(new BorderLayout(12, 12));
        content.setBackground(UiTheme.BACKGROUND);

        JPanel form = UiTheme.card();
        form.setLayout(new GridBagLayout());
        JButton btnBrowse = UiTheme.secondaryButton("Choose folder");
        JButton btnStart = UiTheme.primaryButton("Start Receiver");
        JButton btnStop = UiTheme.secondaryButton("Stop");

        addFormLabel(form, "Port", 0, 0);
        addFormField(form, txtPort, 1, 0, 0.0);
        addFormLabel(form, "Save folder", 0, 1);
        addFormField(form, txtSaveDir, 1, 1, 1.0, 2);
        addFormButton(form, btnBrowse, 3, 1);
        addFormButton(form, btnStart, 1, 2);
        addFormButton(form, btnStop, 2, 2);

        UiTheme.styleTree(form);
        content.add(form, BorderLayout.NORTH);

        JPanel logPanel = UiTheme.card();
        logPanel.add(UiTheme.title("Receiver log"), BorderLayout.NORTH);
        logArea.setEditable(false);
        UiTheme.styleTree(logArea);
        logPanel.add(UiTheme.scroll(logArea), BorderLayout.CENTER);
        content.add(logPanel, BorderLayout.CENTER);

        page.add(content, BorderLayout.CENTER);
        setContentPane(page);

        btnBrowse.addActionListener(e -> chooseSaveFolder());
        btnStart.addActionListener(e -> startReceiver());
        btnStop.addActionListener(e -> stopReceiver());

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                stopReceiver();
            }
        });
    }

    private void addFormLabel(JPanel panel, String text, int x, int y) {
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = x;
        constraints.gridy = y;
        constraints.anchor = GridBagConstraints.WEST;
        constraints.insets = new Insets(6, 6, 6, 6);
        panel.add(new JLabel(text + ":"), constraints);
    }

    private void addFormField(JPanel panel, JTextField field, int x, int y, double weightX) {
        addFormField(panel, field, x, y, weightX, 1);
    }

    private void addFormField(JPanel panel, JTextField field, int x, int y, double weightX, int width) {
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = x;
        constraints.gridy = y;
        constraints.gridwidth = width;
        constraints.weightx = weightX;
        constraints.fill = GridBagConstraints.HORIZONTAL;
        constraints.insets = new Insets(6, 6, 6, 6);
        panel.add(field, constraints);
    }

    private void addFormButton(JPanel panel, JButton button, int x, int y) {
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = x;
        constraints.gridy = y;
        constraints.anchor = GridBagConstraints.WEST;
        constraints.insets = new Insets(6, 6, 6, 6);
        panel.add(button, constraints);
    }

    private void chooseSaveFolder() {
        JFileChooser chooser = new JFileChooser(txtSaveDir.getText().trim());
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            txtSaveDir.setText(chooser.getSelectedFile().getAbsolutePath());
        }
    }

    private void startReceiver() {
        if (running) {
            appendLog("UDP receiver is already running.");
            return;
        }

        int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        File folder = new File(txtSaveDir.getText().trim());
        if (!folder.exists() && !folder.mkdirs()) {
            JOptionPane.showMessageDialog(this, "Cannot create save folder.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        try {
            socket = new DatagramSocket(port);
            running = true;
            appendLog("UDP file receiver started on port " + port);
            new Thread(this::receiveLoop, "udp-file-receiver").start();
        } catch (IOException ex) {
            JOptionPane.showMessageDialog(this, "Cannot start UDP receiver: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void receiveLoop() {
        byte[] buffer = new byte[AppConfig.UDP_FILE_CHUNK_SIZE + 128];
        while (running) {
            try {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);
                handlePacket(packet);
            } catch (IOException ex) {
                if (running) {
                    appendLog("Receive error: " + ex.getMessage());
                }
            }
        }
    }

    private void handlePacket(DatagramPacket packet) throws IOException {
        int newlineIndex = findNewline(packet.getData(), packet.getOffset(), packet.getLength());
        String payload;
        if (newlineIndex >= 0) {
            payload = new String(packet.getData(), packet.getOffset(), newlineIndex - packet.getOffset(), StandardCharsets.UTF_8);
        } else {
            payload = new String(packet.getData(), packet.getOffset(), packet.getLength(), StandardCharsets.UTF_8);
        }

        InetSocketAddress endpoint = new InetSocketAddress(packet.getAddress(), packet.getPort());
        String key = endpoint.getAddress().getHostAddress() + ":" + endpoint.getPort();

        if (payload.startsWith("START|")) {
            String[] parts = payload.split("\\|", 4);
            if (parts.length < 4) {
                sendAck(endpoint, "ERROR|Invalid START");
                return;
            }
            startTransfer(key, endpoint, parts[1], Long.parseLong(parts[2]), Integer.parseInt(parts[3]));
            return;
        }

        if (payload.startsWith("DATA|")) {
            String[] parts = payload.split("\\|", 3);
            if (parts.length < 3 || newlineIndex < 0) {
                sendAck(endpoint, "ERROR|Invalid DATA");
                return;
            }
            int sequence = Integer.parseInt(parts[1]);
            int dataLength = Integer.parseInt(parts[2]);
            int dataOffset = newlineIndex + 1;
            int available = packet.getOffset() + packet.getLength() - dataOffset;
            writeChunk(key, endpoint, packet.getData(), dataOffset, Math.min(dataLength, available), sequence);
            return;
        }

        if (payload.startsWith("END|")) {
            finishTransfer(key, endpoint);
        }
    }

    private void startTransfer(String key, InetSocketAddress endpoint, String rawFileName, long fileSize, int totalPackets) throws IOException {
        closeExistingTransfer(key);
        File outputFile = uniqueFile(new File(txtSaveDir.getText().trim()), new File(rawFileName).getName());
        TransferState state = new TransferState(outputFile, fileSize, totalPackets);
        transfers.put(key, state);
        appendLog("Receiving UDP file " + outputFile.getName() + " (" + fileSize + " bytes, " + totalPackets + " packets) from " + key);
        sendAck(endpoint, "ACK|START");
    }

    private void writeChunk(String key, InetSocketAddress endpoint, byte[] data, int offset, int length, int sequence) throws IOException {
        TransferState state = transfers.get(key);
        if (state == null) {
            sendAck(endpoint, "ERROR|No transfer");
            return;
        }

        if (sequence == state.expectedSequence) {
            state.output.write(data, offset, length);
            state.receivedBytes += length;
            state.expectedSequence++;
            sendAck(endpoint, "ACK|" + sequence);
            if (sequence % 50 == 0 || sequence == state.totalPackets - 1) {
                appendLog("Received packet " + (sequence + 1) + "/" + state.totalPackets);
            }
        } else if (sequence < state.expectedSequence) {
            sendAck(endpoint, "ACK|" + sequence);
        } else {
            sendAck(endpoint, "NACK|" + state.expectedSequence);
        }
    }

    private void finishTransfer(String key, InetSocketAddress endpoint) throws IOException {
        TransferState state = transfers.remove(key);
        if (state == null) {
            sendAck(endpoint, "ERROR|No transfer");
            return;
        }
        state.close();
        appendLog("UDP file saved: " + state.file.getAbsolutePath() + " (" + state.receivedBytes + " bytes)");
        sendAck(endpoint, "ACK|END");
    }

    private void closeExistingTransfer(String key) {
        TransferState old = transfers.remove(key);
        if (old != null) {
            old.closeQuietly();
        }
    }

    private void sendAck(InetSocketAddress endpoint, String message) throws IOException {
        byte[] data = message.getBytes(StandardCharsets.UTF_8);
        DatagramPacket ack = new DatagramPacket(data, data.length, endpoint.getAddress(), endpoint.getPort());
        socket.send(ack);
    }

    private int findNewline(byte[] data, int offset, int length) {
        int end = offset + length;
        for (int i = offset; i < end; i++) {
            if (data[i] == '\n') {
                return i;
            }
        }
        return -1;
    }

    private File uniqueFile(File folder, String fileName) {
        File file = new File(folder, fileName);
        if (!file.exists()) {
            return file;
        }
        String baseName = fileName;
        String extension = "";
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex > 0) {
            baseName = fileName.substring(0, dotIndex);
            extension = fileName.substring(dotIndex);
        }
        int index = 1;
        while (true) {
            File candidate = new File(folder, baseName + "_" + index + extension);
            if (!candidate.exists()) {
                return candidate;
            }
            index++;
        }
    }

    private void stopReceiver() {
        running = false;
        for (TransferState state : transfers.values()) {
            state.closeQuietly();
        }
        transfers.clear();
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
        appendLog("UDP file receiver stopped.");
    }

    private static File defaultSaveDir() {
        File folder = new File(System.getProperty("user.home"), "Downloads/udp_received");
        if (!folder.exists()) {
            folder.mkdirs();
        }
        return folder;
    }

    private void appendLog(String line) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(line + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }

    private static class TransferState {
        private final File file;
        private final FileOutputStream output;
        private final long fileSize;
        private final int totalPackets;
        private int expectedSequence = 0;
        private long receivedBytes = 0;

        private TransferState(File file, long fileSize, int totalPackets) throws IOException {
            this.file = file;
            this.output = new FileOutputStream(file);
            this.fileSize = fileSize;
            this.totalPackets = totalPackets;
        }

        private void close() throws IOException {
            output.close();
            if (receivedBytes != fileSize) {
                throw new IOException("Received size mismatch. Expected " + fileSize + ", got " + receivedBytes);
            }
        }

        private void closeQuietly() {
            try {
                output.close();
            } catch (IOException ignored) {
            }
        }
    }
}
