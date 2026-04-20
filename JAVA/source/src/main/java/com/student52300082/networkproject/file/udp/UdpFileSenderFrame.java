package com.student52300082.networkproject.file.udp;

import com.student52300082.networkproject.common.AppConfig;
import com.student52300082.networkproject.common.UiTheme;

import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
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

public class UdpFileSenderFrame extends JFrame {
    private final JTextField txtHost = new JTextField(AppConfig.DEFAULT_HOST, 12);
    private final JTextField txtPort = new JTextField(String.valueOf(AppConfig.DEFAULT_UDP_FILE_PORT), 6);
    private final JTextField txtFile = new JTextField(36);
    private final JTextArea logArea = new JTextArea();

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new UdpFileSenderFrame().setVisible(true));
    }

    public UdpFileSenderFrame() {
        UiTheme.prepareFrame(this);
        setTitle("UDP File Sender");
        setSize(800, 540);
        setMinimumSize(new Dimension(740, 480));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        JPanel page = UiTheme.page(16, 18, 18, 18);
        page.add(UiTheme.gradientHeader(
            "UDP File Sender",
            "Send file chunks with stop-and-wait ACK and retry over UDP."
        ), BorderLayout.NORTH);

        JPanel content = new JPanel(new BorderLayout(12, 12));
        content.setBackground(UiTheme.BACKGROUND);

        JPanel form = UiTheme.card();
        form.setLayout(new GridBagLayout());
        JButton btnBrowse = UiTheme.secondaryButton("Browse file");
        JButton btnSend = UiTheme.accentButton("Send File");

        addFormLabel(form, "Host", 0, 0);
        addFormField(form, txtHost, 1, 0, 1.0);
        addFormLabel(form, "Port", 2, 0);
        addFormField(form, txtPort, 3, 0, 0.0);
        addFormLabel(form, "Selected file", 0, 1);
        addFormField(form, txtFile, 1, 1, 1.0, 2);
        addFormButton(form, btnBrowse, 3, 1);
        addFormButton(form, btnSend, 1, 2);

        UiTheme.styleTree(form);
        content.add(form, BorderLayout.NORTH);

        JPanel logPanel = UiTheme.card();
        logPanel.add(UiTheme.title("UDP transfer log"), BorderLayout.NORTH);
        logArea.setEditable(false);
        UiTheme.styleTree(logArea);
        logPanel.add(UiTheme.scroll(logArea), BorderLayout.CENTER);
        content.add(logPanel, BorderLayout.CENTER);

        page.add(content, BorderLayout.CENTER);
        setContentPane(page);

        btnBrowse.addActionListener(e -> chooseFile());
        btnSend.addActionListener(e -> new Thread(this::sendFile, "udp-file-sender").start());
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

    private void chooseFile() {
        JFileChooser chooser = new JFileChooser();
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            txtFile.setText(chooser.getSelectedFile().getAbsolutePath());
        }
    }

    private void sendFile() {
        File file = new File(txtFile.getText().trim());
        if (!file.isFile()) {
            JOptionPane.showMessageDialog(this, "Please choose a valid file.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        int port;
        try {
            port = Integer.parseInt(txtPort.getText().trim());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Invalid port number.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        try (DatagramSocket socket = new DatagramSocket();
             BufferedInputStream input = new BufferedInputStream(new FileInputStream(file))) {
            socket.setSoTimeout(AppConfig.UDP_TIMEOUT_MILLIS);
            InetAddress address = InetAddress.getByName(txtHost.getText().trim());
            int totalPackets = (int) ((file.length() + AppConfig.UDP_FILE_CHUNK_SIZE - 1) / AppConfig.UDP_FILE_CHUNK_SIZE);

            appendLog("Starting UDP transfer: " + file.getName() + ", " + file.length() + " bytes, " + totalPackets + " packets");
            sendWithAck(socket, address, port, "START|" + file.getName() + "|" + file.length() + "|" + totalPackets, "ACK|START");

            byte[] buffer = new byte[AppConfig.UDP_FILE_CHUNK_SIZE];
            int read;
            int sequence = 0;
            long totalSent = 0;
            while ((read = input.read(buffer)) != -1) {
                byte[] packetData = buildDataPacket(sequence, buffer, read);
                sendWithAck(socket, address, port, packetData, "ACK|" + sequence);
                totalSent += read;
                if (sequence % 50 == 0 || sequence == totalPackets - 1) {
                    appendLog("Sent packet " + (sequence + 1) + "/" + totalPackets);
                }
                sequence++;
            }

            sendWithAck(socket, address, port, "END|" + file.getName(), "ACK|END");
            appendLog("UDP transfer completed. Bytes sent: " + totalSent);
        } catch (Exception ex) {
            appendLog("UDP transfer failed: " + ex.getMessage());
        }
    }

    private byte[] buildDataPacket(int sequence, byte[] data, int length) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        String header = "DATA|" + sequence + "|" + length + "\n";
        output.write(header.getBytes(StandardCharsets.UTF_8));
        output.write(data, 0, length);
        return output.toByteArray();
    }

    private void sendWithAck(DatagramSocket socket, InetAddress address, int port, String message, String expectedAck) throws IOException {
        sendWithAck(socket, address, port, message.getBytes(StandardCharsets.UTF_8), expectedAck);
    }

    private void sendWithAck(DatagramSocket socket, InetAddress address, int port, byte[] data, String expectedAck) throws IOException {
        DatagramPacket packet = new DatagramPacket(data, data.length, address, port);
        byte[] ackBuffer = new byte[256];
        for (int retry = 1; retry <= AppConfig.UDP_MAX_RETRY; retry++) {
            socket.send(packet);
            try {
                DatagramPacket ackPacket = new DatagramPacket(ackBuffer, ackBuffer.length);
                socket.receive(ackPacket);
                String ack = new String(ackPacket.getData(), ackPacket.getOffset(), ackPacket.getLength(), StandardCharsets.UTF_8);
                if (expectedAck.equals(ack)) {
                    return;
                }
            } catch (SocketTimeoutException ignored) {
                appendLog("Timeout waiting for " + expectedAck + ", retry " + retry + "/" + AppConfig.UDP_MAX_RETRY);
            }
        }
        throw new IOException("No acknowledgement received: " + expectedAck);
    }

    private void appendLog(String line) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(line + System.lineSeparator());
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }
}
